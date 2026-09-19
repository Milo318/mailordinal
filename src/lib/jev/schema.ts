import { z } from "zod";

import {
  ACCOUNT_TIERS,
  DEPARTMENTS,
  MESSAGE_TYPES,
  SENSITIVITY_LEVELS,
  TIME_WINDOWS,
  type MailDecisionAnswers,
} from "@/domain/mail";

const probabilitySchema = z.number().min(0).max(1);

function sumIsProbabilityDistribution(probabilities: Record<string, number>) {
  const sum = Object.values(probabilities).reduce((total, value) => total + value, 0);
  return Math.abs(sum - 1) <= 0.02;
}

function choiceAnswerSchema<const TOptions extends readonly [string, ...string[]]>(
  options: TOptions,
) {
  return z
    .object({
      type: z.literal("choice"),
      choice: z.enum(options),
      confidence: probabilitySchema,
      probabilities: z.record(z.string(), probabilitySchema),
    })
    .strict()
    .superRefine((answer, context) => {
      for (const option of options) {
        if (!(option in answer.probabilities)) {
          context.addIssue({
            code: "custom",
            message: `Missing probability for option: ${option}`,
            path: ["probabilities", option],
          });
        }
      }

      if (!sumIsProbabilityDistribution(answer.probabilities)) {
        context.addIssue({
          code: "custom",
          message: "Choice probabilities must sum to 1",
          path: ["probabilities"],
        });
      }
    });
}

const noulAnswerSchema = z
  .object({
    type: z.literal("noul"),
    noul: probabilitySchema,
  })
  .strict();

const scoreAnswerSchema = z
  .object({
    type: z.literal("score"),
    score: z.number().min(0).max(3),
    confidence: probabilitySchema,
    legend: z.record(z.string(), z.string()),
    probabilities: z.record(z.string(), probabilitySchema),
  })
  .strict()
  .superRefine((answer, context) => {
    for (const level of ["0", "1", "2", "3"]) {
      if (!(level in answer.legend) || !(level in answer.probabilities)) {
        context.addIssue({
          code: "custom",
          message: `Missing score level: ${level}`,
        });
      }
    }
    if (!sumIsProbabilityDistribution(answer.probabilities)) {
      context.addIssue({
        code: "custom",
        message: "Score probabilities must sum to 1",
        path: ["probabilities"],
      });
    }
  });

export const jevApiResponseSchema = z
  .object({
    model: z.string().min(1),
    answers: z
      .object({
        department: choiceAnswerSchema(DEPARTMENTS),
        reply_required: noulAnswerSchema,
        action_required: noulAnswerSchema,
        message_type: choiceAnswerSchema(MESSAGE_TYPES),
        customer_blocked: noulAnswerSchema,
        is_follow_up: noulAnswerSchema,
        time_window: choiceAnswerSchema(TIME_WINDOWS),
        delay_impact: scoreAnswerSchema,
        sensitivity: choiceAnswerSchema(SENSITIVITY_LEVELS),
      })
      .strict(),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const mailInputSchema = z
  .object({
    senderName: z.string().trim().min(1).max(120),
    senderEmail: z.string().trim().email().max(254),
    company: z.string().trim().min(1).max(160),
    subject: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(12_000),
    receivedAt: z.string().datetime({ offset: true }),
    accountTier: z.enum(ACCOUNT_TIERS),
    slaHours: z.number().int().min(1).max(720),
    threadDepth: z.number().int().min(1).max(100),
    previousMessages: z.array(z.string().max(4_000)).max(10).optional(),
  })
  .strict();

export type ValidMailInput = z.infer<typeof mailInputSchema>;

export function parseJevAnswers(value: unknown): {
  model: string;
  answers: MailDecisionAnswers;
  usage: { inputTokens: number; outputTokens: number };
} {
  const parsed = jevApiResponseSchema.parse(value);
  return {
    model: parsed.model,
    answers: parsed.answers as MailDecisionAnswers,
    usage: {
      inputTokens: parsed.usage.input_tokens,
      outputTokens: parsed.usage.output_tokens,
    },
  };
}
