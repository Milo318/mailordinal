import { describe, expect, it } from "vitest";

import { mailInputSchema } from "@/lib/jev/schema";

describe("mail input boundary", () => {
  it("accepts a bounded enterprise email payload", () => {
    const result = mailInputSchema.safeParse({
      senderName: "Avery Morgan",
      senderEmail: "avery@atlas.example",
      company: "Atlas",
      subject: "Request",
      body: "Please send the approval today.",
      receivedAt: "2026-09-19T10:00:00.000Z",
      accountTier: "enterprise",
      slaHours: 24,
      threadDepth: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unbounded or malformed input before any provider call", () => {
    const result = mailInputSchema.safeParse({
      senderName: "",
      senderEmail: "not-an-email",
      company: "Atlas",
      subject: "Request",
      body: "x".repeat(12_001),
      receivedAt: "today",
      accountTier: "vip",
      slaHours: 0,
      threadDepth: 0,
    });
    expect(result.success).toBe(false);
  });
});
