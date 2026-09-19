# Jev integration

## Role in MailOrdinal

Jev is used as a typed semantic decision provider. It does not write email, generate a
summary, decide the final priority, or perform an external action.

MailOrdinal sends one structured `state` with nine questions to the documented endpoint:

```text
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <TYPESAFE_API_KEY>
Content-Type: application/json
```

The request uses:

- `model`: configurable through `TYPESAFE_MODEL`;
- `state`: sender, message, thread, account tier, current time, and SLA metadata;
- `questions`: the fixed map in `src/domain/questions.ts`.

Official references:

- [API reference](https://docs.typesafe.ai/api)
- [Models and aliases](https://docs.typesafe.ai/models)
- [Noul](https://docs.typesafe.ai/primitives/noul)
- [Choice](https://docs.typesafe.ai/primitives/choice)
- [Score](https://docs.typesafe.ai/primitives/score)

## Why direct server-side HTTP

The adapter intentionally uses a small direct `fetch` boundary:

- the complete wire contract is visible in one file;
- no provider code enters the client bundle;
- response validation is controlled by the application;
- retry behavior is bounded and testable;
- the SDK can be adopted later without changing domain or policy modules.

## Retry and timeout behavior

- hard timeout: 20 seconds;
- retryable status codes: `429` and `529`;
- maximum retries: 2;
- `retry-after` is honored within a bounded delay;
- malformed successful responses fail closed as `502`.

## Model aliases and pinning

The default is `jev-latest` for development. An alias can move to a newer release. Once a
team has calibrated thresholds and accepted behavior, set `TYPESAFE_MODEL` to the versioned
model identifier returned by the API and upgrade deliberately.

## Data boundary

Live mode sends the normalized email state to TypeSafe AI. MailOrdinal does not send:

- the API key to the browser;
- attachments or binary content;
- hidden browser data;
- messages other than the explicit current/thread state.

Before processing real enterprise data, review TypeSafe AI's current customer agreement,
privacy policy, data-processing terms, retention options, regional requirements, and any
necessary enterprise controls. MailOrdinal's MIT license does not grant access to or rights
in the provider service.

## Brand boundary

MailOrdinal is the product name. “Jev” and “TypeSafe AI” appear only as factual references
to a compatible third-party integration. The project does not use TypeSafe branding,
logos, trade dress, endorsement claims, or published performance benchmarks.
