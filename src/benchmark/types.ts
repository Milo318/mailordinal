import type {
  Department,
  MailDecisionAnswers,
  MailInput,
  MessageType,
  Sensitivity,
  TimeWindow,
} from "@/domain/mail";

export const BENCHMARK_SEGMENTS = [
  "clear",
  "ambiguous",
  "follow_up",
  "critical",
  "stress",
] as const;

export type BenchmarkSegment = (typeof BENCHMARK_SEGMENTS)[number];

export interface GoldDecision {
  department: Department;
  replyRequired: boolean;
  actionRequired: boolean;
  messageType: MessageType;
  customerBlocked: boolean;
  isFollowUp: boolean;
  timeWindow: TimeWindow;
  delayImpact: 0 | 1 | 2 | 3;
  sensitivity: Sensitivity;
}

export interface BenchmarkCase {
  id: string;
  segment: BenchmarkSegment;
  input: MailInput;
  gold: GoldDecision;
}

export interface BenchmarkPrediction {
  caseId: string;
  provider: string;
  model: string;
  answers: MailDecisionAnswers;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export interface BenchmarkMetrics {
  provider: string;
  cases: number;
  failures: number;
  departmentAccuracy: number;
  replyAccuracy: number;
  actionAccuracy: number;
  messageTypeAccuracy: number;
  blockedAccuracy: number;
  followUpAccuracy: number;
  timeWindowAccuracy: number;
  sensitivityAccuracy: number;
  delayImpactMae: number;
  priorityMae: number;
  criticalFalseNegatives: number;
  top20Recall: number;
  binaryBrierScore: number;
  meanLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
}
