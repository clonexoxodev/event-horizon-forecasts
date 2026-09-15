export type VerificationMethod = 'sport_event' | 'crypto_price' | 'crypto_event' | 'factual';
export type ArgumentMode = '1v1' | 'group';
export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
export type YesNo = 'YES' | 'NO';

export const MAX_VERIFICATION_ATTEMPTS = 3;
export const DEFAULT_RESOLUTION_MARGIN_MS = 120000;
export const VERIFIABLE_METHODS: VerificationMethod[] = ['sport_event', 'crypto_price', 'crypto_event', 'factual'];

// DB / public API vocabulary — markets.verification_method CHECK constraint
// allows only ('sport_event','crypto_market','factual','manual').
export const DB_METHODS: string[] = ['sport_event', 'crypto_market', 'factual'];

export function toDbMethod(method: VerificationMethod): string {
  return method === 'crypto_price' || method === 'crypto_event' ? 'crypto_market' : method;
}

export interface VerificationParams {
  [key: string]: unknown;
}

export interface VerificationContract {
  method: VerificationMethod;
  mode: ArgumentMode;
  source: string | null;
  params: VerificationParams;
}

export interface ClassificationResult {
  ok: boolean;
  reason?: string;
  contract?: VerificationContract;
}

export interface VerificationEvaluation {
  outcome: YesNo | null;
  evidence: unknown;
  failureReason?: string;
}

type Token = { type: 'num' | 'ident' | 'op' | 'lp' | 'rp'; value: string };
type Parser = { tokens: Token[]; pos: number };

const OPS: Record<ComparisonOperator, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
};

const METHOD_REGEX = /^(home|away|total)_(gt|gte|lt|lte|over|under)_(\d+(?:\.\d+)?)$|^(home|away|draw)_win$/;
const TOKEN_NUMBER = /^\d+(?:\.\d+)?/;
const TOKEN_IDENT = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/;
const BOOL_TRUE = ['true', 'yes', '1', 'occurred', 'verified', 'passed', 'hit', 'success', 'done', 'completed', 'confirmed'];
const BOOL_FALSE = ['false', 'no', '0', 'pending', 'unverified', 'missed', 'failed', 'upcoming', 'scheduled'];

function str(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function cleanSource(value: unknown): string | null {
  const s = str(value);
  return s ? s : null;
}

function categoryToMethod(category: string): VerificationMethod | null {
  const c = String(category || '').toLowerCase();
  if (c.includes('sport')) return 'sport_event';
  if (c.includes('crypto')) return 'crypto_price';
  if (c.includes('facts') || c.includes('knowledge')) return 'factual';
  return null;
}

function methodToCategory(method: VerificationMethod): string {
  if (method === 'sport_event') return 'sports';
  if (method === 'factual') return 'facts';
  return 'crypto';
}

function looksLikeCryptoEvent(params?: VerificationParams): boolean {
  return Boolean(params && (str(params.event) !== '' || str(params.blockHeight) !== '' || str(params.occursOnOrBefore) !== ''));
}

function normalizeMode(value: unknown): ArgumentMode | null {
  const m = str(value).toLowerCase();
  if (m === '1v1' || m === 'one_v_one' || m === 'one-v-one') return '1v1';
  if (m === 'group' || m === 'unlimited' || m === '') return 'group';
  return null;
}

function missing(method: VerificationMethod, field: string): ClassificationResult {
  return { ok: false, reason: `${method} requires contract field: ${field}.` };
}

function isValidCondition(condition: string): boolean {
  return METHOD_REGEX.test(condition);
}

function validateContractFields(contract: VerificationContract): ClassificationResult {
  const p = contract.params;
  if (contract.method === 'sport_event') {
    const sport = str(p.sport);
    const eventId = str(p.eventId) || str(p.matchId) || str(p.event_id);
    const condition = str(p.condition) || str(p.predicate);
    if (!sport) return missing('sport_event', 'sport');
    if (!eventId) return missing('sport_event', 'eventId');
    if (!condition || !isValidCondition(condition)) {
      return { ok: false, reason: 'sport_event requires a machine-readable condition such as "home_gte_2", "away_lt_1", "total_over_2.5", "home_win", "away_win" or "draw".' };
    }
    return { ok: true, contract };
  }
  if (contract.method === 'crypto_price') {
    const asset = str(p.asset) || str(p.coinId) || str(p.symbol);
    const operator = str(p.operator);
    const threshold = coerceNumber(p.threshold);
    if (!asset) return missing('crypto_price', 'asset');
    if (!['gt', 'gte', 'lt', 'lte', 'eq', 'neq'].includes(operator)) {
      return { ok: false, reason: 'crypto_price requires operator: gt, gte, lt, lte, eq or neq.' };
    }
    if (threshold === null) return missing('crypto_price', 'threshold');
    return { ok: true, contract };
  }
  if (contract.method === 'crypto_event') {
    const asset = str(p.asset) || str(p.symbol);
    const event = str(p.event) || str(p.occurredByLabel) || str(p.blockHeight);
    if (!asset) return missing('crypto_event', 'asset');
    if (!event) return missing('crypto_event', 'event');
    if (!contract.source && !str(p.referenceUrl)) {
      return { ok: false, reason: 'crypto_event requires a machine-readable source URL (verification_source or params.referenceUrl).' };
    }
    return { ok: true, contract };
  }
  if (contract.method === 'factual') {
    const calc = str(p.calc);
    const hasSource = Boolean(contract.source || str(p.referenceUrl));
    if (!calc && !hasSource) {
      return { ok: false, reason: 'factual requires a machine-readable source URL or a deterministic formula in params.calc.' };
    }
    if (calc && !isSafeExpression(calc)) {
      return { ok: false, reason: 'params.calc is not a supported deterministic formula.' };
    }
    return { ok: true, contract };
  }
  return { ok: false, reason: `Unsupported verification method: ${contract.method}.` };
}

export function classifyContract(input: {
  category: string;
  method?: string;
  mode?: string;
  source?: string | null;
  params?: VerificationParams;
}): ClassificationResult {
  let method = str(input.method).toLowerCase();
  const viaCategory = categoryToMethod(input.category);
  if (!method) {
    if (viaCategory === 'crypto_price' && looksLikeCryptoEvent(input.params)) method = 'crypto_event';
    else if (viaCategory) method = viaCategory;
  }
  if (method === 'crypto_market') {
    method = looksLikeCryptoEvent(input.params) ? 'crypto_event' : 'crypto_price';
  }
  if (!(VERIFIABLE_METHODS as string[]).includes(method)) {
    return {
      ok: false,
      reason: `Unsupported verification method${method ? ': ' + method : ''}. Only auto-verifiable arguments (sports, crypto prices, crypto events, verifiable facts) are supported.`,
    };
  }
  const mode = normalizeMode(input.mode);
  if (!mode) {
    return { ok: false, reason: 'Argument mode must be "1v1" or "group".' };
  }
  const params: VerificationParams = { ...(input.params || {}), mode };
  const contract: VerificationContract = {
    method: method as VerificationMethod,
    mode,
    source: cleanSource(input.source) || cleanSource(input.params && !cleanSource(input.params.ref) ? input.params.referenceUrl : null) || null,
    params,
  };
  return validateContractFields(contract);
}

export function contractFromMarket(market: any): VerificationContract | null {
  if (!market || !isFixedArgument(market)) return null;
  const method = str(market.verification_method);
  if (!(VERIFIABLE_METHODS as string[]).includes(method) && !DB_METHODS.includes(method)) return null;
  const rawParams = market.verification_params && typeof market.verification_params === 'object' ? market.verification_params : {};
  const result = classifyContract({
    category: methodToCategory(method as VerificationMethod),
    method,
    mode: str((rawParams as VerificationParams).mode) || 'group',
    source: market.verification_source != null ? String(market.verification_source) : null,
    params: rawParams as VerificationParams,
  });
  return result.ok && result.contract ? result.contract : null;
}

export function isFixedArgument(market: any): boolean {
  return Boolean(market && String(market.pricing_model || '').toLowerCase() === 'fixed');
}

export function argumentMode(market: any): ArgumentMode {
  const params = market && market.verification_params && typeof market.verification_params === 'object'
    ? market.verification_params as VerificationParams
    : {};
  return str(params.mode).toLowerCase() === '1v1' ? '1v1' : 'group';
}

export function fixedStake(market: any): number {
  const direct = coerceNumber(market && market.stake_amount_smallest_unit);
  if (direct !== null) return direct;
  const fallback = coerceNumber(market && market.min_position_smallest_unit);
  return fallback !== null ? fallback : 0;
}

export function argumentResolutionDeadline(market: any): number {
  const rd = new Date(str(market && market.resolution_date)).getTime();
  if (Number.isFinite(rd)) return rd;
  const cd = market && (market.close_date || market.closes_at || market.trading_close_at);
  const t = new Date(str(cd)).getTime();
  return Number.isFinite(t) ? t + DEFAULT_RESOLUTION_MARGIN_MS : 0;
}

export function verificationDecision(market: any, now: number = Date.now()): { shouldAttempt: boolean; reason: string } {
  if (!market || !isFixedArgument(market)) return { shouldAttempt: false, reason: 'not-an-argument' };
  if (!market.verification_method) return { shouldAttempt: false, reason: 'no-method' };
  const status = str(market.verification_status);
  if (status === 'verified') return { shouldAttempt: false, reason: 'already-verified' };
  if (status === 'unverifiable') return { shouldAttempt: false, reason: 'unverifiable' };
  const attempts = Number(market.verification_attempt_count || 0);
  if (attempts >= MAX_VERIFICATION_ATTEMPTS) return { shouldAttempt: false, reason: 'max-attempts' };
  if (now < argumentResolutionDeadline(market)) return { shouldAttempt: false, reason: 'not-due' };
  return { shouldAttempt: true, reason: 'due' };
}

export function requiresExternalData(contract: VerificationContract): boolean {
  if (contract.method === 'factual' && str(contract.params.calc) !== '' && !contract.source && !str(contract.params.referenceUrl)) {
    return false;
  }
  return true;
}

export function questionFromStatement(text: string): string {
  let t = str(text).replace(/\s+/g, ' ');
  if (!t.endsWith('?')) t += '?';
  return t;
}

export function compareNumber(a: unknown, op: ComparisonOperator, b: unknown): boolean | null {
  const left = coerceNumber(a);
  const right = coerceNumber(b);
  if (left === null || right === null) return null;
  return OPS[op](left, right);
}

function pick(obj: unknown, paths: string[]): unknown {
  if (obj === null || typeof obj !== 'object') return null;
  for (const p of paths) {
    let cur: unknown = obj;
    let found = true;
    for (const part of p.split('.')) {
      if (cur !== null && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        found = false;
        break;
      }
    }
    if (found) return cur;
  }
  return null;
}

function pickString(obj: unknown, paths: string[]): string {
  const v = pick(obj, paths);
  return typeof v === 'string' ? v.trim() : '';
}

function extractBoolean(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    if (BOOL_TRUE.includes(t)) return true;
    if (BOOL_FALSE.includes(t)) return false;
    return null;
  }
  if (typeof raw === 'object' && raw !== null) {
    const single = pick(raw, ['result', 'verified', 'outcome', 'occurred', 'value', 'answer', 'hit', 'success', 'truth']);
    if (single !== null && !(typeof single === 'object')) return extractBoolean(single);
  }
  return null;
}

function extractPrice(raw: unknown, asset: string, currency: string): number | null {
  const viaNumber = coerceNumber(raw);
  if (viaNumber !== null) return viaNumber;
  if (raw === null || typeof raw !== 'object') return null;
  const direct = pick(raw, ['price', 'value', 'priceUsd', 'price_usd', 'last', 'markPrice', 'mark_price', 'c']);
  if (direct !== null) {
    const n = coerceNumber(direct);
    if (n !== null) return n;
  }
  if (asset) {
    const key = Object.keys(raw).find((k) => k.toLowerCase() === asset.toLowerCase())
      || Object.keys(raw).find((k) => k.toLowerCase().replace(/[^a-z]/g, '') === asset.toLowerCase().replace(/[^a-z]/g, ''));
    if (key) {
      const sub = (raw as Record<string, unknown>)[key];
      if (sub !== null && typeof sub === 'object') {
        const currencyKey = Object.keys(sub).find((k) => k.toLowerCase() === currency.toLowerCase());
        if (currencyKey) {
          const n = coerceNumber((sub as Record<string, unknown>)[currencyKey]);
          if (n !== null) return n;
        }
      } else if (sub !== null && (typeof sub === 'number' || typeof sub === 'string')) {
        const stripped = str(sub).replace(/[$,]/g, '');
        const n = coerceNumber(stripped);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

function extractOccurred(raw: unknown): boolean | null {
  const b = extractBoolean(raw);
  if (b !== null) return b;
  if (typeof raw !== 'object' || raw === null) return null;
  const status = pickString(raw, ['status', 'event_status', 'state', 'stage']);
  if (status) {
    const s = status.toLowerCase();
    if (['done', 'occurred', 'completed', 'confirmed', 'success', 'hit', 'true', 'yes'].includes(s)) return true;
    if (['pending', 'not_yet', 'scheduled', 'scheduled_for', 'upcoming', 'no', 'false', 'failed', 'missed'].includes(s)) return false;
  }
  return null;
}

function flattenVars(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (obj: unknown, prefix: string) => {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        walk(val, path);
      } else {
        out[path] = typeof val === 'boolean' ? (val ? 1 : 0) : val;
      }
    }
  };
  walk(raw, '');
  return out;
}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const src = String(expression || '');
  while (i < src.length) {
    const ch = src[i] ?? '';
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const rest = src.slice(i);
      const m = TOKEN_NUMBER.exec(rest);
      const value = m && m[0];
      if (!value) return null;
      tokens.push({ type: 'num', value });
      i += value.length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const rest = src.slice(i);
      const m = TOKEN_IDENT.exec(rest);
      const value = m && m[0];
      if (!value) return null;
      tokens.push({ type: 'ident', value });
      i += value.length;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lp', value: ch });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rp', value: ch });
      i += 1;
      continue;
    }
    if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function peek(p: Parser): Token | undefined {
  return p.tokens[p.pos];
}

function next(p: Parser): Token | undefined {
  const token = p.tokens[p.pos];
  if (token) p.pos += 1;
  return token;
}

function parseExpr(p: Parser, vars: Record<string, unknown>): number | null {
  let left = parseTerm(p, vars);
  if (left === null) return null;
  for (;;) {
    const t = peek(p);
    if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
      next(p);
      const right = parseTerm(p, vars);
      if (right === null) return null;
      left = t.value === '+' ? left + right : left - right;
    } else {
      break;
    }
  }
  return left;
}

function parseTerm(p: Parser, vars: Record<string, unknown>): number | null {
  let left = parsePower(p, vars);
  if (left === null) return null;
  for (;;) {
    const t = peek(p);
    if (t && t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
      next(p);
      const right = parsePower(p, vars);
      if (right === null) return null;
      if (t.value === '*') left = left * right;
      else if (t.value === '/') left = right === 0 ? NaN : left / right;
      else left = right === 0 ? NaN : left % right;
    } else {
      break;
    }
  }
  return left;
}

function parsePower(p: Parser, vars: Record<string, unknown>): number | null {
  const left = parseUnary(p, vars);
  if (left === null) return null;
  const t = peek(p);
  if (t && t.type === 'op' && t.value === '^') {
    next(p);
    const right = parsePower(p, vars);
    if (right === null) return null;
    return Math.pow(left, right);
  }
  return left;
}

function parseUnary(p: Parser, vars: Record<string, unknown>): number | null {
  const t = peek(p);
  if (t && t.type === 'op' && (t.value === '-' || t.value === '+')) {
    next(p);
    const inner = parseUnary(p, vars);
    if (inner === null) return null;
    return t.value === '-' ? -inner : inner;
  }
  return parsePrimary(p, vars);
}

function parsePrimary(p: Parser, vars: Record<string, unknown>): number | null {
  const t = next(p);
  if (!t) return null;
  if (t.type === 'num') return Number(t.value);
  if (t.type === 'lp') {
    const v = parseExpr(p, vars);
    if (v === null) return null;
    const close = next(p);
    if (!close || close.type !== 'rp') return null;
    return v;
  }
  if (t.type === 'ident') return resolveVar(vars, t.value);
  return null;
}

function resolveVar(vars: Record<string, unknown>, path: string): number | null {
  if (Object.prototype.hasOwnProperty.call(vars, path)) {
    return boolOrNumber(vars[path]);
  }
  let cur: unknown = vars;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return boolOrNumber(cur);
}

function boolOrNumber(value: unknown): number | null {
  const n = coerceNumber(value);
  if (n !== null) return n;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return null;
}

export function isSafeExpression(expression: string): boolean {
  if (!/^[\dA-Za-z_+\-*/%^().\s]+$/.test(expression)) return false;
  const anonymized = expression.replace(/[A-Za-z_][A-Za-z0-9_.]*/g, '0');
  const tokens = tokenize(anonymized);
  if (!tokens) return false;
  const p: Parser = { tokens, pos: 0 };
  const value = parseExpr(p, {});
  if (value === null) return false;
  return p.pos === tokens.length;
}

export function evaluateExpression(expression: string, vars: Record<string, unknown> = {}): number | null {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  const p: Parser = { tokens, pos: 0 };
  const value = parseExpr(p, vars);
  if (value === null) return null;
  if (p.pos !== tokens.length) return null;
  return Number.isFinite(value) ? value : null;
}

export function evaluateCondition(condition: string, raw: unknown): { outcome: YesNo | null; detail: unknown } {
  if (raw === null || typeof raw !== 'object') return { outcome: null, detail: raw };
  const home = pick(raw, ['home', 'score.home', 'homeScore', 'home_score', 'homeTeam']);
  const away = pick(raw, ['away', 'score.away', 'awayScore', 'away_score', 'awayTeam']);
  const homeN = coerceNumber(home);
  const awayN = coerceNumber(away);
  const total = homeN !== null && awayN !== null ? homeN + awayN : null;
  const resultLabel = pickString(raw, ['result', 'outcome', 'winner', 'winnerLabel', 'winner_label']).toLowerCase();
  const detail = { home: homeN, away: awayN, total };
  let outcome: boolean | null = null;

  if (/^home_win$/.test(condition)) {
    outcome = resultLabel === 'home' || (homeN !== null && awayN !== null && homeN > awayN);
  } else if (/^away_win$/.test(condition)) {
    outcome = resultLabel === 'away' || (homeN !== null && awayN !== null && homeN < awayN);
  } else if (/^draw$/.test(condition)) {
    outcome = resultLabel === 'draw' || (homeN !== null && awayN !== null && homeN === awayN);
  } else {
    const m = /^(home|away|total)_(gt|gte|lt|lte|over|under)_(\d+(?:\.\d+)?)$/.exec(condition);
    if (!m) return { outcome: null, detail };
    const side = m[1];
    const rawOp = m[2];
    const op = rawOp === 'over' ? 'gt' : rawOp === 'under' ? 'lt' : (rawOp as ComparisonOperator);
    if (!('gt' in OPS)) {
      return { outcome: null, detail };
    }
    const threshold = Number(m[3]);
    const value = side === 'home' ? homeN : side === 'away' ? awayN : total;
    const cmp = compareNumber(value, op, threshold);
    if (cmp === null) return { outcome: null, detail };
    outcome = cmp;
  }

  if (outcome === null) return { outcome: null, detail };
  return { outcome: outcome ? 'YES' : 'NO', detail };
}

export function evaluateContract(contract: VerificationContract, raw: unknown): VerificationEvaluation {
  const p = contract.params;
  if (contract.method === 'sport_event') {
    const condition = str(p.condition) || str(p.predicate) || 'home_win';
    const r = evaluateCondition(condition, raw);
    return { outcome: r.outcome, evidence: r.detail };
  }
  if (contract.method === 'crypto_price') {
    const asset = str(p.asset) || str(p.coinId) || '';
    const currency = str(p.currency) || 'usd';
    const operator = (str(p.operator) || 'gt') as ComparisonOperator;
    const threshold = coerceNumber(p.threshold);
    if (threshold === null) return { outcome: null, evidence: raw, failureReason: 'Missing threshold in contract.' };
    const price = extractPrice(raw, asset, currency);
    const cmp = compareNumber(price, operator, threshold);
    if (cmp === null) {
      return { outcome: null, evidence: raw, failureReason: 'Could not extract a numeric price from the source.' };
    }
    return { outcome: cmp ? 'YES' : 'NO', evidence: { price, threshold, operator, asset, currency } };
  }
  if (contract.method === 'crypto_event') {
    const occurred = extractOccurred(raw);
    if (occurred === null) {
      return { outcome: null, evidence: raw, failureReason: 'Could not determine from the source whether the event occurred.' };
    }
    return { outcome: occurred ? 'YES' : 'NO', evidence: { occurred } };
  }
  if (contract.method === 'factual') {
    const calc = str(p.calc);
    if (calc) {
      const computed = evaluateExpression(calc, flattenVars(raw));
      if (computed === null) {
        return { outcome: null, evidence: raw, failureReason: 'Deterministic formula could not be evaluated.' };
      }
      return { outcome: computed !== 0 ? 'YES' : 'NO', evidence: { computed, formula: calc } };
    }
    const bool = extractBoolean(raw);
    if (bool === null) {
      return { outcome: null, evidence: raw, failureReason: 'Source did not expose a boolean result.' };
    }
    return { outcome: bool ? 'YES' : 'NO', evidence: { result: bool } };
  }
  return { outcome: null, evidence: raw, failureReason: `Unsupported method ${contract.method}.` };
}

export function sourceUrlFor(contract: VerificationContract): string | null {
  if (contract.source && contract.source.trim()) return contract.source.trim();
  const referenceUrl = str(contract.params.referenceUrl);
  if (referenceUrl) return referenceUrl;
  if (contract.method === 'crypto_price') {
    const asset = str(contract.params.asset) || str(contract.params.coinId) || '';
    const currency = str(contract.params.currency) || 'usd';
    if (!asset) return null;
    return `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset)}&vs_currencies=${encodeURIComponent(currency)}`;
  }
  return null;
}

function parsePayload(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to scalar interpretation
  }
  const trimmed = text.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (trimmed !== '') {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  return null;
}

export async function fetchRawEvidence(contract: VerificationContract): Promise<unknown | null> {
  const url = sourceUrlFor(contract);
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    return parsePayload(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function describeContract(contract: VerificationContract): { yes: string; no: string } {
  const p = contract.params;
  if (contract.method === 'sport_event') {
    const condition = (str(p.condition) || str(p.predicate) || 'home_win').replace(/_/g, ' ');
    return {
      yes: `YES if ${condition}`,
      no: `NO if not (${condition})`,
    };
  }
  if (contract.method === 'crypto_price') {
    const asset = str(p.asset) || 'asset';
    const currency = str(p.currency) || 'usd';
    const operator = str(p.operator) || 'gt';
    const threshold = str(p.threshold) || '?';
    return {
      yes: `YES if ${asset} is ${operator} ${threshold} ${currency}`,
      no: `NO if ${asset} is not ${operator} ${threshold} ${currency}`,
    };
  }
  if (contract.method === 'crypto_event') {
    const asset = str(p.asset) || 'asset';
    const event = str(p.event) || 'event';
    return {
      yes: `YES if ${asset} ${event} occurs`,
      no: `NO if ${asset} ${event} does not occur`,
    };
  }
  return {
    yes: 'YES if the claim is true',
    no: 'NO if the claim is false',
  };
}