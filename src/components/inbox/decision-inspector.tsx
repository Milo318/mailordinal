import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  Clock3,
  CornerUpLeft,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  DEPARTMENT_LABELS,
  MESSAGE_TYPE_LABELS,
  SENSITIVITY_LABELS,
  TIME_WINDOW_LABELS,
  type Department,
  type EvaluatedMail,
} from "@/domain/mail";
import { SignalMeter } from "@/components/inbox/signal-meter";

interface DecisionInspectorProps {
  mail: EvaluatedMail | null;
}

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function providerLabel(mail: EvaluatedMail) {
  return mail.analysis.source === "jev"
    ? `Jev · ${mail.analysis.model}`
    : "Local demo policy";
}

export function DecisionInspector({ mail }: DecisionInspectorProps) {
  if (!mail) {
    return (
      <aside className="inspector inspector--empty">
        <GitBranch aria-hidden="true" size={25} />
        <strong>Select a message to inspect its decision graph.</strong>
        <p>Model signals and deterministic policy remain visible as separate layers.</p>
      </aside>
    );
  }

  const answers = mail.analysis.answers;
  const departmentDistribution = (
    Object.entries(answers.department.probabilities) as Array<[Department, number]>
  ).toSorted((left, right) => right[1] - left[1]);

  return (
    <aside className="inspector" aria-label="Email decision details">
      <div className="inspector__topline">
        <span className={`source-badge source-badge--${mail.analysis.source}`}>
          <Sparkles aria-hidden="true" size={13} />
          {providerLabel(mail)}
        </span>
        <span>{mail.company}</span>
      </div>

      <div className="inspector__heading">
        <div>
          <p>
            {mail.senderName} · {mail.senderEmail}
          </p>
          <h2>{mail.subject}</h2>
        </div>
        <div className={`score-orb score-orb--${mail.priority.bucket}`}>
          <strong>{mail.priority.score}</strong>
          <span>priority</span>
        </div>
      </div>

      <div className="decision-chain" aria-label="Decision architecture">
        <span>Typed signals</span>
        <ArrowRight aria-hidden="true" size={14} />
        <span>
          Policy {mail.priority.policyVersion.replace("mailordinal-priority-", "")}
        </span>
        <ArrowRight aria-hidden="true" size={14} />
        <strong>#{mail.priority.score} rank score</strong>
      </div>

      <section className="decision-summary">
        <div className="decision-summary__item">
          <span>Owner</span>
          <strong>{DEPARTMENT_LABELS[answers.department.choice]}</strong>
          <small>{percentage(answers.department.confidence)} routing confidence</small>
        </div>
        <div className="decision-summary__item">
          <span>Message role</span>
          <strong>{MESSAGE_TYPE_LABELS[answers.message_type.choice]}</strong>
          <small>{percentage(answers.message_type.confidence)} confidence</small>
        </div>
        <div className="decision-summary__item">
          <span>Next action</span>
          <strong>{mail.priority.nextAction}</strong>
          <small>{TIME_WINDOW_LABELS[answers.time_window.choice]}</small>
        </div>
        <div className="decision-summary__item">
          <span>Sensitivity</span>
          <strong>{SENSITIVITY_LABELS[answers.sensitivity.choice]}</strong>
          <small>{percentage(answers.sensitivity.confidence)} confidence</small>
        </div>
      </section>

      {mail.priority.manualReview ? (
        <div className="review-notice">
          <AlertTriangle aria-hidden="true" size={18} />
          <div>
            <strong>Human review required</strong>
            {mail.priority.reviewReasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="review-notice review-notice--clear">
          <CheckCircle2 aria-hidden="true" size={18} />
          <div>
            <strong>Policy can route this message</strong>
            <span>No configured review condition was triggered.</span>
          </div>
        </div>
      )}

      <section className="inspector-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Semantic decision layer</span>
            <h3>Atomic semantic signals</h3>
          </div>
          <span className="section-icon">
            <ShieldCheck aria-hidden="true" size={17} />
          </span>
        </div>
        <div className="signal-grid">
          <SignalMeter label="Reply required" value={answers.reply_required.noul} />
          <SignalMeter
            label="Internal action"
            value={answers.action_required.noul}
            tone="blue"
          />
          <SignalMeter
            label="Customer blocked"
            value={answers.customer_blocked.noul}
            tone="amber"
          />
          <SignalMeter
            label="Repeated follow-up"
            value={answers.is_follow_up.noul}
            tone="neutral"
          />
        </div>
      </section>

      <section className="inspector-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Selection space</span>
            <h3>Department distribution</h3>
          </div>
          <span className="section-icon">
            <GitBranch aria-hidden="true" size={17} />
          </span>
        </div>
        <div className="distribution-list">
          {departmentDistribution.map(([department, probability]) => (
            <SignalMeter
              key={department}
              label={DEPARTMENT_LABELS[department]}
              value={probability}
              tone={department === answers.department.choice ? "lime" : "neutral"}
            />
          ))}
        </div>
      </section>

      <section className="inspector-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Deterministic layer</span>
            <h3>Why this mail ranks here</h3>
          </div>
          <span className="section-icon">
            <Clock3 aria-hidden="true" size={17} />
          </span>
        </div>
        <div className="factor-list">
          {mail.priority.factors.map((factor) => (
            <div className="factor" key={factor.id}>
              <div className="factor__topline">
                <div>
                  <strong>{factor.label}</strong>
                  <span>{factor.detail}</span>
                </div>
                <b>
                  +{factor.points} <small>/ {factor.maxPoints}</small>
                </b>
              </div>
              <div className="factor__track">
                <span style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="message-body">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Source state</span>
            <h3>Message content</h3>
          </div>
          {answers.reply_required.noul >= 0.65 ? (
            <span className="reply-indicator">
              <CornerUpLeft aria-hidden="true" size={14} />
              Reply expected
            </span>
          ) : null}
        </div>
        <p>{mail.body}</p>
      </section>

      <details className="raw-decision">
        <summary>
          <Braces aria-hidden="true" size={16} />
          Inspect typed decision payload
        </summary>
        <pre>{JSON.stringify(mail.analysis, null, 2)}</pre>
      </details>
    </aside>
  );
}
