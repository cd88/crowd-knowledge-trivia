# 02 — UX Flows

## Session lifecycle

```txt
DRAFT
OPEN
COUNTDOWN
QUESTION_ACTIVE
QUESTION_LOCKED
AGGREGATES_VISIBLE
FINAL_SUBMITTED
ANSWER_REVEAL
INTER_QUESTION
ENDED
```

### DRAFT

Host configures the game.

### OPEN

Players can join, create teams, join teams, and wait. Host TV shows join instructions.

### COUNTDOWN

The game start countdown is running. Host can pause/resume.

### QUESTION_ACTIVE

Question is visible. Players submit preliminary answer + CF.

### QUESTION_LOCKED

Input is closed. Aggregates are calculated/frozen.

### AGGREGATES_VISIBLE

All parties can see:

- raw mode / plurality
- CF-weighted answer
- CF × CoC-weighted answer

Team leader chooses final answer.

### FINAL_SUBMITTED

Team answer is locked.

### ANSWER_REVEAL

Correct answer is revealed. Scores and CoC updates are applied.

### INTER_QUESTION

Players see calibration feedback and team insights.

### ENDED

Final scoreboards and post-game highlights.

---

## Host UX

### Create session

Host chooses:

- session name
- venue name / branding
- theme
- countdown-to-start duration
- whether to open session early
- question count
- question time limit
- inter-question buffer duration
- play type:
  - numeric/scalar only
  - multiple-choice only
  - mixed
- categories:
  - math
  - music
  - sports
  - pop culture
  - history
  - science
  - geography
  - venue/custom
- reading mode:
  - live announcer
  - AI read-aloud placeholder
  - silent/manual
- scoring mode:
  - accuracy only
  - speed only
  - accuracy + speed
- team enrollment:
  - open
  - invite code required
- optional patronage / entry link
- optional ad/waiting screen toggle

### Host pre-game screen

Designed for venue TV.

Shows:

- session name
- venue branding
- theme
- join URL
- large QR code
- number of joined players
- number of teams
- countdown state
- “waiting for host” / “starting soon” message

Jackbox-style principle:

- one obvious room code
- one obvious QR code
- no account creation required for first prototype

### Host controls

Host can:

- open session
- start countdown
- pause countdown
- resume countdown
- skip countdown
- start next question
- pause during question
- close question early
- reveal aggregates
- reveal answer
- advance to next question
- end game

Prototype shortcut:

The host may manually drive phase transitions from a control panel rather than fully automating the timeline.

---

## Player UX

### Join session

Player arrives via QR/link.

Flow:

1. Enter display name.
2. See list of teams.
3. Create team or join existing team.
4. If invite-code session, enter team/session invite code.
5. Wait in lobby.

No password/account required for prototype.

Use a signed browser token/cookie to identify returning players during the session.

### Team creation

Creator becomes team leader.

Team leader can:

- rename team
- approve members if team is private
- remove members
- promote another leader
- choose final answer
- submit final answer
- approve team merge request

Members can:

- submit preliminary answers
- submit CF
- view aggregates when visible
- view calibration feedback

### Team merge

Prototype minimal flow:

1. Leader A requests merge with Team B.
2. Leader B receives prompt.
3. If both leaders approve, teams merge.

Later version can require unanimous approval from all members or all leaders. For prototype, unanimous approval between leaders is enough.

---

## Question UX

### Question display

During active question, host screen shows:

- question number
- category
- question text
- choices if multiple-choice
- remaining time
- optional read-aloud status

Player screen shows:

- question text
- answer input
- CF slider/input, prefilled from the player’s running calibration state
- current personal CoC score, shown as calibration bias: underconfident / aligned / overconfident
- lock-in button
- teammate submission status, but not necessarily teammate answers before lock

### CF input

Use a simple slider:

```txt
0%  — pure guess
25% — weak hunch
50% — plausible
75% — pretty sure
100% — know it
```

Store internally as `0.0–1.0`.

The next-round default should not be static. It should reflect the player’s running calibration state:

- if the player is well-aligned, default near their recent CF average
- if the player is underconfident, nudge the default upward
- if the player is overconfident, nudge the default downward

Players can always override the default. The point is not to force a system opinion, but to create a visible calibration prompt: “the system thinks you usually under/overstate your confidence.”

### Lock-in

Player submits:

- answer
- CF
- timestamp

Players can revise before question closes unless they press “final lock.”

Prototype recommendation:

Allow edits until timer ends. Use latest submission.

---

## Team final answer

After aggregates are visible, the leader sees:

```txt
Raw team answer: B
CF-weighted answer: C
CoC-adjusted answer: C
```

or, for numeric:

```txt
Team median: 742
CF-weighted estimate: 738
CoC-adjusted estimate: 741
```

Leader can select one of those suggestions or enter/edit a custom final answer.

The leader can also open a team list / drill-down panel before submitting. For each teammate, show:

- display name
- submitted answer
- submitted CF
- current CoC calibration bias
- CoC-adjusted CF / effective weight
- recent calibration label, such as “aligned,” “underconfident,” “overconfident,” or “volatile”
- whether this player pulled the aggregate toward or away from the correct answer after reveal

Before the answer is revealed, avoid showing correctness language. Use neutral contribution language, such as “high influence,” “low influence,” or “outlier estimate.”

Store final answer with provenance:

```txt
RAW_MODE
CF_WEIGHTED
COC_ADJUSTED
CUSTOM
```

This matters for post-game analysis.

---

## Feedback / revelations

### During inter-question buffer

Show short, non-shaming insights.

Examples:

- “You were closer than your CF suggested.”
- “Your high-CF answer missed this round.”
- “Maya’s low-CF estimate pulled the team closer.”
- “The CoC-adjusted answer beat the raw team answer.”
- “Your sports CF is better calibrated than your music CF.”

### Player dashboard

At any time, player can view:

- current CoC
- CF trend
- calibration trend
- category breakdown
- LCF-HCR moments
- HCF-LCR moments
- contribution to team answer

### Team dashboard

Team can view:

- team score
- player contribution summaries
- raw vs CF vs CoC aggregate performance
- which aggregate method is winning tonight
- category strengths
- team calibration trend

---

## End-game UX

End-game screen shows:

- team scoreboard
- individual scoreboard
- best calibrated player
- most improved CF calibration
- quiet signal award: low CF, high correctness
- bold but wrong award, phrased carefully
- category experts
- category intuitives
- best leader decision
- aggregate method comparison:
  - raw mode / median score
  - CF-weighted score
  - CoC-adjusted score
  - leader final score

Avoid humiliating labels. Make all revelations playful and reflective.
