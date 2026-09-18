/**
 * Minimal Groq Chat Completions client.
 *
 * The API key is read from GROQ_API_KEY at call time and stays server-side.
 * When the key is absent the client reports "not configured" and callers fall
 * back to deterministic behaviour — the product never sends an API key to the
 * browser.
 */

const GROQ_BASE = process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1';
export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 20000;

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
}

export function groqModel(): string {
  return DEFAULT_GROQ_MODEL;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Send a chat completion and return the assistant text, or `null` when Groq is
 * not configured or the request fails (callers should degrade gracefully).
 */
export async function groqChat(messages: ChatMessage[], options: GroqOptions = {}): Promise<string | null> {
  if (!isGroqConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.GROQ_API_KEY as string}`,
      },
      body: JSON.stringify({
        model: groqModel(),
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a JSON object from a model response that may include prose or fences. */
export function parseJsonObject<T>(text: string | null): T | null {
  if (!text) return null;
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
