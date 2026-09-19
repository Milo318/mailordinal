import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="error-page">
      <div className="error-card">
        <span className="eyebrow">404 · MailOrdinal</span>
        <h1>This queue does not exist.</h1>
        <Link className="primary-button" href="/">
          Return to decision inbox
        </Link>
      </div>
    </main>
  );
}
