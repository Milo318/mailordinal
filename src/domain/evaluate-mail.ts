import type { DecisionAnalysis, EvaluatedMail, MailInput } from "@/domain/mail";
import { computePriority } from "@/domain/priority-policy";

function createPreview(body: string) {
  const compact = body.replaceAll(/\s+/g, " ").trim();
  return compact.length > 132 ? `${compact.slice(0, 129)}…` : compact;
}

export function createEvaluatedMail(
  id: string,
  input: MailInput,
  analysis: DecisionAnalysis,
  now = new Date(),
): EvaluatedMail {
  const priority = computePriority(input, analysis, now);
  return {
    ...input,
    id,
    preview: createPreview(input.body),
    status: priority.manualReview ? "review" : "queued",
    analysis,
    priority,
  };
}
