import { InboxShell } from "@/components/inbox/inbox-shell";
import { createDemoInbox } from "@/data/demo-mails";
import { getProviderStatus } from "@/lib/jev/runtime";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const now = new Date();
  const messages = createDemoInbox(now);
  const provider = getProviderStatus();

  return <InboxShell initialMessages={messages} provider={provider} />;
}
