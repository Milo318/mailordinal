import type { DecisionAnalysis, MailInput } from "@/domain/mail";
import { buildDecisionState, MAIL_DECISION_QUESTIONS } from "@/domain/questions";
import { parseJevAnswers } from "@/lib/jev/schema";

const SYSTEM_ONE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const RETRYABLE_STATUS = new Set([429, 529]);

export class DecisionProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DecisionProviderError";
  }
}

interface JevProviderOptions {
  apiKey: string;
  model?: string;
  fetchImplementation?: typeof fetch;
  now?: Date;
  maxRetries?: number;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  const parsedSeconds = retryAfter ? Number.parseFloat(retryAfter) : Number.NaN;
  if (Number.isFinite(parsedSeconds)) {
    return Math.min(Math.max(parsedSeconds * 1_000, 250), 4_000);
  }
  return Math.min(400 * 2 ** attempt, 4_000);
}

export async function analyzeWithJev(
  input: MailInput,
  options: JevProviderOptions,
): Promise<DecisionAnalysis> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const now = options.now ?? new Date();
  const maxRetries = options.maxRetries ?? 2;
  const model = options.model ?? "jev-latest";
  const requestBody = {
    model,
    state: buildDecisionState(input, now),
    questions: MAIL_DECISION_QUESTIONS,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImplementation(SYSTEM_ONE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network failure";
      throw new DecisionProviderError(`Jev request failed: ${message}`, 502);
    }

    if (response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new DecisionProviderError("Jev returned invalid JSON", 502);
      }

      try {
        const parsed = parseJevAnswers(payload);
        return {
          source: "jev",
          model: parsed.model,
          evaluatedAt: now.toISOString(),
          answers: parsed.answers,
          usage: parsed.usage,
        };
      } catch {
        throw new DecisionProviderError("Jev returned an unexpected response shape", 502);
      }
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
      await wait(retryDelay(response, attempt));
      continue;
    }

    const publicStatus = response.status === 429 ? 429 : 502;
    throw new DecisionProviderError(
      `Jev request was rejected with status ${response.status}`,
      publicStatus,
    );
  }

  throw new DecisionProviderError("Jev request failed after retries", 502);
}
