import { CircleGauge, Inbox, Network, ScanSearch } from "lucide-react";

import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
  type EvaluatedMail,
} from "@/domain/mail";
import type { ProviderMode } from "@/lib/jev/runtime";

interface SidebarProps {
  messages: EvaluatedMail[];
  activeDepartment: Department | "all" | "review";
  onDepartmentChange: (department: Department | "all" | "review") => void;
  providerMode: ProviderMode;
}

export function Sidebar({
  messages,
  activeDepartment,
  onDepartmentChange,
  providerMode,
}: SidebarProps) {
  const reviewCount = messages.filter((mail) => mail.priority.manualReview).length;
  return (
    <aside className="sidebar" aria-label="Inbox navigation">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          M
        </span>
        <div>
          <strong>MailOrdinal</strong>
          <span>Decision inbox</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <p className="nav-label">Workspace</p>
        <button
          className={activeDepartment === "all" ? "nav-item nav-item--active" : "nav-item"}
          type="button"
          onClick={() => onDepartmentChange("all")}
        >
          <Inbox aria-hidden="true" size={17} />
          Smart queue
          <span>{messages.length}</span>
        </button>
        <button
          className={
            activeDepartment === "review" ? "nav-item nav-item--active" : "nav-item"
          }
          type="button"
          onClick={() => onDepartmentChange("review")}
        >
          <ScanSearch aria-hidden="true" size={17} />
          Manual review
          <span>{reviewCount}</span>
        </button>

        <p className="nav-label nav-label--departments">Departments</p>
        {DEPARTMENTS.map((department) => {
          const count = messages.filter(
            (mail) => mail.analysis.answers.department.choice === department,
          ).length;
          return (
            <button
              className={
                activeDepartment === department ? "nav-item nav-item--active" : "nav-item"
              }
              type="button"
              key={department}
              onClick={() => onDepartmentChange(department)}
            >
              <Network aria-hidden="true" size={16} />
              {DEPARTMENT_LABELS[department]}
              <span>{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="provider-card">
        <div className="provider-card__title">
          <CircleGauge aria-hidden="true" size={17} />
          Decision provider
        </div>
        <strong>{providerMode === "jev" ? "Live Jev" : "Transparent demo"}</strong>
        <p>
          {providerMode === "jev"
            ? "Typed model decisions are validated server-side."
            : "Local policy output is labelled and never presented as model inference."}
        </p>
        <span className={`status-dot status-dot--${providerMode}`}>
          {providerMode === "jev" ? "Connected" : "Demo mode"}
        </span>
      </div>
    </aside>
  );
}
