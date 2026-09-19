import { AlertTriangle, CornerUpLeft, ShieldQuestion } from "lucide-react";

import { DEPARTMENT_LABELS, type EvaluatedMail, type PriorityBucket } from "@/domain/mail";

interface MailListProps {
  messages: EvaluatedMail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const BUCKET_LABELS: Record<PriorityBucket, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

function formatReceivedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function MailList({ messages, selectedId, onSelect }: MailListProps) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <ShieldQuestion aria-hidden="true" size={24} />
        <strong>No messages match this view.</strong>
        <p>Change the department or search query to restore the queue.</p>
      </div>
    );
  }

  return (
    <div className="mail-list" role="list" aria-label="Ranked email queue">
      {messages.map((mail, index) => {
        const answers = mail.analysis.answers;
        return (
          <div role="listitem" key={mail.id}>
            <button
              type="button"
              className={
                selectedId === mail.id ? "mail-card mail-card--selected" : "mail-card"
              }
              onClick={() => onSelect(mail.id)}
            >
              <div className="mail-card__rank" aria-label={`Queue position ${index + 1}`}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="avatar" aria-hidden="true">
                {initials(mail.senderName)}
              </div>
              <div className="mail-card__content">
                <div className="mail-card__meta">
                  <strong>{mail.senderName}</strong>
                  <time dateTime={mail.receivedAt}>
                    {formatReceivedAt(mail.receivedAt)} UTC
                  </time>
                </div>
                <h2>{mail.subject}</h2>
                <p>{mail.preview}</p>
                <div className="mail-card__signals">
                  <span className="department-chip">
                    {DEPARTMENT_LABELS[answers.department.choice]}
                  </span>
                  <span className={`priority-chip priority-chip--${mail.priority.bucket}`}>
                    {BUCKET_LABELS[mail.priority.bucket]} · {mail.priority.score}
                  </span>
                  {answers.reply_required.noul >= 0.65 ? (
                    <span className="signal-chip">
                      <CornerUpLeft aria-hidden="true" size={13} />
                      Reply {Math.round(answers.reply_required.noul * 100)}%
                    </span>
                  ) : null}
                  {mail.priority.manualReview ? (
                    <span className="signal-chip signal-chip--review">
                      <AlertTriangle aria-hidden="true" size={13} />
                      Review
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
