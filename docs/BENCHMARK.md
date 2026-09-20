# Benchmark

MailOrdinal compares three semantic-decision approaches on the same fixed corpus of 200 synthetic enterprise emails. Ground-truth labels are defined in source before inference. Every provider produces the same nine signals; the same deterministic 100-point priority policy consumes them.

## Results

| Provider            | Routing accuracy | Reply accuracy | Action accuracy | Priority MAE | Critical false negatives | Mean latency |
| ------------------- | ---------------: | -------------: | --------------: | -----------: | -----------------------: | -----------: |
| Deterministic rules |            60.5% |          62.0% |           58.5% |        19.01 |                       40 |       0.0 ms |
| General 3B LLM      |            77.5% |          24.0% |           84.0% |        13.03 |                       28 |   18502.6 ms |
| Jev 1.13            |            97.0% |         100.0% |           95.0% |         9.22 |                       22 |     313.8 ms |

## Corpus

- 80 clear operational emails
- 50 ambiguous or cross-functional emails
- 30 unresolved follow-ups
- 20 critical legal, security, finance, or outage cases
- 20 adversarial, contradictory, long-thread, or multilingual stress cases

## Interpretation

The strongest verified headline is **97.0% routing accuracy for Jev across all 200 cases**. Jev also reached 100.0% on reply duty and 95.0% on action duty. This is not a claim of 95% accuracy on every dimension: message type, blockage, time-window, and sensitivity remain separate measurements in the machine-readable results.

The benchmark is synthetic and repository-specific. It is evidence about this fixed test design, not a universal provider benchmark. The local LLM latency includes four concurrent requests on the benchmark machine and is not a cloud-service speed comparison.

## Reproduce

```bash
npm run benchmark                 # deterministic baseline
npm run benchmark:live            # rules + Jev + configured OpenAI-compatible LLM
npm run benchmark:report          # score existing prediction files
```

Raw generated runs are ignored by Git because they may be large. The compact checked-in result is [benchmark-results.json](./benchmark-results.json).
