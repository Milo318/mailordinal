import { z } from "zod";

import type { MailDecisionAnswers, MailInput } from "@/domain/mail";
import {
  DEPARTMENTS,
  MESSAGE_TYPES,
  SENSITIVITY_LEVELS,
  TIME_WINDOWS,
} from "@/domain/mail";
import { MAIL_DECISION_QUESTIONS, buildDecisionState } from "@/domain/questions";
import { choiceAnswer, scoreAnswer } from "@/benchmark/answers";

interface LlmOptions {
  apiKey: string;
  endpoint: string;
  model: string;
  now: Date;
}

const binarySchema = z.union([z.boolean(), z.number().min(0).max(1)]).transform(Number);
const simpleAnswerSchema = z.object({
  department: z.enum(DEPARTMENTS),
  reply_required: binarySchema,
  action_required: binarySchema,
  message_type: z.enum(MESSAGE_TYPES),
  customer_blocked: binarySchema,
  is_follow_up: binarySchema,
  time_window: z.enum(TIME_WINDOWS),
  delay_impact: z.coerce.number().min(0).max(3),
  sensitivity: z.enum(SENSITIVITY_LEVELS),
});

export async function analyzeWithStandardLlm(
  input: MailInput,
  options: LlmOptions,
): Promise<{
  answers: MailDecisionAnswers;
  inputTokens: number;
  outputTokens: number;
  model: string;
}> {
  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return only a flat JSON object with exactly these keys: department, reply_required, action_required, message_type, customer_blocked, is_follow_up, time_window, delay_impact, sensitivity. Boolean fields may be true/false. delay_impact must be 0, 1, 2, or 3. Use only option names present in the supplied criteria.",
        },
        {
          role: "user",
          content: JSON.stringify({
            state: buildDecisionState(input, options.now),
            questions: MAIL_DECISION_QUESTIONS,
            required_output: "flat JSON object described by the system instruction",
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned no JSON content");
  const decoded = JSON.parse(content) as Record<string, unknown>;
  const parsed = simpleAnswerSchema.parse(decoded.answers ?? decoded);
  const answers: MailDecisionAnswers = {
    department: choiceAnswer(DEPARTMENTS, parsed.department),
    reply_required: { type: "noul", noul: parsed.reply_required },
    action_required: { type: "noul", noul: parsed.action_required },
    message_type: choiceAnswer(MESSAGE_TYPES, parsed.message_type),
    customer_blocked: { type: "noul", noul: parsed.customer_blocked },
    is_follow_up: { type: "noul", noul: parsed.is_follow_up },
    time_window: choiceAnswer(TIME_WINDOWS, parsed.time_window),
    delay_impact: scoreAnswer(parsed.delay_impact),
    sensitivity: choiceAnswer(SENSITIVITY_LEVELS, parsed.sensitivity),
  };
  return {
    answers,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    model: payload.model ?? options.model,
  };
}
