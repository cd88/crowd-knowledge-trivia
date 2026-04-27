# 01 — Product Premise

## Working premise

This is not primarily a trivia app. The prototype tests whether a team-based game can make **confidence calibration** socially visible, useful, and fun.

The core mechanic:

- Each player submits a preliminary answer.
- Each player also submits a **CF** score: their stated confidence in that answer.
- The system aggregates answers three ways:
  - raw mode / plurality answer
  - CF-weighted answer
  - CoC-adjusted answer
- The team leader chooses the final submitted answer, with the ability to drill into each teammate’s answer/CF/CoC contribution before deciding.
- After the correct answer is revealed, each player’s **CoC** score is updated based on how well their CF matched reality.
- Each player’s next-round CF input defaults from their running calibration state, not from a static low-confidence value.

## Definitions

- **CF**: confidence score submitted by a player for a specific answer.
- **CoC**: confidence-of-confidence score; a signed rolling calibration-bias score in the range `-1.0–1.0`, where `0.0` means CF is well-aligned with actual correctness. Negative values indicate underconfidence; positive values indicate overconfidence.
- **LCF-HCR**: low confidence, high correctness rate. Indicates underconfidence / hidden signal.
- **HCF-LCR**: high confidence, low correctness rate. Indicates overconfidence / noisy dominance.

## Primary goal

Validate whether confidence-weighted team trivia produces more interesting team dynamics than normal trivia.

The prototype should answer:

- Do players understand CF quickly?
- Do players change their CF behavior after seeing feedback?
- Does CoC adjustment improve team answers over raw mode / raw CF weighting?
- Does the leader find the three aggregate suggestions and teammate drill-down useful?
- Do post-round “revelations” feel fun rather than punitive?

## Secondary goal

Validate the technical shape for a venue-friendly, mobile-first, host-screen-driven game.

The prototype should answer:

- Can a session be hosted on a TV/laptop without native apps?
- Can players join quickly from QR/link?
- Can the system handle a modest venue crowd without realtime-collab complexity?
- Is 1-second polling good enough for timers, submissions, and aggregate display?

## Non-goals for prototype

Do not build these initially:

- Full AI question generation pipeline.
- Full ad network integration.
- Real payment/entry fee handling.
- Complex anti-cheat.
- Fully general realtime collaboration.
- Rich admin analytics dashboard.
- Native mobile apps.
- Multi-venue tournament support.
- Sophisticated team merge flows beyond a minimal request/approval test.

The prototype should be good enough to run a real test night, not good enough to become the final product.

## Key prototype risk

The major risk is not WebSockets vs polling. The major risk is whether users understand and enjoy CF/CoC.

The prototype should bias toward:

- clear CF input
- dynamic CF defaults that make calibration visible
- immediate calibration feedback
- visible aggregate comparison
- leader-facing teammate drill-down
- playful language
- minimal setup friction

If the calibration mechanic works, the realtime architecture can be upgraded later. If the calibration mechanic does not work, realtime sophistication will not save the product.
