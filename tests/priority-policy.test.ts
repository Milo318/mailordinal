import { describe, expect, it } from "vitest";

import type {
  ChoiceAnswer,
  DecisionAnalysis,
  Department,
  MailInput,
  MessageType,
  Sensitivity,
  TimeWindow,
} from "@/domain/mail";
import { computePriority, rankInbox } from "@/domain/priority-policy";
import { createEvaluatedMail } from "@/domain/evaluate-mail";

const NOW = new Date("2026-09-19T12:00:00.000Z");

const baseInput: MailInput = {
  senderName: "Avery Morgan",
  senderEmail: "avery@atlas.example",
  company: "Atlas",
  subject: "Question",
  body: "Could you help?",
  receivedAt: "2026-09-19T10:00:00.000Z",
  accountTier: "standard",
  slaHours: 24,
  threadDepth: 1,
};

function choice<T extends string>(
  values: Record<T, number>,
  selected: NoInfer<T>,
  confidence = 0.8,
): ChoiceAnswer<T> {
  return { type: "choice" as const, choice: selected, probabilities: values, confidence };
}

function analysis(overrides: Partial<DecisionAnalysis["answers"]> = {}): DecisionAnalysis {
  const departments: Record<Department, number> = {
    sales: 0.8,
    support: 0.05,
    finance: 0.03,
    people: 0.03,
    legal: 0.03,
    partnerships: 0.03,
    general: 0.03,
  };
  const types: Record<MessageType, number> = {
    question: 0.8,
    request: 0.05,
    complaint: 0.03,
    follow_up: 0.04,
    information: 0.05,
    approval: 0.03,
  };
  const windows: Record<TimeWindow, number> = {
    immediate: 0.02,
    within_24h: 0.03,
    this_week: 0.05,
    none: 0.85,
    unclear: 0.05,
  };
  const sensitivity: Record<Sensitivity, number> = {
    normal: 0.88,
    financial: 0.03,
    legal: 0.03,
    security: 0.03,
    personal_data: 0.03,
  };
  return {
    source: "jev",
    model: "jev-test",
    evaluatedAt: NOW.toISOString(),
    usage: { inputTokens: 200, outputTokens: 20 },
    answers: {
      department: choice(departments, "sales"),
      reply_required: { type: "noul", noul: 0.75 },
      action_required: { type: "noul", noul: 0.65 },
      message_type: choice(types, "question"),
      customer_blocked: { type: "noul", noul: 0.1 },
      is_follow_up: { type: "noul", noul: 0.1 },
      time_window: choice(windows, "none"),
      delay_impact: {
        type: "score",
        score: 1,
        confidence: 0.75,
        legend: { "0": "None", "1": "Minor", "2": "Meaningful", "3": "Critical" },
        probabilities: { "0": 0.1, "1": 0.8, "2": 0.07, "3": 0.03 },
      },
      sensitivity: choice(sensitivity, "normal"),
      ...overrides,
    },
  };
}

describe("priority policy", () => {
  it("ranks semantic urgency plus metadata without asking the model for a final priority", () => {
    const routine = computePriority(baseInput, analysis(), NOW);
    const critical = computePriority(
      { ...baseInput, accountTier: "strategic", slaHours: 2 },
      analysis({
        reply_required: { type: "noul", noul: 0.98 },
        action_required: { type: "noul", noul: 0.99 },
        customer_blocked: { type: "noul", noul: 0.97 },
        is_follow_up: { type: "noul", noul: 0.9 },
        delay_impact: {
          type: "score",
          score: 2.9,
          confidence: 0.9,
          legend: { "0": "None", "1": "Minor", "2": "Meaningful", "3": "Critical" },
          probabilities: { "0": 0, "1": 0.01, "2": 0.08, "3": 0.91 },
        },
        time_window: choice(
          {
            immediate: 0.94,
            within_24h: 0.03,
            this_week: 0.01,
            none: 0.01,
            unclear: 0.01,
          },
          "immediate",
        ),
      }),
      NOW,
    );

    expect(critical.score).toBeGreaterThan(routine.score);
    expect(critical.bucket).toBe("critical");
    expect(critical.factors.find((factor) => factor.id === "sla")?.source).toBe("metadata");
  });

  it("routes consequential uncertainty to review instead of suppressing priority", () => {
    const uncertainDepartments: Record<Department, number> = {
      sales: 0.31,
      support: 0.3,
      finance: 0.2,
      people: 0.05,
      legal: 0.05,
      partnerships: 0.04,
      general: 0.05,
    };
    const result = computePriority(
      baseInput,
      analysis({
        department: choice(uncertainDepartments, "sales", 0.12),
        reply_required: { type: "noul", noul: 0.51 },
        delay_impact: {
          type: "score",
          score: 2.4,
          confidence: 0.58,
          legend: { "0": "None", "1": "Minor", "2": "Meaningful", "3": "Critical" },
          probabilities: { "0": 0.02, "1": 0.08, "2": 0.38, "3": 0.52 },
        },
      }),
      NOW,
    );

    expect(result.manualReview).toBe(true);
    expect(result.nextAction).toBe("Manual triage");
    expect(result.reviewReasons).toContain("Department routing is not decisive");
  });

  it("archives messages that require neither a reply nor internal action", () => {
    const result = computePriority(
      baseInput,
      analysis({
        reply_required: { type: "noul", noul: 0.08 },
        action_required: { type: "noul", noul: 0.12 },
      }),
      NOW,
    );
    expect(result.nextAction).toBe("Archive as information");
  });

  it("sorts by derived priority and then oldest first", () => {
    const first = createEvaluatedMail("first", baseInput, analysis(), NOW);
    const urgent = createEvaluatedMail(
      "urgent",
      { ...baseInput, receivedAt: "2026-09-19T11:00:00.000Z" },
      analysis({ customer_blocked: { type: "noul", noul: 0.98 } }),
      NOW,
    );
    expect(rankInbox([first, urgent])[0]?.id).toBe("urgent");
  });
});
