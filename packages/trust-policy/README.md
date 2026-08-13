# @webnotary/trust-policy

Isolatable mapping from internal WebNotary evidence states to the public
`valid` | `unknown` | `conflict` API, plus CT-gate and MVP CONFLICT helpers.

The Chrome extension (0.008) must not embed these rules — it only consumes HTTP.

## Dev policy note

`SINGLE_OBSERVED → valid` is a **development** policy to prove the pipeline.
Production should eventually require multiple independent observers
(`MULTI_OBSERVED` / `ESTABLISHED`). Do not treat single-observer VALID as final.
