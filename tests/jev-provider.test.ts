import { describe, expect, it, vi } from "vitest";

import type { MailInput } from "@/domain/mail";
import { MAIL_DECISION_QUESTIONS } from "@/domain/questions";
import { analyzeWithJev, DecisionProviderError } from "@/lib/jev/provider";

const input: MailInput = {
  senderName: "Avery Morgan",
  senderEmail: "avery@atlas.example",
  company: "Atlas",
  subject: "300-seat quote",
  body: "Could you send a quote by Friday?",
  receivedAt: "2026-09-19T10:00:00.000Z",
  accountTier: "enterprise",
  slaHours: 8,
  threadDepth: 1,
};

const responsePayload = {
  model: "jev-1.13.0",
  answers: {
    department: {
      type: "choice",
      choice: "sales",
      confidence: 0.9,
      probabilities: {
        sales: 0.9,
        support: 0.02,
        finance: 0.02,
        people: 0.01,
        legal: 0.01,
        partnerships: 0.02,
        general: 0.02,
      },
    },
    reply_required: { type: "noul", noul: 0.96 },
    action_required: { type: "noul", noul: 0.94 },
    message_type: {
      type: "choice",
      choice: "request",
      confidence: 0.84,
      probabilities: {
        question: 0.05,
        request: 0.84,
        complaint: 0.02,
        follow_up: 0.02,
        information: 0.03,
        approval: 0.04,
      },
    },
    customer_blocked: { type: "noul", noul: 0.22 },
    is_follow_up: { type: "noul", noul: 0.04 },
    time_window: {
      type: "choice",
      choice: "this_week",
      confidence: 0.92,
      probabilities: {
        immediate: 0.02,
        within_24h: 0.02,
        this_week: 0.92,
        none: 0.02,
        unclear: 0.02,
      },
    },
    delay_impact: {
      type: "score",
      score: 1.9,
      confidence: 0.7,
      legend: { "0": "None", "1": "Minor", "2": "Meaningful", "3": "Critical" },
      probabilities: { "0": 0.02, "1": 0.18, "2": 0.68, "3": 0.12 },
    },
    sensitivity: {
      type: "choice",
      choice: "normal",
      confidence: 0.9,
      probabilities: {
        normal: 0.9,
        financial: 0.03,
        legal: 0.03,
        security: 0.02,
        personal_data: 0.02,
      },
    },
  },
  usage: { input_tokens: 420, output_tokens: 95 },
};

describe("Jev provider adapter", () => {
  it("sends one shared state with all nine typed questions and validates the response", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Response.json(responsePayload, { status: 200 }),
    );

    const result = await analyzeWithJev(input, {
      apiKey: "test-key",
      model: "jev-1.13.0",
      fetchImplementation,
      now: new Date("2026-09-19T12:00:00.000Z"),
      maxRetries: 0,
    });

    expect(fetchImplementation).toHaveBeenCalledOnce();
    const call = fetchImplementation.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected provider request");
    const [url, options] = call;
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(new Headers(options?.headers).get("authorization")).toBe("Bearer test-key");
    const body = JSON.parse(String(options?.body)) as {
      state: { message: { subject: string } };
      questions: Record<string, unknown>;
    };
    expect(body.state.message.subject).toBe("300-seat quote");
    expect(Object.keys(body.questions)).toEqual(Object.keys(MAIL_DECISION_QUESTIONS));
    expect(result.source).toBe("jev");
    expect(result.model).toBe("jev-1.13.0");
    expect(result.answers.department.choice).toBe("sales");
  });

  it("fails closed when the provider response violates the typed contract", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Response.json({ model: "jev-test", answers: {}, usage: {} }, { status: 200 }),
    );
    await expect(
      analyzeWithJev(input, {
        apiKey: "test-key",
        fetchImplementation,
        maxRetries: 0,
      }),
    ).rejects.toBeInstanceOf(DecisionProviderError);
  });
});
