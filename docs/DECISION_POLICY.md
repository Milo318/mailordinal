# Decision policy

## Principle

Priority is policy, not a model label. MailOrdinal asks the provider for atomic evidence and
keeps business weighting in deterministic code.

## Version 1 weights

| Factor           | Source              | Maximum | Calculation                                     |
| ---------------- | ------------------- | ------: | ----------------------------------------------- |
| Reply required   | Noul                |      15 | `P(yes) × 15`                                   |
| Internal action  | Noul                |      15 | `P(yes) × 15`                                   |
| Customer blocked | Noul                |      18 | `P(yes) × 18`                                   |
| Follow-up        | Noul                |      10 | `P(yes) × 10`                                   |
| Time window      | Choice distribution |      12 | probability-weighted window severity            |
| Delay impact     | Score               |      15 | normalized score × 15                           |
| SLA consumption  | Metadata            |      10 | elapsed time / SLA, capped at 1                 |
| Account tier     | Metadata            |       5 | strategic 5, enterprise 3, growth 1, standard 0 |

The score is capped at 100.

## Buckets

|  Score | Bucket   |
| -----: | -------- |
| 75–100 | Critical |
|  55–74 | High     |
|  30–54 | Normal   |
|   0–29 | Low      |

Buckets are display and queue-grouping aids. The numeric score provides ordering inside a
bucket. Equal scores place the older message first.

## Time-window expectation

The selected Choice label is not used alone. Policy integrates the whole distribution:

| Window          | Weight |
| --------------- | -----: |
| Immediate       |   1.00 |
| Within 24 hours |   0.82 |
| This week       |   0.35 |
| Unclear         |   0.18 |
| None            |   0.00 |

This preserves model uncertainty instead of collapsing it before policy runs.

## Human-review rules

Human review is an independent dimension, never a score penalty.

A message enters review when:

- department confidence is below `0.45`;
- reply or action duty lies in the ambiguous `0.40–0.60` band while delay impact is at
  least `1.5 / 3`;
- legal or security sensitivity has at least `0.60` probability.

This prevents an uncertain critical message from falling to the bottom of the queue.

## Recommended action

After review rules:

1. Both reply and action below `0.35` → archive as information.
2. Both at or above `0.65` → assign and reply.
3. Only action at or above `0.65` → assign for action.
4. Only reply at or above `0.65` → reply.
5. Anything else → review response duty.

## Calibration before production

The included values are coherent defaults for a reference application, not universal
enterprise policy. A deployment should:

1. collect a representative, permissioned validation set;
2. define false-negative costs per department;
3. compare predicted probabilities with observed outcomes;
4. tune thresholds without changing the evaluation set;
5. pin the provider model version after acceptance;
6. version each policy change and monitor drift.

Do not train a competing model on provider output or publish provider benchmarks without
first checking the provider's current contract.
