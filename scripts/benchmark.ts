import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createBenchmarkCorpus } from "../src/benchmark/corpus";
import { analyzeWithStandardLlm } from "../src/benchmark/llm-provider";
import { scoreBenchmark } from "../src/benchmark/metrics";
import { analyzeWithRules } from "../src/benchmark/rules-provider";
import type { BenchmarkCase, BenchmarkPrediction } from "../src/benchmark/types";
import { analyzeWithJev } from "../src/lib/jev/provider";

const NOW = new Date("2026-09-20T12:00:00.000Z");
const outputDirectory = path.resolve("benchmark-results");

function requestedProviders() {
  const argument = process.argv.find((value) => value.startsWith("--providers="));
  return new Set((argument?.split("=")[1] ?? "rules").split(","));
}

function requestedLimit() {
  const argument = process.argv.find((value) => value.startsWith("--limit="));
  const value = Number.parseInt(argument?.split("=")[1] ?? "200", 10);
  return Number.isFinite(value) ? Math.min(200, Math.max(1, value)) : 200;
}

async function loadEnvLocal() {
  try {
    const contents = await readFile(path.resolve(".env.local"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator <= 0 || line.startsWith("#")) continue;
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1);
      process.env[key] ??= value;
    }
  } catch {
    // Environment variables supplied by CI or the shell remain authoritative.
  }
}

async function runProvider(
  provider: string,
  corpus: BenchmarkCase[],
): Promise<BenchmarkPrediction[]> {
  async function runCase(testCase: BenchmarkCase): Promise<BenchmarkPrediction> {
    const started = performance.now();
    try {
      if (provider === "rules") {
        return {
          caseId: testCase.id,
          provider,
          model: "rules-v1",
          answers: analyzeWithRules(testCase.input),
          latencyMs: performance.now() - started,
          inputTokens: 0,
          outputTokens: 0,
        };
      } else if (provider === "jev") {
        const apiKey = process.env.TYPESAFE_API_KEY;
        if (!apiKey) throw new Error("TYPESAFE_API_KEY is missing");
        const result = await analyzeWithJev(testCase.input, {
          apiKey,
          model: process.env.TYPESAFE_MODEL ?? "jev-latest",
          now: NOW,
          maxRetries: 2,
        });
        return {
          caseId: testCase.id,
          provider,
          model: result.model,
          answers: result.answers,
          latencyMs: performance.now() - started,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        };
      } else if (provider === "llm") {
        const apiKey = process.env.BENCHMARK_LLM_API_KEY;
        if (!apiKey) throw new Error("BENCHMARK_LLM_API_KEY is missing");
        const result = await analyzeWithStandardLlm(testCase.input, {
          apiKey,
          endpoint:
            process.env.BENCHMARK_LLM_ENDPOINT ??
            "https://api.openai.com/v1/chat/completions",
          model: process.env.BENCHMARK_LLM_MODEL ?? "gpt-5-mini",
          now: NOW,
        });
        return {
          caseId: testCase.id,
          provider,
          model: result.model,
          answers: result.answers,
          latencyMs: performance.now() - started,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      return {
        caseId: testCase.id,
        provider,
        model: provider,
        answers: analyzeWithRules(testCase.input),
        latencyMs: performance.now() - started,
        inputTokens: 0,
        outputTokens: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const predictions: BenchmarkPrediction[] = new Array(corpus.length);
  const configuredConcurrency = Number.parseInt(
    process.env.BENCHMARK_CONCURRENCY ?? (provider === "rules" ? "1" : "4"),
    10,
  );
  const concurrency = Math.max(1, Math.min(configuredConcurrency, 10));
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < corpus.length) {
      const index = nextIndex;
      nextIndex += 1;
      predictions[index] = await runCase(corpus[index]!);
      completed += 1;
      if (completed % 20 === 0 || completed === corpus.length) {
        process.stdout.write(`${provider}: ${completed}/${corpus.length}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return predictions;
}

async function main() {
  await loadEnvLocal();
  const corpus = createBenchmarkCorpus().slice(0, requestedLimit());
  const providers = requestedProviders();
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "corpus.json"),
    `${JSON.stringify(corpus, null, 2)}\n`,
  );

  const reports = [];
  for (const provider of providers) {
    const predictions = await runProvider(provider, corpus);
    await writeFile(
      path.join(outputDirectory, `${provider}-predictions.json`),
      `${JSON.stringify(predictions, null, 2)}\n`,
    );
    reports.push(scoreBenchmark(provider, corpus, predictions));
  }
  await writeFile(
    path.join(outputDirectory, "report.json"),
    `${JSON.stringify(reports, null, 2)}\n`,
  );
  console.table(
    reports.map((report) => ({
      provider: report.provider,
      cases: report.cases,
      failures: report.failures,
      department: report.departmentAccuracy.toFixed(3),
      reply: report.replyAccuracy.toFixed(3),
      action: report.actionAccuracy.toFixed(3),
      priorityMAE: report.priorityMae.toFixed(2),
      criticalFN: report.criticalFalseNegatives,
      top20Recall: report.top20Recall.toFixed(3),
      brier: report.binaryBrierScore.toFixed(3),
      latencyMs: report.meanLatencyMs.toFixed(1),
    })),
  );
}

await main();
