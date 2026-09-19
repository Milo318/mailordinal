"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <div className="error-card">
        <span className="eyebrow">MailOrdinal</span>
        <h1>The decision workspace could not be loaded.</h1>
        <p>No email action was taken. Retry the view or inspect the server logs.</p>
        <button className="primary-button" type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={17} />
          Try again
        </button>
      </div>
    </main>
  );
}
