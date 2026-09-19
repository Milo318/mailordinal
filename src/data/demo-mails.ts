import { createEvaluatedMail } from "@/domain/evaluate-mail";
import type { AccountTier, EvaluatedMail, MailInput } from "@/domain/mail";
import { rankInbox } from "@/domain/priority-policy";
import { analyzeWithDemoPolicy } from "@/lib/jev/demo-provider";

interface DemoSeed {
  id: string;
  minutesAgo: number;
  accountTier: AccountTier;
  slaHours: number;
  threadDepth: number;
  senderName: string;
  senderEmail: string;
  company: string;
  subject: string;
  body: string;
}

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: "mail-production-sso",
    minutesAgo: 42,
    accountTier: "strategic",
    slaHours: 2,
    threadDepth: 4,
    senderName: "Elena Rossi",
    senderEmail: "elena.rossi@northstar.example",
    company: "Northstar Systems",
    subject: "Production SSO outage — 240 employees blocked",
    body: "Our SSO integration has been down since 08:10 CET and all 240 employees are blocked from signing in. This is affecting production operations. Please escalate immediately and confirm who owns the incident today.",
  },
  {
    id: "mail-enterprise-quote",
    minutesAgo: 78,
    accountTier: "enterprise",
    slaHours: 8,
    threadDepth: 1,
    senderName: "Marcus Chen",
    senderEmail: "marcus.chen@arcadia.example",
    company: "Arcadia Logistics",
    subject: "Quote request for 300 seats by Friday",
    body: "We are evaluating a 300-seat rollout across Germany and the Netherlands. Could you send pricing, security documentation, and an implementation timeline by Friday? Our procurement committee meets next week.",
  },
  {
    id: "mail-bank-details",
    minutesAgo: 118,
    accountTier: "growth",
    slaHours: 12,
    threadDepth: 2,
    senderName: "Daniel Weber",
    senderEmail: "accounts@verdant-supply.example",
    company: "Verdant Supply",
    subject: "Urgent: updated bank details for invoice 4819",
    body: "Please use the new bank account in the attached notice for invoice 4819 and confirm the change today. The former account must not be used for the scheduled payment.",
  },
  {
    id: "mail-refund-follow-up",
    minutesAgo: 310,
    accountTier: "enterprise",
    slaHours: 12,
    threadDepth: 5,
    senderName: "Sofia Martins",
    senderEmail: "sofia@luma-retail.example",
    company: "Luma Retail",
    subject: "Following up again on the unresolved refund",
    body: "I am following up again because we still have not received the agreed refund or an update. Our finance team cannot close the month until this is resolved. Please let us know what is happening.",
  },
  {
    id: "mail-dpa-review",
    minutesAgo: 190,
    accountTier: "strategic",
    slaHours: 24,
    threadDepth: 3,
    senderName: "Nora Klein",
    senderEmail: "privacy@meridian-health.example",
    company: "Meridian Health",
    subject: "DPA clause review before procurement approval",
    body: "Our privacy counsel added comments to the data processing agreement. We need written approval of clauses 6 and 9 before procurement can authorize the purchase this week.",
  },
  {
    id: "mail-candidate",
    minutesAgo: 265,
    accountTier: "standard",
    slaHours: 48,
    threadDepth: 1,
    senderName: "Amira Haddad",
    senderEmail: "amira.haddad@example.com",
    company: "Independent",
    subject: "Application for Senior Product Engineer",
    body: "Hello People Team, please find my application for the Senior Product Engineer role. Could you confirm that the portfolio attachment was received successfully?",
  },
  {
    id: "mail-partnership",
    minutesAgo: 510,
    accountTier: "growth",
    slaHours: 72,
    threadDepth: 1,
    senderName: "Owen Brooks",
    senderEmail: "owen@harbor-api.example",
    company: "Harbor API",
    subject: "Potential integration partnership",
    body: "We operate an identity API used by several shared customers and would like to explore an integration partnership. Would your partnerships team be open to a short introductory call this month?",
  },
  {
    id: "mail-newsletter",
    minutesAgo: 22,
    accountTier: "standard",
    slaHours: 72,
    threadDepth: 1,
    senderName: "Industry Briefing",
    senderEmail: "digest@industry-briefing.example",
    company: "Industry Briefing",
    subject: "September operations digest",
    body: "This month's operations digest covers procurement trends, service benchmarks, and upcoming industry events. You are receiving this because your organization subscribed to the briefing.",
  },
];

function toInput(seed: DemoSeed, now: Date): MailInput {
  return {
    senderName: seed.senderName,
    senderEmail: seed.senderEmail,
    company: seed.company,
    subject: seed.subject,
    body: seed.body,
    receivedAt: new Date(now.getTime() - seed.minutesAgo * 60_000).toISOString(),
    accountTier: seed.accountTier,
    slaHours: seed.slaHours,
    threadDepth: seed.threadDepth,
  };
}

export function createDemoInbox(now = new Date()): EvaluatedMail[] {
  const messages = DEMO_SEEDS.map((seed) => {
    const input = toInput(seed, now);
    const analysis = analyzeWithDemoPolicy(input, now);
    return createEvaluatedMail(seed.id, input, analysis, now);
  });
  return rankInbox(messages);
}
