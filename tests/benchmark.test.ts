import { describe, expect, it } from "vitest";

import { createBenchmarkCorpus } from "@/benchmark/corpus";
import { scoreBenchmark } from "@/benchmark/metrics";
import { analyzeWithRules } from "@/benchmark/rules-provider";

describe("200-case benchmark", () => {
  const corpus = createBenchmarkCorpus();

  it("has the fixed, independently segmented corpus shape", () => {
    expect(corpus).toHaveLength(200);
    expect(new Set(corpus.map((testCase) => testCase.id)).size).toBe(200);
    expect(
      Object.fromEntries(
        ["clear", "ambiguous", "follow_up", "critical", "stress"].map((segment) => [
          segment,
          corpus.filter((testCase) => testCase.segment === segment).length,
        ]),
      ),
    ).toEqual({ clear: 80, ambiguous: 50, follow_up: 30, critical: 20, stress: 20 });
  });

  it("runs and scores the deterministic baseline without failures", () => {
    const predictions = corpus.map((testCase) => ({
      caseId: testCase.id,
      provider: "rules",
      model: "rules-v1",
      answers: analyzeWithRules(testCase.input),
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
    }));
    const report = scoreBenchmark("rules", corpus, predictions);
    expect(report.cases).toBe(200);
    expect(report.failures).toBe(0);
    expect(report.departmentAccuracy).toBeGreaterThan(0.5);
    expect(report.inputTokens).toBe(0);
  });
});
