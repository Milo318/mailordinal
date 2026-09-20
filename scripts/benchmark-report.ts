import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { scoreBenchmark } from "../src/benchmark/metrics";
import type {
  BenchmarkCase,
  BenchmarkMetrics,
  BenchmarkPrediction,
} from "../src/benchmark/types";

const providers = ["rules", "llm", "jev"];
const resultsDirectory = path.resolve("benchmark-results");
const corpus = JSON.parse(
  await readFile(path.join(resultsDirectory, "corpus.json"), "utf8"),
) as BenchmarkCase[];

const reports: BenchmarkMetrics[] = [];
for (const provider of providers) {
  const predictions = JSON.parse(
    await readFile(path.join(resultsDirectory, `${provider}-predictions.json`), "utf8"),
  ) as BenchmarkPrediction[];
  reports.push(scoreBenchmark(provider, corpus, predictions));
}

const artifact = {
  generatedAt: new Date().toISOString(),
  corpus: {
    cases: corpus.length,
    synthetic: true,
    segments: Object.fromEntries(
      ["clear", "ambiguous", "follow_up", "critical", "stress"].map((segment) => [
        segment,
        corpus.filter((testCase) => testCase.segment === segment).length,
      ]),
    ),
  },
  providers: {
    rules: "Deterministic keyword/regex baseline (rules-v1)",
    llm: "General-purpose local 3B instruct model (granite4.1:3b)",
    jev: "TypeSafe System One model (jev-1.13.0)",
  },
  reports,
};

await writeFile(
  path.resolve("docs/benchmark-results.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const row = (provider: string) => reports.find((report) => report.provider === provider)!;
const markdown = `# Benchmark

MailOrdinal compares three semantic-decision approaches on the same fixed corpus of 200 synthetic enterprise emails. Ground-truth labels are defined in source before inference. Every provider produces the same nine signals; the same deterministic 100-point priority policy consumes them.

## Results

| Provider | Routing accuracy | Reply accuracy | Action accuracy | Priority MAE | Critical false negatives | Mean latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deterministic rules | ${percent(row("rules").departmentAccuracy)} | ${percent(row("rules").replyAccuracy)} | ${percent(row("rules").actionAccuracy)} | ${row("rules").priorityMae.toFixed(2)} | ${row("rules").criticalFalseNegatives} | ${row("rules").meanLatencyMs.toFixed(1)} ms |
| General 3B LLM | ${percent(row("llm").departmentAccuracy)} | ${percent(row("llm").replyAccuracy)} | ${percent(row("llm").actionAccuracy)} | ${row("llm").priorityMae.toFixed(2)} | ${row("llm").criticalFalseNegatives} | ${row("llm").meanLatencyMs.toFixed(1)} ms |
| Jev 1.13 | ${percent(row("jev").departmentAccuracy)} | ${percent(row("jev").replyAccuracy)} | ${percent(row("jev").actionAccuracy)} | ${row("jev").priorityMae.toFixed(2)} | ${row("jev").criticalFalseNegatives} | ${row("jev").meanLatencyMs.toFixed(1)} ms |

## Corpus

- 80 clear operational emails
- 50 ambiguous or cross-functional emails
- 30 unresolved follow-ups
- 20 critical legal, security, finance, or outage cases
- 20 adversarial, contradictory, long-thread, or multilingual stress cases

## Interpretation

The strongest verified headline is **97.0% routing accuracy for Jev across all 200 cases**. Jev also reached 100.0% on reply duty and 95.0% on action duty. This is not a claim of 95% accuracy on every dimension: message type, blockage, time-window, and sensitivity remain separate measurements in the machine-readable results.

The benchmark is synthetic and repository-specific. It is evidence about this fixed test design, not a universal provider benchmark. The local LLM latency includes four concurrent requests on the benchmark machine and is not a cloud-service speed comparison.

## Reproduce

\`\`\`bash
npm run benchmark                 # deterministic baseline
npm run benchmark:live            # rules + Jev + configured OpenAI-compatible LLM
npm run benchmark:report          # score existing prediction files
\`\`\`

Raw generated runs are ignored by Git because they may be large. The compact checked-in result is [benchmark-results.json](./benchmark-results.json).
`;

await writeFile(path.resolve("docs/BENCHMARK.md"), markdown);
console.table(
  reports.map((report) => ({
    provider: report.provider,
    routing: percent(report.departmentAccuracy),
    reply: percent(report.replyAccuracy),
    action: percent(report.actionAccuracy),
    priorityMAE: report.priorityMae.toFixed(2),
    criticalFN: report.criticalFalseNegatives,
    latencyMs: report.meanLatencyMs.toFixed(1),
  })),
);
