# Contributing

Thank you for helping improve MailOrdinal.

## Before opening a pull request

1. Create a focused branch.
2. Keep model judgments separate from deterministic business policy.
3. Never add credentials, real customer email, provider output from private data, or
   copyrighted mailbox fixtures.
4. Add or update tests for policy, schema, and provider-contract changes.
5. Run `npm run quality`.
6. Update the relevant document when changing questions, thresholds, data flow, or risk.

## Architectural invariants

- The browser never receives provider credentials.
- Provider output is validated before entering domain logic.
- Uncertainty does not silently reduce operational importance.
- Demo decisions remain distinguishable from live provider decisions.
- Exact arithmetic and business policy stay in code.
- External side effects require explicit authorization and a separate adapter.

## Commit and pull-request scope

Prefer small commits with imperative subjects. A pull request should explain:

- the user problem;
- the changed data flow;
- new failure behavior;
- verification evidence;
- security, privacy, and calibration impact.

By contributing, you agree that your contribution is licensed under the repository's MIT
License.
