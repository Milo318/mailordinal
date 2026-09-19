# Security and privacy

## Current data lifecycle

The reference app has no database. Synthetic demo messages are created on the server and
newly analyzed messages live only in browser memory for the current page session.

In demo mode, analysis is local to the application server. In live mode, the normalized
message state is sent to TypeSafe AI. See `docs/JEV_INTEGRATION.md` before using real data.

## Implemented controls

- Server-only provider credentials.
- Same-origin browser request check.
- 24 KB request-body ceiling plus field-level bounds.
- Strict request validation before provider access.
- Strict provider-response validation before policy access.
- Bounded provider timeout and retry behavior.
- No raw message logging in application code.
- `Cache-Control: no-store` on analysis responses.
- Basic per-instance request limiting.
- Security response headers for framing, MIME sniffing, referrers, and device permissions.
- Transparent provider source labels.
- Fail-closed behavior for malformed provider output.

## Known limitations

The in-memory rate limiter is not shared across serverless instances. The current app has
no authentication, tenant isolation, persistence, encryption-at-rest layer, mailbox OAuth,
or enterprise audit export. It must not be exposed with a funded provider key on a public
unauthenticated deployment.

## Production requirements

Before connecting a real mailbox:

- require organization authentication and role-based access;
- isolate tenant data and encryption keys;
- use a distributed rate limiter and abuse controls;
- keep mailbox scopes least-privileged and separately revocable;
- define retention, deletion, export, and regional storage policies;
- redact or tokenize data the provider does not need;
- establish a DPA and subprocessors register;
- audit access to message bodies and decisions;
- add incident response and key-rotation procedures;
- measure policy behavior on permissioned, representative data.

## Attachments

The current provider accepts text state and MailOrdinal intentionally excludes attachments.
A production pipeline should virus-scan, type-check, size-limit, extract, and redact allowed
documents before including derived text. Never send an attachment merely because it arrived
with an email.

## Threat-model summary

| Threat                      | Current treatment                                               |
| --------------------------- | --------------------------------------------------------------- |
| API key disclosure          | Key used only in a server module                                |
| Prompt/content injection    | Provider has no tool authority; code accepts only typed answers |
| Invalid model output        | Strict schema rejection                                         |
| Cross-site browser abuse    | Same-origin check                                               |
| Request flooding            | Basic limiter; distributed control required in production       |
| Sensitive email persistence | No repository database; session-only client state               |
| Uncertain automated routing | Explicit review rules                                           |
| Demo/live confusion         | Source discriminator and UI labels                              |
