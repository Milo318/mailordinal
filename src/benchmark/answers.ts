import type {
  ChoiceAnswer,
  Department,
  MailDecisionAnswers,
  MessageType,
  ScoreAnswer,
  Sensitivity,
  TimeWindow,
} from "@/domain/mail";
import {
  DEPARTMENTS,
  MESSAGE_TYPES,
  SENSITIVITY_LEVELS,
  TIME_WINDOWS,
} from "@/domain/mail";
import type { GoldDecision } from "@/benchmark/types";

export function choiceAnswer<T extends string>(
  options: readonly T[],
  selected: T,
  confidence = 1,
): ChoiceAnswer<T> {
  const remainder = options.length > 1 ? (1 - confidence) / (options.length - 1) : 0;
  return {
    type: "choice",
    choice: selected,
    confidence,
    probabilities: Object.fromEntries(
      options.map((option) => [option, option === selected ? confidence : remainder]),
    ) as Record<T, number>,
  };
}

export function scoreAnswer(score: number, confidence = 1): ScoreAnswer {
  const rounded = Math.min(3, Math.max(0, Math.round(score)));
  return {
    type: "score",
    score,
    confidence,
    legend: { "0": "None", "1": "Minor", "2": "Meaningful", "3": "Critical" },
    probabilities: Object.fromEntries(
      [0, 1, 2, 3].map((level) => [String(level), level === rounded ? 1 : 0]),
    ),
  };
}

export function answersFromGold(gold: GoldDecision): MailDecisionAnswers {
  return {
    department: choiceAnswer<Department>(DEPARTMENTS, gold.department),
    reply_required: { type: "noul", noul: Number(gold.replyRequired) },
    action_required: { type: "noul", noul: Number(gold.actionRequired) },
    message_type: choiceAnswer<MessageType>(MESSAGE_TYPES, gold.messageType),
    customer_blocked: { type: "noul", noul: Number(gold.customerBlocked) },
    is_follow_up: { type: "noul", noul: Number(gold.isFollowUp) },
    time_window: choiceAnswer<TimeWindow>(TIME_WINDOWS, gold.timeWindow),
    delay_impact: scoreAnswer(gold.delayImpact),
    sensitivity: choiceAnswer<Sensitivity>(SENSITIVITY_LEVELS, gold.sensitivity),
  };
}
