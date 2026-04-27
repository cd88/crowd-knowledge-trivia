# 06 — Calibration and Scoring

## Aggregates

### Multiple-choice aggregation

For each option:

- raw vote count
- sum of CF
- sum of CF × CoC

Outputs:

- raw plurality answer
- CF-weighted answer
- CF × CoC-weighted answer

### Numeric/scalar aggregation

For numeric answers:

- raw median
- raw mean
- CF-weighted mean
- CF × CoC-weighted mean

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

CoC should reward calibrated confidence, not merely correctness.

Good patterns:

- high CF + correct
- low CF + wrong
- medium CF + uncertain result

Interesting pattern:

- low CF + correct: possible hidden signal / underconfidence

Bad pattern:

- high CF + wrong: overconfidence

### Per-round calibration score

For multiple-choice, use a simple Brier-style score.

If answer is correct:

```txt
roundCalibration = 1 - (1 - CF)^2
```

If answer is wrong:

```txt
roundCalibration = 1 - CF^2
```

This gives:

- high CF correct: high score
- low CF wrong: high score
- high CF wrong: low score
- low CF correct: moderate score, but flagged as underconfidence

### CoC update

Use exponential moving average with decay:

```txt
newCoC = oldCoC × decay + roundCalibration × learningRate
```

Normalize:

```txt
decay + learningRate = 1
```

Suggested prototype values:

```txt
decay = 0.85
learningRate = 0.15
startingCoC = 0.75
minCoC = 0.25
maxCoC = 1.25
```

The displayed CoC can be normalized to a friendly 0–100 scale, but internally it should be usable as a multiplier.

### CoC multiplier

Convert CoC score to a multiplier:

```txt
CoCMultiplier = clamp(0.25, 1.25, CoC)
```

Effective answer weight:

```txt
effectiveWeight = CF × CoCMultiplier
```

### Underconfidence / overconfidence flags

Track rolling tendencies:

- LCF-HCR: low CF, correct / close
- HCF-LCR: high CF, wrong / far
- volatility: large swings in CF accuracy

Suggested thresholds:

```txt
lowCF <= 0.4
highCF >= 0.75
```

Numeric questions need closeness bands instead of binary correct/wrong.

### Numeric correctness conversion

For numeric answers, convert error to correctness score from 0–1.

Example:

```txt
correctness = max(0, 1 - percentError / tolerance)
```

If tolerance is 20%, then:

- exact answer = 1.0
- 10% off = 0.5
- 20%+ off = 0.0

Then compare CF to correctness:

```txt
calibrationError = abs(CF - correctness)
roundCalibration = 1 - calibrationError
```
