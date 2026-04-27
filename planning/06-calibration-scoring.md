# 06 — Calibration and Scoring

## Aggregates

### Multiple-choice aggregation

For each option:

- raw vote count
- sum of CF
- sum of CoC-adjusted CF

Outputs:

- raw plurality answer
- CF-weighted answer
- CoC-adjusted answer

### Numeric/scalar aggregation

For numeric answers:

- raw median
- raw mean
- CF-weighted mean
- CoC-adjusted mean

Prototype display should probably show:

- raw team median
- CF-weighted estimate
- CoC-adjusted estimate

Median is useful because a single wild numeric answer can distort an average.

### Mixed play

For prototype, treat each question as one of:

```txt
MULTIPLE_CHOICE
NUMERIC
```

Do not create a generalized answer engine yet.

---

## Scoring

### Multiple-choice scoring

Prototype scoring:

- correct answer: base points
- faster final submission: optional speed bonus
- wrong answer: zero

Suggested:

```txt
score = basePoints + speedBonus
```

Where:

```txt
speedBonus = maxBonus × remainingTimeRatio
```

### Numeric/scalar scoring

Use accuracy bands or percent error.

Suggested:

```txt
error = abs(finalAnswer - correctAnswer)
percentError = error / abs(correctAnswer)
```

Then map to points:

```txt
<= 1% error: full points
<= 5% error: 75%
<= 10% error: 50%
<= 20% error: 25%
> 20% error: 0
```

Speed bonus should be optional for numeric questions because rushing may make the calibration mechanic less interesting.

---

## CoC model

### Design intent

CoC should track calibration bias, not merely correctness.

Use a signed score resembling a correlation-style index:

```txt
CoC bias range = -1.0 to 1.0
```

Where:

```txt
-1.0 = strongly underconfident
 0.0 = well aligned / calibrated
 1.0 = strongly overconfident
```

This is intentionally different from a simple “reliability score.” A player with `CoC = 0.0` is not average; they are aligned. The further they drift from zero, the more the system should interpret their CF as biased.

Good patterns:

- high CF + correct
- low CF + wrong
- medium CF + medium/ambiguous correctness

Interesting pattern:

- low CF + correct: possible hidden signal / underconfidence; future CF defaults and weighting should be nudged upward

Bad pattern:

- high CF + wrong: overconfidence; future CF defaults and weighting should be nudged downward

### Correctness value

Convert every answer into a `correctness` score from `0.0–1.0`.

For multiple-choice:

```txt
correctness = 1.0 if correct, else 0.0
```

For numeric answers, convert error to correctness:

```txt
correctness = max(0, 1 - percentError / tolerance)
```

If tolerance is 20%, then:

- exact answer = 1.0
- 10% off = 0.5
- 20%+ off = 0.0

### Per-round CoC bias

Compare stated confidence to actual correctness:

```txt
roundBias = CF - correctness
```

Interpretation:

```txt
roundBias < 0  => underconfident
roundBias = 0  => aligned
roundBias > 0  => overconfident
```

Examples:

```txt
CF 0.25 + correct answer      => roundBias = -0.75  // underconfident
CF 0.90 + wrong answer        => roundBias =  0.90  // overconfident
CF 0.70 + 70% numeric quality => roundBias =  0.00  // aligned
```

### CoC update

Use an exponential moving average with decay:

```txt
newCoCBias = oldCoCBias × decay + roundBias × learningRate
```

Normalize:

```txt
decay + learningRate = 1
```

Suggested prototype values:

```txt
decay = 0.85
learningRate = 0.15
startingCoCBias = 0.0
minCoCBias = -1.0
maxCoCBias = 1.0
```

The displayed CoC should be humanized as a calibration-bias indicator, not as a “good/bad score.” Example labels:

```txt
-0.60 to -1.00 => very underconfident
-0.25 to -0.59 => underconfident
-0.24 to  0.24 => aligned
 0.25 to  0.59 => overconfident
 0.60 to  1.00 => very overconfident
```

### CF default for the next answer

The next answer’s CF input should default from the player’s running calibration state, not from a static low-confidence default.

Prototype formula:

```txt
baseDefaultCF = player.cfEma || 0.35
suggestedCF = clamp(0.05, 0.95, baseDefaultCF - (player.CoCBias × correctionStrength))
```

Suggested value:

```txt
correctionStrength = 0.25
```

Because positive CoC means overconfidence, subtracting it lowers the suggested CF. Because negative CoC means underconfidence, subtracting it raises the suggested CF.

Examples:

```txt
recent CF 0.40, CoC -0.40 => suggested CF 0.50
recent CF 0.80, CoC  0.40 => suggested CF 0.70
recent CF 0.60, CoC  0.00 => suggested CF 0.60
```

Players can always override the default. The default is a nudge and a reflective prompt, not an enforcement mechanism.

### CoC-adjusted answer weight

Do not multiply by raw CoC directly, because `0.0` is the ideal calibrated value. Instead, convert signed CoC bias into an adjusted CF.

Prototype formula:

```txt
adjustedCF = clamp(0.05, 0.95, CF - (CoCBias × correctionStrength))
effectiveWeight = adjustedCF
```

Optional later:

```txt
reliabilityPenalty = 1 - abs(CoCBias) × penaltyStrength
effectiveWeight = adjustedCF × reliabilityPenalty
```

For the prototype, keep it simple: use adjusted CF only. This directly implements the desired behavior:

- LCF-HCR / underconfident players get nudged upward over time
- HCF-LCR / overconfident players get nudged downward over time
- well-calibrated players remain close to their stated CF

### Underconfidence / overconfidence flags

Track rolling tendencies:

- LCF-HCR: low CF, correct / close
- HCF-LCR: high CF, wrong / far
- volatility: large swings in calibration bias

Suggested thresholds:

```txt
lowCF <= 0.4
highCF >= 0.75
alignedCoC = abs(CoCBias) <= 0.24
```

Numeric questions use closeness bands instead of binary correct/wrong.
