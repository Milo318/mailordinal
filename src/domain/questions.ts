import type { MailInput } from "@/domain/mail";

type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

/**
 * Atomic judgments only. Operational priority is intentionally absent: policy
 * code composes these signals with CRM/SLA metadata instead of asking a model
 * for an opaque final rank.
 */
export const MAIL_DECISION_QUESTIONS = {
  department: {
    type: "choice",
    instructions: "Which team should own the next step for this inbound email?",
    criteria: {
      sales:
        "New business, pricing, quotes, upgrades, procurement, or commercial evaluation",
      support: "Product problems, incidents, bugs, outages, setup, or technical assistance",
      finance:
        "Invoices, payments, refunds, purchase orders, bank details, or account balances",
      people: "Hiring, employment, benefits, workplace, candidates, or employee matters",
      legal:
        "Contracts, privacy, compliance, data processing, disputes, or formal legal notices",
      partnerships:
        "Integration alliances, co-marketing, resellers, vendors, or strategic collaboration",
      general: "Informational or administrative email that does not belong to another team",
    },
  },
  reply_required: {
    type: "noul",
    instructions: "Does the sender reasonably expect a direct reply from the organization?",
    criteria: {
      true: "A question, request, confirmation, decision, acknowledgement, or follow-up requires a reply",
      false:
        "Pure information, automated notice, newsletter, or a message that expects no response",
    },
  },
  action_required: {
    type: "noul",
    instructions: "Does this email require an internal action beyond merely reading it?",
    criteria: {
      true: "Someone must investigate, decide, approve, change, deliver, process, schedule, or route work",
      false:
        "No internal work is required; the message is informational or already resolved",
    },
  },
  message_type: {
    type: "choice",
    instructions: "What operational role does this message play in the thread?",
    criteria: {
      question: "The sender primarily asks for information or clarification",
      request: "The sender asks the organization to perform a concrete action",
      complaint:
        "The sender reports dissatisfaction, harm, failure, or unacceptable service",
      follow_up:
        "The sender is chasing a previous request, promise, or unresolved conversation",
      information:
        "The sender is sharing information without requesting work or a decision",
      approval:
        "The sender asks for authorization, sign-off, consent, or a formal decision",
    },
  },
  customer_blocked: {
    type: "noul",
    instructions: "Is the sender or their organization blocked until we respond or act?",
    criteria: {
      true: "Their work, purchase, access, service, launch, payment, or decision cannot proceed",
      false: "They can continue normally or no dependency on us is described",
    },
  },
  is_follow_up: {
    type: "noul",
    instructions: "Is this a repeated request or follow-up on something still unresolved?",
    criteria: {
      true: "The message references waiting, asking again, a previous promise, or missing progress",
      false: "This is a new request or does not indicate prior unanswered contact",
    },
  },
  time_window: {
    type: "choice",
    instructions:
      "What response or action window is supported by the email's wording and dates?",
    criteria: {
      immediate:
        "Now, immediately, today, production-down, or an equivalent same-day requirement",
      within_24h: "By tomorrow or explicitly within the next 24 hours",
      this_week: "A date or expectation within the current seven-day period",
      none: "No time constraint is stated or implied",
      unclear: "Time pressure exists but the window cannot be placed reliably",
    },
  },
  delay_impact: {
    type: "score",
    instructions:
      "What is the likely business impact if the organization delays handling this email?",
    criteria: [
      "No material impact; informational only",
      "Minor inconvenience or routine delay",
      "Meaningful operational, customer, or commercial impact",
      "Critical outage, legal deadline, security exposure, or substantial financial impact",
    ],
  },
  sensitivity: {
    type: "choice",
    instructions: "Which sensitivity domain most strongly applies to this email?",
    criteria: {
      normal: "Routine business communication without a specialized risk domain",
      financial:
        "Money movement, banking, invoices, refunds, pricing authority, or payment details",
      legal: "Contracts, disputes, formal notices, regulatory duties, or legal commitments",
      security:
        "Credentials, vulnerabilities, incidents, unauthorized access, or security controls",
      personal_data:
        "Personal, applicant, employee, health, identity, or other privacy-sensitive data",
    },
  },
} satisfies Record<string, JevQuestion>;

export function buildDecisionState(input: MailInput, now: Date) {
  return {
    mailbox: "inquiries@company.example",
    evaluated_at: now.toISOString(),
    sender: {
      name: input.senderName,
      email: input.senderEmail,
      company: input.company,
      account_tier: input.accountTier,
    },
    message: {
      subject: input.subject,
      body: input.body,
      received_at: input.receivedAt,
    },
    thread: {
      message_count: input.threadDepth,
      previous_messages: input.previousMessages ?? [],
    },
    operations: {
      response_sla_hours: input.slaHours,
    },
  };
}
