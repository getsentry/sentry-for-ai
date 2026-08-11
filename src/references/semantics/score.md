# score attributes

Stable Sentry semantic convention attributes for `score`. Generated — do not edit by
hand. Re-run `scripts/gen-semantics.py`.

| Key | Type | Brief |
| --- | --- | --- |
| `score.<key>` | `double` | The weighted performance score for a web vital. This is defined as `score.weight.<key>` * `score.ratio.<key>`. |
| `score.ratio.<key>` | `double` | The score for a web vital, normalized to a number between 0 and 1. |
| `score.total` | `double` | The total performance score of a span. This is the sum of individual weighted web vital scores (see `score.<key>`). |
| `score.weight.<key>` | `double` | The relative weight of a web vital in a span’s performance score. |
