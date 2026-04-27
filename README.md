# Team Trivia CoC Prototype Spec Pack

A prototype spec for a mobile-first, venue-friendly team trivia game where the main mechanic is calibrated collective judgment.

The game asks each player to submit:

- an answer
- a CF score: confidence in that answer

The system compares:

- raw team answer
- CF-weighted answer
- CF × CoC-weighted answer

CoC means confidence-of-confidence: a rolling reliability weight for how well a player uses confidence.

## Files

- `01-product-premise.md` — core concept, goals, and non-goals
- `02-ux-flows.md` — host, player, team, question, and end-game flows
- `03-architecture.md` — Express/Mongo architecture, polling model, stateless timers
- `04-data-model.md` — draft Mongo/Mongoose-style data model
- `05-api-sketch.md` — rough endpoint map
- `06-calibration-scoring.md` — CF, CoC, aggregation, scoring, and feedback logic
- `07-mvp-cutline.md` — build/defer list and implementation sequence

## Current recommendation

Start boring technically: Express + MongoDB + compact 1-second polling during active gameplay. Avoid WebSockets until the game mechanic proves itself.

The main product risk is not realtime infrastructure. The main risk is whether players understand and enjoy CF/CoC feedback.
