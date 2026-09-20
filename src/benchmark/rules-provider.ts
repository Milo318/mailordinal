import type {
  Department,
  MailDecisionAnswers,
  MailInput,
  MessageType,
  Sensitivity,
  TimeWindow,
} from "@/domain/mail";
import {
  DEPARTMENTS,
  MESSAGE_TYPES,
  SENSITIVITY_LEVELS,
  TIME_WINDOWS,
} from "@/domain/mail";
import { choiceAnswer, scoreAnswer } from "@/benchmark/answers";

type PatternMap<T extends string> = Array<[T, RegExp]>;

const departmentRules: PatternMap<Department> = [
  [
    "legal",
    /\b(contract|legal|gdpr|regulator|regulatory|liability|data processing agreement|dpa)\b/i,
  ],
  ["finance", /\b(invoice|payment|refund|bank|iban|balance|payroll|charged)\b/i],
  ["support", /\b(bug|error|outage|production|login|locked out|access|sso|audit logs?)\b/i],
  ["sales", /\b(quote|pricing|upgrade|renewal|proposal|seats?)\b/i],
  ["people", /\b(candidate|interview|employee|salary|benefits|employment|payroll)\b/i],
  ["partnerships", /\b(partnership|co-marketing|joint webinar|alliance|reseller)\b/i],
];

const sensitivityRules: PatternMap<Sensitivity> = [
  [
    "security",
    /\b(password|credential|token|breach|vulnerability|unauthori[sz]ed|attacker|security incident)\b/i,
  ],
  [
    "legal",
    /\b(contract|lawsuit|regulator|regulatory|gdpr|legal|data processing agreement|dpa)\b/i,
  ],
  ["financial", /\b(bank|iban|invoice|refund|payment|payroll|charged|pricing)\b/i],
  [
    "personal_data",
    /\b(passport|medical|candidate|employee data|employment documents|customer records)\b/i,
  ],
];

function textFor(input: MailInput) {
  return [input.subject, input.body, ...(input.previousMessages ?? [])].join("\n");
}

function firstMatch<T extends string>(text: string, rules: PatternMap<T>, fallback: T) {
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? fallback;
}

function yes(text: string, positive: RegExp, negative?: RegExp) {
  if (negative?.test(text)) return 0;
  return positive.test(text) ? 1 : 0;
}

export function analyzeWithRules(input: MailInput): MailDecisionAnswers {
  const text = textFor(input);
  const department = firstMatch(text, departmentRules, "general");
  const sensitivity = firstMatch(text, sensitivityRules, "normal");
  const followUp = yes(
    text,
    /\b(follow(?:ing)? up|still waiting|checking again|reminder|again|previous email|third request)\b/i,
  );
  const blocked = yes(
    text,
    /\b(blocked|cannot (?:work|proceed|sign|close)|can't proceed|locked out|production (?:is )?(?:down|unavailable)|every user|whole team)\b/i,
    /\b(resolved|closed incident|historical)\b/i,
  );
  const reply = yes(
    text,
    /\?|\b(please (?:reply|confirm|update|send|provide|restore|resolve)|let (?:me|us) know|can you|could you|who can|need an update)\b/i,
    /\b(no reply (?:is )?needed|no routine reply|no action or reply)\b/i,
  );
  const action = yes(
    text,
    /\b(fix|send|approve|process|schedule|investigate|restore|resolve|review|sign|revoke|verify|complete|correct|act|provide)\b/i,
    /\b(no action (?:is )?required|no action or reply|resolved|closed incident|for your records)\b/i,
  );

  let timeWindow: TimeWindow = "none";
  if (/\b(now|immediately|today|urgent|asap|production down|critical outage)\b/i.test(text))
    timeWindow = "immediate";
  else if (/\b(tomorrow|within 24 hours?|24h)\b/i.test(text)) timeWindow = "within_24h";
  else if (/\b(friday|this week|next tuesday|within seven days?)\b/i.test(text))
    timeWindow = "this_week";
  if (/\b(resolved last month|closed incident|historical postmortem)\b/i.test(text))
    timeWindow = "none";

  let messageType: MessageType = "information";
  if (followUp) messageType = "follow_up";
  else if (
    /\b(dissatisf|complaint|wrong|missing|charged but|still shows|unavailable)\b/i.test(
      text,
    )
  )
    messageType = "complaint";
  else if (/\b(approve|approval|sign-off|sign the)\b/i.test(text)) messageType = "approval";
  else if (
    /\?|\b(question|clarify|confirm whether|does the product)\b/i.test(text) &&
    !action
  )
    messageType = "question";
  else if (action) messageType = "request";

  let delayImpact = 0;
  if (
    /\b(production|breach|credential|attacker|regulator|payroll|every user|whole team|all customer operations)\b/i.test(
      text,
    )
  )
    delayImpact = 3;
  else if (blocked || sensitivity !== "normal") delayImpact = 2;
  else if (reply || action) delayImpact = 1;
  if (
    /\b(resolved last month|closed incident|for your records; no action|historical postmortem)\b/i.test(
      text,
    )
  )
    delayImpact = 0;

  return {
    department: choiceAnswer(DEPARTMENTS, department),
    reply_required: { type: "noul", noul: reply },
    action_required: { type: "noul", noul: action },
    message_type: choiceAnswer(MESSAGE_TYPES, messageType),
    customer_blocked: { type: "noul", noul: blocked },
    is_follow_up: { type: "noul", noul: followUp },
    time_window: choiceAnswer(TIME_WINDOWS, timeWindow),
    delay_impact: scoreAnswer(delayImpact),
    sensitivity: choiceAnswer(SENSITIVITY_LEVELS, sensitivity),
  };
}
