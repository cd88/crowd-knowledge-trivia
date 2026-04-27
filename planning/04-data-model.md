# 04 — Data Model

## Session

```js
Session {
  _id,
  joinCode,
  name,
  venueName,
  branding,
  theme,
  status,
  phase,
  version,
  config: {
    playType,
    categories,
    questionCount,
    questionTimeSec,
    interQuestionSec,
    countdownSec,
    scoringMode,
    enrollmentMode,
    readingMode,
    adsEnabled,
    patronageUrl
  },
  timer: {
    phaseStartedAt,
    pausedAt,
    accumulatedPausedMs,
    durationSec,
    isPaused
  },
  currentQuestionIndex,
  createdByHostToken,
  createdAt,
  updatedAt
}
```

## Question

```js
Question {
  _id,
  sessionId,
  index,
  type, // MULTIPLE_CHOICE | NUMERIC
  category,
  text,
  choices,
  correctAnswer,
  tolerance,
  explanation,
  source,
  createdAt
}
```

## Player

```js
Player {
  _id,
  sessionId,
  teamId,
  displayName,
  role, // LEADER | MEMBER
  clientTokenHash,
  stats: {
    coc,
    calibrationEma,
    lcfHcrCount,
    hcfLcrCount,
    cfVolatility,
    categoryStats
  },
  joinedAt,
  lastSeenAt
}
```

## Team

```js
Team {
  _id,
  sessionId,
  name,
  inviteCode,
  enrollmentMode,
  leaderPlayerIds,
  memberPlayerIds,
  score,
  stats,
  createdAt
}
```

## Submission

```js
Submission {
  _id,
  sessionId,
  questionId,
  teamId,
  playerId,
  answer,
  normalizedAnswer,
  cf,
  cocAtSubmission,
  effectiveWeight,
  submittedAt,
  updatedAt,
  lockedAt
}
```

## QuestionAggregate

```js
QuestionAggregate {
  _id,
  sessionId,
  questionId,
  teamId,
  version,
  rawAnswer,
  cfWeightedAnswer,
  cocWeightedAnswer,
  rawBreakdown,
  cfBreakdown,
  cocBreakdown,
  updatedAt
}
```

## FinalAnswer

```js
FinalAnswer {
  _id,
  sessionId,
  questionId,
  teamId,
  answer,
  provenance, // RAW | CF_WEIGHTED | COC_WEIGHTED | CUSTOM
  submittedByPlayerId,
  submittedAt,
  scoreAwarded,
  speedMs
}
```
