/**
 * Football argument question service.
 *
 * Turns a fixture (plus optional free-text user intent) into a machine-readable,
 * auto-verifiable YES/NO argument. The deterministic verification grammar is the
 * source of truth: AI is only used to *draft* a question, and every draft is
 * validated against `classifyContract` before money can be accepted.
 *
 * Supported conditions (evaluated against the final score):
 *   home_win | away_win | draw
 *   home_gte_N | home_gt_N | home_lt_N | home_lte_N
 *   away_gte_N | away_gt_N | away_lt_N | away_lte_N
 *   total_over_N | total_under_N
 */

import * as verificationEngine from '../verification';
import type { NormalizedFixture } from '../football/footballService';
import { groqChat, isGroqConfigured, parseJsonObject } from './groqClient';

export interface QuestionSuggestion {
  question: string;
  condition: string;
  yesMeaning: string;
  noMeaning: string;
  confidence: number;
  source: 'ai' | 'template';
}

export interface QuestionDraft {
  question: string;
  condition: string;
  confidence: number;
  reasoning: string;
  source: 'ai' | 'template' | 'provided';
  verifiable: boolean;
  reason?: string;
}

export interface FootballContract {
  method: 'sport_event';
  mode: '1v1' | 'group';
  source: null;
  params: Record<string, unknown>;
  described: { yes: string; no: string };
}

const CONDITION_GRAMMAR =
  'home_win, away_win, draw, home_gte_N, home_gt_N, home_lt_N, home_lte_N, away_gte_N, away_gt_N, away_lt_N, away_lte_N, total_over_N, total_under_N';

function teamLabel(fixture: NormalizedFixture, side: 'home' | 'away'): string {
  return side === 'home' ? fixture.home.name : fixture.away.name;
}

function conditionToText(fixture: NormalizedFixture, condition: string): { yes: string; no: string } {
  const home = teamLabel(fixture, 'home');
  const away = teamLabel(fixture, 'away');
  const winMatch = /^(home|away)_win$/.exec(condition);
  if (winMatch && winMatch[1]) {
    const name = winMatch[1] === 'home' ? home : away;
    return { yes: `${name} wins`, no: `${name} does not win` };
  }
  if (condition === 'draw') return { yes: 'The match ends in a draw', no: 'The match does not end in a draw' };

  const sideMatch = /^(home|away|total)_(gt|gte|lt|lte)_(\d+(?:\.\d+)?)$/.exec(condition);
  if (sideMatch && sideMatch[1] && sideMatch[2] && sideMatch[3]) {
    const side = sideMatch[1];
    const op = sideMatch[2];
    const threshold = sideMatch[3];
    const subject = side === 'home' ? `${home} score` : side === 'away' ? `${away} score` : 'Total goals';
    const wording = op === 'gt' ? `more than ${threshold}` : op === 'gte' ? `at least ${threshold}` : op === 'lt' ? `fewer than ${threshold}` : `at most ${threshold}`;
    return { yes: `${subject} is ${wording}`, no: `${subject} is not ${wording}` };
  }
  return { yes: 'The condition is met', no: 'The condition is not met' };
}

function templateSuggestions(fixture: NormalizedFixture): QuestionSuggestion[] {
  const home = fixture.home.name;
  const away = fixture.away.name;
  const candidates: Array<{ question: string; condition: string; confidence: number }> = [
    { question: `Will ${home} beat ${away}?`, condition: 'home_win', confidence: 0.7 },
    { question: `Will ${away} beat ${home}?`, condition: 'away_win', confidence: 0.7 },
    { question: `Will ${home} and ${away} draw?`, condition: 'draw', confidence: 0.6 },
    { question: 'Will there be more than 2.5 goals in the match?', condition: 'total_over_2.5', confidence: 0.65 },
    { question: 'Will there be more than 1.5 goals in the match?', condition: 'total_over_1.5', confidence: 0.6 },
    { question: `Will ${home} score at least one goal?`, condition: 'home_gte_1', confidence: 0.6 },
    { question: `Will ${away} score at least one goal?`, condition: 'away_gte_1', confidence: 0.6 },
  ];
  return candidates.slice(0, 6).map((c) => {
    const described = conditionToText(fixture, c.condition);
    return {
      question: c.question,
      condition: c.condition,
      yesMeaning: described.yes,
      noMeaning: described.no,
      confidence: c.confidence,
      source: 'template' as const,
    };
  });
}

/**
 * Deterministic validation of a football argument contract. Returns the
 * normalized contract or a human-readable rejection reason.
 */
export function buildFootballContract(
  fixture: NormalizedFixture,
  condition: string,
  mode: '1v1' | 'group' = 'group'
): { ok: true; contract: FootballContract } | { ok: false; reason: string } {
  const params: Record<string, unknown> = {
    sport: 'football',
    eventId: String(fixture.id),
    fixtureId: fixture.id,
    condition,
    mode,
    competition: fixture.league.name,
    home: fixture.home.name,
    away: fixture.away.name,
    kickoff: fixture.kickoff,
  };
  const classification = verificationEngine.classifyContract({
    category: 'sports',
    method: 'sport_event',
    mode,
    source: null,
    params,
  });
  if (!classification.ok || !classification.contract) {
    return { ok: false, reason: classification.reason || `Condition must match the supported grammar: ${CONDITION_GRAMMAR}.` };
  }
  const described = verificationEngine.describeContract(classification.contract);
  return {
    ok: true,
    contract: {
      method: 'sport_event',
      mode,
      source: null,
      params,
      described,
    },
  };
}

function aiMessagesForSuggest(fixture: NormalizedFixture) {
  const kickoff = fixture.kickoff ? new Date(fixture.kickoff).toUTCString() : 'unknown';
  return [
    {
      role: 'system' as const,
      content:
        'You create auto-verifiable YES/NO football arguments. ' +
        'Return strict JSON: {"questions":[{"question":string,"condition":string,"confidence":number}]} ' +
        `Each condition MUST be one of: ${CONDITION_GRAMMAR}. ` +
        'Questions must be objective, unambiguous and resolvable from the final score alone. ' +
        'Never invent events that the final score cannot prove (cards, injuries, possession, scorers).',
    },
    {
      role: 'user' as const,
      content:
        `Create 5 argument questions for this match.\n` +
        `Competition: ${fixture.league.name} (${fixture.league.round || 'round unknown'})\n` +
        `${fixture.home.name} (home) vs ${fixture.away.name} (away)\n` +
        `Kickoff: ${kickoff}`,
    },
  ];
}

function normalizeSuggested(raw: unknown, fixture: NormalizedFixture): QuestionSuggestion[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: QuestionSuggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const question = String(rec.question || '').trim();
    const condition = String(rec.condition || '').trim();
    if (!question || !condition) continue;
    const built = buildFootballContract(fixture, condition);
    if (!built.ok) continue;
    const confidence = Number.isFinite(Number(rec.confidence)) ? Math.max(0, Math.min(1, Number(rec.confidence))) : 0.6;
    out.push({
      question: verificationEngine.questionFromStatement(question),
      condition,
      yesMeaning: built.contract.described.yes,
      noMeaning: built.contract.described.no,
      confidence,
      source: 'ai',
    });
  }
  return out;
}

/** Suggest verifiable argument questions for a fixture (AI, else templates). */
export async function suggestQuestions(fixture: NormalizedFixture): Promise<QuestionSuggestion[]> {
  const templates = templateSuggestions(fixture);
  if (!isGroqConfigured()) return templates;
  const text = await groqChat(aiMessagesForSuggest(fixture), { json: true, temperature: 0.4 });
  const parsed = parseJsonObject<{ questions?: unknown[] }>(text);
  const suggested = parsed ? normalizeSuggested(parsed.questions, fixture) : [];
  return suggested.length >= 3 ? suggested : templates;
}

/**
 * Restructure a free-text user argument into a verifiable question. Validates
 * against the deterministic grammar; AI can never make an unverifiable claim
 * payable.
 */
export async function restructureQuestion(
  fixture: NormalizedFixture,
  rawText: string
): Promise<QuestionDraft> {
  const text = String(rawText || '').trim();
  if (!text) {
    return { question: '', condition: '', confidence: 0, reasoning: '', source: 'provided', verifiable: false, reason: 'Describe your argument in a sentence first.' };
  }

  if (isGroqConfigured()) {
    const messages = [
      {
        role: 'system' as const,
        content:
          'You convert a football opinion into an auto-verifiable YES/NO argument. ' +
          'Return strict JSON: {"question":string,"condition":string,"confidence":number,"reasoning":string}. ' +
          `condition MUST be one of: ${CONDITION_GRAMMAR}. ` +
          'Only use final-score facts. If the opinion cannot be reduced to one of those conditions, set condition to "" and explain why in reasoning.',
      },
      {
        role: 'user' as const,
        content:
          `Match: ${fixture.home.name} (home) vs ${fixture.away.name} (away)\n` +
          `Competition: ${fixture.league.name}\n` +
          `User's argument: "${text}"`,
      },
    ];
    const response = await groqChat(messages, { json: true, temperature: 0.2 });
    const parsed = parseJsonObject<Record<string, unknown>>(response);
    if (parsed) {
      const condition = String(parsed.condition || '').trim();
      const question = verificationEngine.questionFromStatement(String(parsed.question || text));
      const reasoning = String(parsed.reasoning || '').trim();
      const confidence = Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : 0.5;
      if (!condition) {
        return { question, condition: '', confidence, reasoning, source: 'ai', verifiable: false, reason: reasoning || 'This argument cannot be settled from the final score.' };
      }
      const built = buildFootballContract(fixture, condition);
      if (!built.ok) {
        return { question, condition, confidence, reasoning, source: 'ai', verifiable: false, reason: built.reason };
      }
      return { question, condition, confidence, reasoning, source: 'ai', verifiable: true };
    }
  }

  return heuristicRestructure(fixture, text);
}

function heuristicRestructure(fixture: NormalizedFixture, text: string): QuestionDraft {
  const lower = text.toLowerCase();
  const home = fixture.home.name.toLowerCase();
  const away = fixture.away.name.toLowerCase();
  const mentionsHome = lower.includes(home) || lower.includes('home');
  const mentionsAway = lower.includes(away) || lower.includes('away');

  let condition = '';
  if (/\bdraw\b/.test(lower)) condition = 'draw';
  else if (/\bover\s*2\.5\b|\bmore than 2\.5\b/.test(lower)) condition = 'total_over_2.5';
  else if (/\bover\s*1\.5\b|\bmore than 1\.5\b/.test(lower)) condition = 'total_over_1.5';
  else if (/\bwin\b|\bbeat\b|\bwins\b/.test(lower)) {
    if (mentionsAway && !mentionsHome) condition = 'away_win';
    else condition = 'home_win';
  } else if (/\bscore\b|\bgoal\b/.test(lower)) {
    condition = mentionsAway && !mentionsHome ? 'away_gte_1' : 'home_gte_1';
  }

  if (!condition) {
    return { question: verificationEngine.questionFromStatement(text), condition: '', confidence: 0, reasoning: '', source: 'template', verifiable: false, reason: `We could not map that to a final-score condition. Allowed: ${CONDITION_GRAMMAR}.` };
  }
  const built = buildFootballContract(fixture, condition);
  if (!built.ok) {
    return { question: verificationEngine.questionFromStatement(text), condition, confidence: 0, reasoning: '', source: 'template', verifiable: false, reason: built.reason };
  }
  return { question: verificationEngine.questionFromStatement(text), condition, confidence: 0.5, reasoning: 'Mapped from keywords to a final-score condition.', source: 'template', verifiable: true };
}
