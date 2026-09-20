import type { DecisionAnalysis, MailDecisionAnswers } from "@/domain/mail";
import { computePriority } from "@/domain/priority-policy";
import { answersFromGold } from "@/benchmark/answers";
import type {
  BenchmarkCase,
  BenchmarkMetrics,
  BenchmarkPrediction,
} from "@/benchmark/types";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function analysis(answers: MailDecisionAnswers, model: string): DecisionAnalysis {
  return {
    source: "demo",
    model,
    evaluatedAt: NOW.toISOString(),
    answers,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

function mean(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(correct: number, total: number) {
  return total === 0 ? 0 : correct / total;
}

export function scoreBenchmark(
  provider: string,
  cases: BenchmarkCase[],
  predictions: BenchmarkPrediction[],
): BenchmarkMetrics {
  const predictionsByCase = new Map(
    predictions.map((prediction) => [prediction.caseId, prediction]),
  );
  const successful = cases.flatMap((testCase) => {
    const prediction = predictionsByCase.get(testCase.id);
    return prediction && !prediction.error ? [{ testCase, prediction }] : [];
  });

  let department = 0;
  let reply = 0;
  let action = 0;
  let messageType = 0;
  let blocked = 0;
  let followUp = 0;
  let timeWindow = 0;
  let sensitivity = 0;
  let criticalFalseNegatives = 0;
  const impactErrors: number[] = [];
  const priorityErrors: number[] = [];
  const brierTerms: number[] = [];
  const ranked: Array<{ id: string; gold: number; predicted: number }> = [];

  for (const { testCase, prediction } of successful) {
    const actual = prediction.answers;
    const gold = testCase.gold;
    department += Number(actual.department.choice === gold.department);
    reply += Number(actual.reply_required.noul >= 0.5 === gold.replyRequired);
    action += Number(actual.action_required.noul >= 0.5 === gold.actionRequired);
    messageType += Number(actual.message_type.choice === gold.messageType);
    blocked += Number(actual.customer_blocked.noul >= 0.5 === gold.customerBlocked);
    followUp += Number(actual.is_follow_up.noul >= 0.5 === gold.isFollowUp);
    timeWindow += Number(actual.time_window.choice === gold.timeWindow);
    sensitivity += Number(actual.sensitivity.choice === gold.sensitivity);
    impactErrors.push(Math.abs(actual.delay_impact.score - gold.delayImpact));

    const goldPriority = computePriority(
      testCase.input,
      analysis(answersFromGold(gold), "gold"),
      NOW,
    ).score;
    const predictedPriority = computePriority(
      testCase.input,
      analysis(actual, prediction.model),
      NOW,
    ).score;
    priorityErrors.push(Math.abs(predictedPriority - goldPriority));
    if (goldPriority >= 75 && predictedPriority < 75) criticalFalseNegatives += 1;
    ranked.push({ id: testCase.id, gold: goldPriority, predicted: predictedPriority });

    brierTerms.push(
      (actual.reply_required.noul - Number(gold.replyRequired)) ** 2,
      (actual.action_required.noul - Number(gold.actionRequired)) ** 2,
      (actual.customer_blocked.noul - Number(gold.customerBlocked)) ** 2,
      (actual.is_follow_up.noul - Number(gold.isFollowUp)) ** 2,
    );
  }

  const goldTop20 = new Set(
    ranked
      .toSorted((a, b) => b.gold - a.gold)
      .slice(0, 20)
      .map((item) => item.id),
  );
  const predictedTop20 = ranked.toSorted((a, b) => b.predicted - a.predicted).slice(0, 20);
  const top20Hits = predictedTop20.filter((item) => goldTop20.has(item.id)).length;
  const total = successful.length;

  return {
    provider,
    cases: total,
    failures: cases.length - total,
    departmentAccuracy: ratio(department, total),
    replyAccuracy: ratio(reply, total),
    actionAccuracy: ratio(action, total),
    messageTypeAccuracy: ratio(messageType, total),
    blockedAccuracy: ratio(blocked, total),
    followUpAccuracy: ratio(followUp, total),
    timeWindowAccuracy: ratio(timeWindow, total),
    sensitivityAccuracy: ratio(sensitivity, total),
    delayImpactMae: mean(impactErrors),
    priorityMae: mean(priorityErrors),
    criticalFalseNegatives,
    top20Recall: ratio(top20Hits, Math.min(20, ranked.length)),
    binaryBrierScore: mean(brierTerms),
    meanLatencyMs: mean(successful.map(({ prediction }) => prediction.latencyMs)),
    inputTokens: successful.reduce(
      (sum, { prediction }) => sum + prediction.inputTokens,
      0,
    ),
    outputTokens: successful.reduce(
      (sum, { prediction }) => sum + prediction.outputTokens,
      0,
    ),
  };
}
