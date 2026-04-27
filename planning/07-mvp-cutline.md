# 07 — MVP Cutline

## Build first

- Host creates session manually.
- Host opens session.
- Players join by QR/link.
- Players create/join teams.
- Host starts game.
- Multiple-choice and numeric questions from a seeded question list.
- Player submits answer + CF.
- Player CF defaults are nudged from running CoC/calibration state.
- Aggregates shown.
- Leader can drill into teammate answer/CF/CoC submissions.
- Leader submits final answer.
- Correct answer revealed.
- CoC updates.
- Basic scoreboard.
- Basic post-round feedback.
- Basic end-game highlights.

## Defer

- AI-generated questions.
- AI voice reading.
- Payments.
- Ads.
- Sophisticated merge rules.
- Full dashboard charting.
- Public user accounts.
- Venue admin tools.
- Real-time socket infrastructure.

## Engineering implementation sequence

### Phase 1: Skeleton

- Express app
- Mongo models
- host session creation
- join code screen
- player join
- team create/join
- polling state endpoint

### Phase 2: Game loop

- seeded questions
- host phase controls
- timer derivation
- question active screen
- submission endpoint
- aggregate snapshot generation
- leader final answer endpoint
- leader team-submission drill-down

### Phase 3: Scoring + CoC

- correctness scoring
- CF calibration scoring
- signed CoC-bias update in `-1.0–1.0` range
- next-round CF default calculation
- post-round feedback snippets
- scoreboards

### Phase 4: Venue polish

- QR code
- host TV layout
- mobile-first player layout
- waiting screen
- basic branding
- simple end-game highlight reel
