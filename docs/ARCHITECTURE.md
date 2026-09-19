# Architecture

## Objective

MailOrdinal turns an unstructured enterprise email into a ranked, inspectable work item.
The architecture prevents a probabilistic model from owning final operational policy.

## End-to-end flow

```text
Browser form or future mailbox connector
                 │
                 ▼
        POST /api/analyze
  size · origin · rate · schema checks
                 │
                 ▼
        DecisionProvider adapter
          ├── Jev live mode
          └── labelled demo mode
                 │
                 ▼
      strict typed response validation
                 │
                 ▼
        deterministic policy engine
    model signals + SLA + account tier
                 │
                 ▼
   ranked queue + review lane + factor ledger
```

## Responsibility boundaries

### Decision provider

The provider judges bounded semantic questions. It does not generate replies, mutate a
mailbox, assign users, or calculate the final rank. All questions share one state and are
submitted together.

The application supports two implementations:

- `analyzeWithJev`: server-only adapter for TypeSafe's documented System One endpoint.
- `analyzeWithDemoPolicy`: deterministic local policy for public demonstrations and tests.

Every analysis includes a `source` discriminator. Demo output cannot be confused with
live model inference.

### Validation boundary

Provider output is untrusted external input. `src/lib/jev/schema.ts` validates:

- all nine required answers;
- the exact primitive for each question;
- declared Choice options;
- probability ranges and approximate sum;
- Score levels, legends, and range;
- provider usage metadata.

Unexpected output fails closed and never enters the policy engine.

### Policy engine

`computePriority` is a pure function. It consumes validated semantic signals plus exact
metadata and returns:

- a 0–100 priority score;
- a named priority bucket;
- a sorted factor ledger;
- manual-review reasons;
- the next operational action.

The policy is separately versioned (`mailordinal-priority-v1`) so historical decisions can
be tied to the rules that produced them.

### User interface

The UI presents three layers independently:

1. Original email state.
2. Provider judgments and probability distributions.
3. Deterministic ranking factors and review rules.

This avoids the common anti-pattern of presenting a generated explanation as evidence for
the model's own decision.

## Why one provider call

The questions are logically staged but physically batched. The policy first considers reply
and action duty, then routing, then consequence signals. Sending all questions together
avoids repeated state transmission and multiple network round trips. Irrelevant answers can
be ignored by policy code.

A future two-stage cascade is justified only if measurement shows that a very large share
of messages can be safely rejected by a cheap first gate.

## Failure behavior

- Invalid browser input: `400`, no provider call.
- Cross-origin browser call: `403`.
- Oversized body: `413`.
- Rate limit exceeded: `429`.
- Provider rate limit: bounded retries, then `429`.
- Provider overload or invalid response: `502`.
- Live mode without credentials: `503`.
- Any uncertain important message: visible human-review lane.

No failure path mutates an email system in the current repository.

## Evolution into a selection backbone

Email is one candidate type. The stable architecture is:

```text
candidate state → typed judgments → validated signals → policy → ranked selection
```

New verticals can supply their own question set and policy while retaining the provider,
validation, observability, review, and UI patterns. Likely extensions include security
alerts, procurement exceptions, support tickets, claims, access requests, and application
review.
