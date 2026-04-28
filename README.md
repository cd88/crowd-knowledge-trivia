# Team Trivia CoC Prototype

A mobile-first Express prototype for team trivia with confidence (`CF`) and confidence-of-confidence (`CoC`) mechanics.

This build intentionally uses in-memory storage so you can run and change the prototype quickly. It is structured so the game loop, calibration math, and polling contracts can be moved to Mongo/Mongoose later.

## Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Create a session, then open the host screen and player link in separate browser windows/devices.

## What is implemented

- Host-created sessions
- QR/link join flow
- Team creation/joining
- Host-driven game phases
- 1-second-ish polling with jitter and `version` change detection
- Multiple-choice and numeric seeded questions
- Player preliminary answer + CF submission
- CF default derived from running CoC
- Signed CoC bias model from `-1` to `1`
  - `0` = calibrated / aligned
  - negative = underconfident
  - positive = overconfident
- Raw, CF-weighted, and CoC-adjusted aggregate answers
- Leader drill-down into team member answer/CF submissions
- Leader final-answer selection
- Score + CoC updates after reveal
- Basic player/team feedback and end-game scoreboard

## Prototype caveats

- Storage is in memory and resets on server restart.
- No auth/accounts; player identity is localStorage token based.
- No production-grade anti-cheat/rate-limiting.
- No AI question generation, ads, payments, or voice narration yet.
- Team merge is not implemented in this first runnable cut.

## Suggested next pass

1. Add Mongo/Mongoose persistence.
2. Add a real host session configuration form.
3. Expand dashboard charts for CF/CoC deltas.
4. Add team merge requests.
5. Add venue branding/custom question packs.
