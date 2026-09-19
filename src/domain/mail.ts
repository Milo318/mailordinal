export const DEPARTMENTS = [
  "sales",
  "support",
  "finance",
  "people",
  "legal",
  "partnerships",
  "general",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  sales: "Sales",
  support: "Support",
  finance: "Finance",
  people: "People",
  legal: "Legal",
  partnerships: "Partnerships",
  general: "General",
};

export const MESSAGE_TYPES = [
  "question",
  "request",
  "complaint",
  "follow_up",
  "information",
  "approval",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  question: "Question",
  request: "Request",
  complaint: "Complaint",
  follow_up: "Follow-up",
  information: "Information",
  approval: "Approval",
};

export const TIME_WINDOWS = [
  "immediate",
  "within_24h",
  "this_week",
  "none",
  "unclear",
] as const;

export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  immediate: "Immediate",
  within_24h: "Within 24 hours",
  this_week: "This week",
  none: "No stated window",
  unclear: "Unclear",
};

export const SENSITIVITY_LEVELS = [
  "normal",
  "financial",
  "legal",
  "security",
  "personal_data",
] as const;

export type Sensitivity = (typeof SENSITIVITY_LEVELS)[number];

export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  normal: "Normal",
  financial: "Financial",
  legal: "Legal",
  security: "Security",
  personal_data: "Personal data",
};

export const ACCOUNT_TIERS = ["strategic", "enterprise", "growth", "standard"] as const;
export type AccountTier = (typeof ACCOUNT_TIERS)[number];

export const ACCOUNT_TIER_LABELS: Record<AccountTier, string> = {
  strategic: "Strategic",
  enterprise: "Enterprise",
  growth: "Growth",
  standard: "Standard",
};

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ChoiceAnswer<TChoice extends string> {
  type: "choice";
  choice: TChoice;
  confidence: number;
  probabilities: Record<TChoice, number>;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}

export interface MailDecisionAnswers {
  department: ChoiceAnswer<Department>;
  reply_required: NoulAnswer;
  action_required: NoulAnswer;
  message_type: ChoiceAnswer<MessageType>;
  customer_blocked: NoulAnswer;
  is_follow_up: NoulAnswer;
  time_window: ChoiceAnswer<TimeWindow>;
  delay_impact: ScoreAnswer;
  sensitivity: ChoiceAnswer<Sensitivity>;
}

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface DecisionAnalysis {
  source: "jev" | "demo";
  model: string;
  evaluatedAt: string;
  answers: MailDecisionAnswers;
  usage: ProviderUsage;
}

export interface MailInput {
  senderName: string;
  senderEmail: string;
  company: string;
  subject: string;
  body: string;
  receivedAt: string;
  accountTier: AccountTier;
  slaHours: number;
  threadDepth: number;
  previousMessages?: string[];
}

export type PriorityBucket = "critical" | "high" | "normal" | "low";

export interface PriorityFactor {
  id: string;
  label: string;
  detail: string;
  points: number;
  maxPoints: number;
  source: "jev" | "metadata";
}

export interface PriorityDecision {
  score: number;
  bucket: PriorityBucket;
  manualReview: boolean;
  reviewReasons: string[];
  nextAction: string;
  factors: PriorityFactor[];
  policyVersion: string;
}

export interface EvaluatedMail extends MailInput {
  id: string;
  preview: string;
  status: "unread" | "review" | "queued";
  analysis: DecisionAnalysis;
  priority: PriorityDecision;
}
