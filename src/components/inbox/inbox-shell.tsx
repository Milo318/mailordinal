"use client";

import { useMemo, useState } from "react";
import { Filter, Plus, Search, Sparkles } from "lucide-react";

import { AnalyzeDialog } from "@/components/inbox/analyze-dialog";
import { DecisionInspector } from "@/components/inbox/decision-inspector";
import { MailList } from "@/components/inbox/mail-list";
import { Sidebar } from "@/components/inbox/sidebar";
import { DEPARTMENT_LABELS, type Department, type EvaluatedMail } from "@/domain/mail";
import { rankInbox } from "@/domain/priority-policy";
import type { ProviderMode } from "@/lib/jev/runtime";

interface InboxShellProps {
  initialMessages: EvaluatedMail[];
  provider: { mode: ProviderMode; ready: boolean; model: string };
}

type QueueFilter = Department | "all" | "review";

export function InboxShell({ initialMessages, provider }: InboxShellProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [activeDepartment, setActiveDepartment] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessages[0]?.id ?? null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matching = messages.filter((mail) => {
      const matchesQueue =
        activeDepartment === "all" ||
        (activeDepartment === "review" && mail.priority.manualReview) ||
        mail.analysis.answers.department.choice === activeDepartment;
      const matchesSearch =
        !normalizedSearch ||
        `${mail.senderName} ${mail.company} ${mail.subject} ${mail.body}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesQueue && matchesSearch;
    });
    return rankInbox(matching);
  }, [activeDepartment, messages, search]);

  const effectiveSelectedId = filteredMessages.some((mail) => mail.id === selectedId)
    ? selectedId
    : (filteredMessages[0]?.id ?? null);
  const selectedMail =
    messages.find((message) => message.id === effectiveSelectedId) ?? null;

  const criticalCount = messages.filter(
    (mail) => mail.priority.bucket === "critical",
  ).length;
  const replyCount = messages.filter(
    (mail) => mail.analysis.answers.reply_required.noul >= 0.65,
  ).length;
  const reviewCount = messages.filter((mail) => mail.priority.manualReview).length;

  function handleCreated(mail: EvaluatedMail) {
    setMessages((current) => rankInbox([mail, ...current]));
    setSelectedId(mail.id);
    setActiveDepartment("all");
  }

  const viewTitle =
    activeDepartment === "all"
      ? "Smart queue"
      : activeDepartment === "review"
        ? "Manual review"
        : DEPARTMENT_LABELS[activeDepartment];

  return (
    <main className="app-shell">
      <Sidebar
        messages={messages}
        activeDepartment={activeDepartment}
        onDepartmentChange={setActiveDepartment}
        providerMode={provider.mode}
      />

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Enterprise selection system</span>
            <h1>{viewTitle}</h1>
            <p>Every message is ranked by policy, not by arrival time.</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setDialogOpen(true)}
          >
            <Plus aria-hidden="true" size={18} />
            Analyze email
          </button>
        </header>

        <div className="architecture-strip">
          <div>
            <Sparkles aria-hidden="true" size={16} />
            <strong>Typed judgments</strong>
            <span>9 parallel signals</span>
          </div>
          <i aria-hidden="true" />
          <div>
            <strong>Deterministic policy</strong>
            <span>100-point transparent rank</span>
          </div>
          <i aria-hidden="true" />
          <div>
            <strong>Confidence-aware queue</strong>
            <span>Uncertainty routes to review</span>
          </div>
        </div>

        <section className="queue-metrics" aria-label="Queue metrics">
          <div>
            <span>Open queue</span>
            <strong>{messages.length}</strong>
          </div>
          <div>
            <span>Critical</span>
            <strong>{criticalCount}</strong>
          </div>
          <div>
            <span>Reply expected</span>
            <strong>{replyCount}</strong>
          </div>
          <div>
            <span>Needs review</span>
            <strong>{reviewCount}</strong>
          </div>
        </section>

        <div className="queue-toolbar">
          <label className="search-field">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">Search messages</span>
            <input
              type="search"
              placeholder="Search sender, company or content"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <span className="filter-status">
            <Filter aria-hidden="true" size={15} />
            {filteredMessages.length} ranked messages
          </span>
        </div>

        <div className="decision-workspace">
          <section className="queue-panel" aria-label={viewTitle}>
            <MailList
              messages={filteredMessages}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
            />
          </section>
          <DecisionInspector mail={selectedMail} />
        </div>
      </section>

      <AnalyzeDialog
        open={dialogOpen}
        provider={provider}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </main>
  );
}
