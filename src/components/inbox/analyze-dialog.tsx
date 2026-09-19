"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, LockKeyhole, Sparkles, X } from "lucide-react";

import { ACCOUNT_TIERS, ACCOUNT_TIER_LABELS, type EvaluatedMail } from "@/domain/mail";
import type { ProviderMode } from "@/lib/jev/runtime";

interface AnalyzeDialogProps {
  open: boolean;
  provider: { mode: ProviderMode; ready: boolean; model: string };
  onClose: () => void;
  onCreated: (mail: EvaluatedMail) => void;
}

interface AnalyzeResponse {
  mail?: EvaluatedMail;
  error?: string;
}

export function AnalyzeDialog({ open, provider, onClose, onCreated }: AnalyzeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const request = {
      senderName: String(formData.get("senderName") ?? ""),
      senderEmail: String(formData.get("senderEmail") ?? ""),
      company: String(formData.get("company") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
      receivedAt: new Date().toISOString(),
      accountTier: String(formData.get("accountTier") ?? "standard"),
      slaHours: Number(formData.get("slaHours") ?? 24),
      threadDepth: Number(formData.get("threadDepth") ?? 1),
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const payload = (await response.json()) as AnalyzeResponse;
        if (!response.ok || !payload.mail) {
          throw new Error(payload.error ?? "The email could not be analyzed.");
        }
        onCreated(payload.mail);
        form.reset();
        onClose();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "The email could not be analyzed.",
        );
      }
    });
  }

  return (
    <dialog
      className="analyze-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-header">
        <div>
          <span className="eyebrow">New decision state</span>
          <h2>Analyze an inbound email</h2>
          <p>Nine typed judgments feed one deterministic priority policy.</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" size={19} />
        </button>
      </div>

      <div className={`provider-notice provider-notice--${provider.mode}`}>
        {provider.mode === "jev" ? (
          <Sparkles aria-hidden="true" size={18} />
        ) : (
          <LockKeyhole aria-hidden="true" size={18} />
        )}
        <div>
          <strong>
            {provider.mode === "jev" ? `Live provider · ${provider.model}` : "Demo policy"}
          </strong>
          <span>
            {provider.mode === "jev"
              ? "Message state is sent server-side to TypeSafe AI; the API key never reaches the browser."
              : "No external model call. Output remains explicitly labelled as local demo data."}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="analyze-form">
        <div className="form-grid form-grid--three">
          <label>
            Sender name
            <input name="senderName" required maxLength={120} placeholder="Avery Morgan" />
          </label>
          <label>
            Sender email
            <input
              name="senderEmail"
              required
              type="email"
              maxLength={254}
              placeholder="avery@company.example"
            />
          </label>
          <label>
            Company
            <input name="company" required maxLength={160} placeholder="Atlas Industries" />
          </label>
        </div>

        <label>
          Subject
          <input
            name="subject"
            required
            maxLength={240}
            placeholder="Production access blocked before launch"
          />
        </label>

        <label>
          Email body
          <textarea
            name="body"
            required
            maxLength={12_000}
            rows={7}
            placeholder="Paste the inbound email here…"
          />
        </label>

        <div className="form-grid form-grid--three">
          <label>
            Account tier
            <select name="accountTier" defaultValue="enterprise">
              {ACCOUNT_TIERS.map((tier) => (
                <option value={tier} key={tier}>
                  {ACCOUNT_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </label>
          <label>
            SLA hours
            <input name="slaHours" type="number" min={1} max={720} defaultValue={24} />
          </label>
          <label>
            Thread messages
            <input name="threadDepth" type="number" min={1} max={100} defaultValue={1} />
          </label>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog-actions">
          <p>Raw email content is kept in this browser session only.</p>
          <button
            className="primary-button"
            type="submit"
            disabled={isPending || !provider.ready}
          >
            {isPending ? "Evaluating…" : "Evaluate and rank"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
