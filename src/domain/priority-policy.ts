import {
  type AccountTier,
  type DecisionAnalysis,
  type EvaluatedMail,
  type MailInput,
  type PriorityBucket,
  type PriorityDecision,
  type PriorityFactor,
  type TimeWindow,
} from "@/domain/mail";

export const PRIORITY_POLICY_VERSION = "mailordinal-priority-v1";

const TIER_POINTS: Record<AccountTier, number> = {
  strategic: 5,
  enterprise: 3,
  growth: 1,
  standard: 0,
};

const TIME_WINDOW_WEIGHT: Record<TimeWindow, number> = {
  immediate: 1,
  within_24h: 0.82,
  this_week: 0.35,
  none: 0,
  unclear: 0.18,
};

function round(value: number, precision = 1) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

function isAmbiguousProbability(value: number) {
  return value >= 0.4 && value <= 0.6;
}

function bucketFor(score: number): PriorityBucket {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "normal";
  return "low";
}

function expectedTimePressure(probabilities: Record<TimeWindow, number>): number {
  return (Object.entries(TIME_WINDOW_WEIGHT) as Array<[TimeWindow, number]>).reduce(
    (sum, [window, weight]) => sum + (probabilities[window] ?? 0) * weight,
    0,
  );
}

function createFactor(
  id: string,
  label: string,
  detail: string,
  points: number,
  maxPoints: number,
  source: PriorityFactor["source"],
): PriorityFactor {
  return { id, label, detail, points: round(points), maxPoints, source };
}

export function computePriority(
  input: MailInput,
  analysis: DecisionAnalysis,
  now = new Date(),
): PriorityDecision {
  const answers = analysis.answers;
  const receivedAt = new Date(input.receivedAt).getTime();
  const ageHours = Math.max(0, (now.getTime() - receivedAt) / 3_600_000);
  const slaProgress = Math.min(ageHours / Math.max(input.slaHours, 1), 1);
  const timePressure = expectedTimePressure(answers.time_window.probabilities);
  const impactNormalized = Math.min(Math.max(answers.delay_impact.score / 3, 0), 1);
  const tierPoints = TIER_POINTS[input.accountTier];

  const factors: PriorityFactor[] = [
    createFactor(
      "reply",
      "Reply required",
      `${Math.round(answers.reply_required.noul * 100)}% probability`,
      answers.reply_required.noul * 15,
      15,
      "jev",
    ),
    createFactor(
      "action",
      "Internal action",
      `${Math.round(answers.action_required.noul * 100)}% probability`,
      answers.action_required.noul * 15,
      15,
      "jev",
    ),
    createFactor(
      "blocked",
      "Customer blocked",
      `${Math.round(answers.customer_blocked.noul * 100)}% probability`,
      answers.customer_blocked.noul * 18,
      18,
      "jev",
    ),
    createFactor(
      "follow-up",
      "Repeated follow-up",
      `${Math.round(answers.is_follow_up.noul * 100)}% probability`,
      answers.is_follow_up.noul * 10,
      10,
      "jev",
    ),
    createFactor(
      "time-window",
      "Time pressure",
      answers.time_window.choice.replaceAll("_", " "),
      timePressure * 12,
      12,
      "jev",
    ),
    createFactor(
      "delay-impact",
      "Delay impact",
      `${round(answers.delay_impact.score)} / 3`,
      impactNormalized * 15,
      15,
      "jev",
    ),
    createFactor(
      "sla",
      "SLA consumption",
      `${round(ageHours)}h of ${input.slaHours}h`,
      slaProgress * 10,
      10,
      "metadata",
    ),
    createFactor(
      "account-tier",
      "Account tier",
      input.accountTier,
      tierPoints,
      5,
      "metadata",
    ),
  ];

  const score = Math.min(
    100,
    Math.round(factors.reduce((sum, factor) => sum + factor.points, 0)),
  );
  const reviewReasons: string[] = [];

  if (answers.department.confidence < 0.45) {
    reviewReasons.push("Department routing is not decisive");
  }

  if (
    (isAmbiguousProbability(answers.reply_required.noul) ||
      isAmbiguousProbability(answers.action_required.noul)) &&
    answers.delay_impact.score >= 1.5
  ) {
    reviewReasons.push("Response duty is uncertain for a consequential message");
  }

  const legalOrSecurity = Math.max(
    answers.sensitivity.probabilities.legal ?? 0,
    answers.sensitivity.probabilities.security ?? 0,
  );
  if (legalOrSecurity >= 0.6) {
    reviewReasons.push("Legal or security-sensitive content needs human review");
  }

  const manualReview = reviewReasons.length > 0;
  let nextAction = "Review response duty";

  if (manualReview) {
    nextAction = "Manual triage";
  } else if (answers.reply_required.noul < 0.35 && answers.action_required.noul < 0.35) {
    nextAction = "Archive as information";
  } else if (answers.reply_required.noul >= 0.65 && answers.action_required.noul >= 0.65) {
    nextAction = "Assign and reply";
  } else if (answers.action_required.noul >= 0.65) {
    nextAction = "Assign for action";
  } else if (answers.reply_required.noul >= 0.65) {
    nextAction = "Reply";
  }

  return {
    score,
    bucket: bucketFor(score),
    manualReview,
    reviewReasons,
    nextAction,
    factors: factors.toSorted((a, b) => b.points - a.points),
    policyVersion: PRIORITY_POLICY_VERSION,
  };
}

export function rankInbox(messages: EvaluatedMail[]) {
  return messages.toSorted((left, right) => {
    const priorityDifference = right.priority.score - left.priority.score;
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime();
  });
}
