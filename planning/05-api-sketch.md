# 05 — API Sketch

## Host/session

```txt
POST /api/sessions
POST /api/sessions/:id/open
POST /api/sessions/:id/countdown/start
POST /api/sessions/:id/countdown/pause
POST /api/sessions/:id/countdown/resume
POST /api/sessions/:id/question/start
POST /api/sessions/:id/question/close
POST /api/sessions/:id/aggregates/reveal
POST /api/sessions/:id/answer/reveal
POST /api/sessions/:id/next
POST /api/sessions/:id/end
```

## Join/player/team

```txt
GET  /api/session/:joinCode/state
POST /api/session/:joinCode/join
POST /api/session/:joinCode/teams
POST /api/teams/:teamId/join
POST /api/teams/:teamId/leave
POST /api/teams/:teamId/promote
POST /api/teams/:teamId/remove-member
POST /api/teams/:teamId/merge-request
POST /api/team-merge-requests/:id/approve
POST /api/team-merge-requests/:id/reject
```

## Gameplay

```txt
POST /api/questions/:questionId/submissions
POST /api/questions/:questionId/final-answer
GET  /api/session/:joinCode/dashboard
```

## Polling state endpoint notes

Primary player state endpoint:

```txt
GET /api/session/:joinCode/state?sinceVersion=123
```

Host display state endpoint:

```txt
GET /api/session/:joinCode/host-display-state?sinceVersion=123
```

The player endpoint should return only the requester-relevant state:

- player state
- team state
- visible session state
- current question state
- visible aggregates
- next suggested poll interval

The host display endpoint should not include member-private information.
