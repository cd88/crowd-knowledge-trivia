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
    // signed calibration-bias score in range -1.0 to 1.0; 0.0 is best aligned
    cocBias,
    cfEma,
    calibrationErrorEma,
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
  cocBiasAtSubmission,
  adjustedCf,
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
  cocAdjustedAnswer,
  rawBreakdown,
  cfBreakdown,
  cocAdjustedBreakdown,
  leaderMemberBreakdown: [
    {
      playerId,
      displayName,
      answer,
      cf,
      cocBias,
      adjustedCf,
      effectiveWeight,
      contributionLabel
    }
  ],
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
  provenance, // RAW | CF_WEIGHTED | COC_ADJUSTED | CUSTOM
  submittedByPlayerId,
  submittedAt,
  scoreAwarded,
  speedMs
}
```
