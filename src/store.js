import { nanoid } from 'nanoid';
import { SessionModel } from './models.js';

export const PHASES = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  COUNTDOWN: 'COUNTDOWN',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  AGGREGATES_VISIBLE: 'AGGREGATES_VISIBLE',
  FINAL_SUBMITTED: 'FINAL_SUBMITTED',
  ANSWER_REVEAL: 'ANSWER_REVEAL',
  INTER_QUESTION: 'INTER_QUESTION',
  ENDED: 'ENDED'
};

const questions = [
  {
    id: 'q1',
    type: 'NUMERIC',
    category: 'Estimation',
    text: 'How many pounds did the heaviest recorded cow weigh? Round to the nearest pound.',
    correctAnswer: 5000,
    tolerance: 0.25,
    explanation: 'This is a deliberately estimation-friendly numeric question for testing weighted averages.'
  },
  {
    id: 'q2',
    type: 'MULTIPLE_CHOICE',
    category: 'Music',
    text: 'Which instrument family does the bassoon belong to?',
    choices: ['Brass', 'Woodwind', 'String', 'Percussion'],
    correctAnswer: 'Woodwind',
    explanation: 'The bassoon is a double-reed woodwind instrument.'
  },
  {
    id: 'q3',
    type: 'NUMERIC',
    category: 'Science',
    text: 'Approximately how many bones are in the adult human body?',
    correctAnswer: 206,
    tolerance: 0.2,
    explanation: 'The commonly cited adult human skeleton has 206 bones.'
  },
  {
    id: 'q4',
    type: 'MULTIPLE_CHOICE',
    category: 'Pop culture',
    text: 'In the original Star Wars film, what is the name of Han Solo’s ship?',
    choices: ['Millennium Falcon', 'Nebuchadnezzar', 'Serenity', 'Razor Crest'],
    correctAnswer: 'Millennium Falcon',
    explanation: 'Han Solo pilots the Millennium Falcon.'
  },
  {
    id: 'q5',
    type: 'NUMERIC',
    category: 'Geography',
    text: 'How many U.S. states border Colorado?',
    correctAnswer: 7,
    tolerance: 0.15,
    explanation: 'Colorado touches Wyoming, Nebraska, Kansas, Oklahoma, New Mexico, Arizona, and Utah.'
  }
];

// In-memory write-through cache: joinCode -> session plain object.
// Populated on first access; persisted to MongoDB on every touch().
const sessionCache = new Map();

async function saveSession(session) {
  try {
    const { ...data } = session;
    await SessionModel.findOneAndUpdate(
      { joinCode: session.joinCode },
      { $set: data },
      { upsert: true },
    );
  } catch (err) {
    console.error('DB save error:', err.message);
  }
}

const now = () => Date.now();
const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
const round2 = (n) => Math.round(n * 100) / 100;
const code = () => nanoid(5).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

export async function createSession({ name = 'CoC Trivia Night', venueName = 'Venue', theme = 'Mixed trivia' } = {}) {
  const joinCode = code();
  const hostToken = nanoid(32);
  const session = {
    id: nanoid(),
    joinCode,
    hostToken,
    name,
    venueName,
    theme,
    phase: PHASES.DRAFT,
    version: 1,
    createdAt: now(),
    updatedAt: now(),
    config: {
      countdownSec: 20,
      questionTimeSec: 45,
      interQuestionSec: 20,
      scoringMode: 'ACCURACY_PLUS_SPEED'
    },
    timer: null,
    currentQuestionIndex: -1,
    questions,
    teams: [],
    players: [],
    submissions: [],
    finalAnswers: [],
    aggregates: []
  };
  sessionCache.set(joinCode, session);
  await saveSession(session);
  return session;
}

export async function getSession(joinCode) {
  const key = String(joinCode || '').toUpperCase();
  if (sessionCache.has(key)) return sessionCache.get(key);
  const doc = await SessionModel.findOne({ joinCode: key }).lean();
  if (!doc) return null;
  // Strip Mongoose internals before caching
  const { _id, ...session } = doc;
  sessionCache.set(key, session);
  return session;
}

export async function getPublicSessions() {
  const docs = await SessionModel.find(
    {},
    { joinCode: 1, name: 1, venueName: 1, phase: 1 },
  ).lean();
  return docs.map(d => {
    const cached = sessionCache.get(d.joinCode);
    return {
      joinCode: d.joinCode,
      name: d.name,
      venueName: d.venueName,
      phase: d.phase,
      players: cached?.players?.length ?? 0,
      teams: cached?.teams?.length ?? 0,
    };
  });
}

function touch(session) {
  session.version += 1;
  session.updatedAt = now();
  // Fire-and-forget DB persist; errors are logged inside saveSession.
  saveSession(session);
}

export function requireHost(session, hostToken) {
  if (!hostToken || hostToken !== session.hostToken) {
    const err = new Error('Host token required.');
    err.status = 403;
    throw err;
  }
}

export function openSession(session) {
  session.phase = PHASES.OPEN;
  session.timer = null;
  touch(session);
  return session;
}

export function startCountdown(session) {
  session.phase = PHASES.COUNTDOWN;
  session.timer = makeTimer(session.config.countdownSec);
  touch(session);
  return session;
}

export function pauseTimer(session) {
  if (session.timer && !session.timer.isPaused) {
    session.timer.isPaused = true;
    session.timer.pausedAt = now();
    touch(session);
  }
}

export function resumeTimer(session) {
  if (session.timer?.isPaused) {
    session.timer.accumulatedPausedMs += now() - session.timer.pausedAt;
    session.timer.isPaused = false;
    session.timer.pausedAt = null;
    touch(session);
  }
}

export function startQuestion(session) {
  const nextIndex = session.currentQuestionIndex + 1;
  if (nextIndex >= session.questions.length) {
    session.phase = PHASES.ENDED;
    touch(session);
    return session;
  }
  session.currentQuestionIndex = nextIndex;
  session.phase = PHASES.QUESTION_ACTIVE;
  session.timer = makeTimer(session.config.questionTimeSec);
  touch(session);
  return session;
}

export function revealAggregates(session) {
  const question = currentQuestion(session);
  if (!question) return session;
  for (const team of session.teams) {
    recomputeAggregate(session, question.id, team.id);
  }
  session.phase = PHASES.AGGREGATES_VISIBLE;
  session.timer = null;
  touch(session);
  return session;
}

export function revealAnswer(session) {
  const question = currentQuestion(session);
  if (!question) return session;
  applyScoringAndCalibration(session, question);
  session.phase = PHASES.ANSWER_REVEAL;
  session.timer = null;
  touch(session);
  return session;
}

export function interQuestion(session) {
  session.phase = PHASES.INTER_QUESTION;
  session.timer = makeTimer(session.config.interQuestionSec);
  touch(session);
}

export function endSession(session) {
  session.phase = PHASES.ENDED;
  session.timer = null;
  touch(session);
}

function makeTimer(durationSec) {
  return {
    durationSec,
    phaseStartedAt: now(),
    pausedAt: null,
    accumulatedPausedMs: 0,
    isPaused: false
  };
}

export function getRemainingMs(session) {
  const t = session.timer;
  if (!t) return null;
  const baseNow = t.isPaused ? t.pausedAt : now();
  const elapsed = baseNow - t.phaseStartedAt - t.accumulatedPausedMs;
  return Math.max(0, t.durationSec * 1000 - elapsed);
}

export function joinSession(session, { displayName, playerToken }) {
  const token = playerToken || nanoid(32);
  let player = session.players.find(p => p.clientToken === token);
  if (!player) {
    player = {
      id: nanoid(),
      sessionId: session.id,
      clientToken: token,
      displayName: cleanName(displayName || 'Player'),
      teamId: null,
      role: 'UNASSIGNED',
      score: 0,
      stats: {
        coc: 0,
        cfDefault: 0.5,
        calibrationRounds: 0,
        lcfHcrCount: 0,
        hcfLcrCount: 0,
        lastFeedback: []
      },
      joinedAt: now(),
      lastSeenAt: now()
    };
    session.players.push(player);
  } else {
    player.displayName = cleanName(displayName || player.displayName);
    player.lastSeenAt = now();
  }
  touch(session);
  return player;
}

export function createTeam(session, { name, playerToken, inviteCode }) {
  const player = findPlayerByToken(session, playerToken);
  if (!player) throw userError('Join the session before creating a team.', 400);
  const team = {
    id: nanoid(),
    sessionId: session.id,
    name: cleanName(name || 'Team'),
    inviteCode: inviteCode || code(),
    enrollmentMode: inviteCode ? 'INVITE_CODE' : 'OPEN',
    leaderPlayerIds: [player.id],
    memberPlayerIds: [player.id],
    score: 0,
    stats: { lastFeedback: [] },
    createdAt: now()
  };
  session.teams.push(team);
  player.teamId = team.id;
  player.role = 'LEADER';
  touch(session);
  return team;
}

export function joinTeam(session, { teamId, playerToken, inviteCode }) {
  const player = findPlayerByToken(session, playerToken);
  const team = session.teams.find(t => t.id === teamId);
  if (!player || !team) throw userError('Player or team not found.', 404);
  if (team.enrollmentMode === 'INVITE_CODE' && team.inviteCode !== inviteCode) {
    throw userError('Invite code does not match.', 403);
  }
  for (const t of session.teams) {
    t.memberPlayerIds = t.memberPlayerIds.filter(id => id !== player.id);
    t.leaderPlayerIds = t.leaderPlayerIds.filter(id => id !== player.id);
  }
  team.memberPlayerIds.push(player.id);
  player.teamId = team.id;
  player.role = team.leaderPlayerIds.includes(player.id) ? 'LEADER' : 'MEMBER';
  touch(session);
  return team;
}

export function submitAnswer(session, { playerToken, answer, cf }) {
  if (session.phase !== PHASES.QUESTION_ACTIVE) throw userError('Question is not active.', 409);
  const player = findPlayerByToken(session, playerToken);
  const question = currentQuestion(session);
  if (!player?.teamId) throw userError('Join a team before answering.', 400);
  const normalizedAnswer = normalizeAnswer(question, answer);
  const safeCf = clamp(0, Number(cf), 1);
  const adjustedCf = adjustedCfForPlayer(safeCf, player.stats.coc);

  const existing = session.submissions.find(s => s.questionId === question.id && s.playerId === player.id);
  const payload = {
    sessionId: session.id,
    questionId: question.id,
    teamId: player.teamId,
    playerId: player.id,
    answer: String(answer || '').slice(0, 120),
    normalizedAnswer,
    cf: safeCf,
    cocAtSubmission: player.stats.coc,
    adjustedCf,
    submittedAt: now(),
    updatedAt: now()
  };

  if (existing) Object.assign(existing, payload);
  else session.submissions.push({ id: nanoid(), ...payload });
  recomputeAggregate(session, question.id, player.teamId);
  touch(session);
  return existing || payload;
}

export function submitFinalAnswer(session, { playerToken, teamId, answer, provenance }) {
  if (session.phase !== PHASES.AGGREGATES_VISIBLE && session.phase !== PHASES.FINAL_SUBMITTED) {
    throw userError('Final answers are not open.', 409);
  }
  const player = findPlayerByToken(session, playerToken);
  const team = session.teams.find(t => t.id === teamId);
  if (!player || !team || !team.leaderPlayerIds.includes(player.id)) {
    throw userError('Only team leaders can submit final answers.', 403);
  }
  const question = currentQuestion(session);
  const normalizedAnswer = normalizeAnswer(question, answer);
  const existing = session.finalAnswers.find(a => a.questionId === question.id && a.teamId === teamId);
  const payload = {
    id: existing?.id || nanoid(),
    sessionId: session.id,
    questionId: question.id,
    teamId,
    playerId: player.id,
    answer: String(answer || '').slice(0, 120),
    normalizedAnswer,
    provenance: provenance || 'CUSTOM',
    submittedAt: now(),
    scoreAwarded: 0
  };
  if (existing) Object.assign(existing, payload);
  else session.finalAnswers.push(payload);
  session.phase = PHASES.FINAL_SUBMITTED;
  touch(session);
  return payload;
}

export function buildState(session, { playerToken, hostToken, sinceVersion, view = 'player' }) {
  const changed = Number(sinceVersion) !== session.version;
  const player = playerToken ? findPlayerByToken(session, playerToken) : null;
  const team = player?.teamId ? session.teams.find(t => t.id === player.teamId) : null;
  const question = currentQuestion(session);
  const remainingMs = getRemainingMs(session);
  const isHost = hostToken === session.hostToken;
  const isLeader = !!(player && team?.leaderPlayerIds.includes(player.id));
  const nextPollMs = pollMsForPhase(session.phase);

  if (!changed) return { changed: false, serverTime: new Date().toISOString(), nextPollMs };

  return {
    changed: true,
    version: session.version,
    serverTime: new Date().toISOString(),
    nextPollMs,
    session: {
      joinCode: session.joinCode,
      name: session.name,
      venueName: session.venueName,
      theme: session.theme,
      phase: session.phase,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      remainingMs,
      config: session.config,
      playersCount: session.players.length,
      teamsCount: session.teams.length
    },
    teams: publicTeams(session),
    player: player ? publicPlayer(player) : null,
    team: team ? publicTeam(team) : null,
    question: question ? publicQuestion(session, question) : null,
    hasSubmitted: !!(player && question &&
      session.submissions.find(s => s.questionId === question.id && s.playerId === player.id)),
    teamSubmittedCount: (team && question)
      ? session.submissions.filter(s => s.questionId === question.id && s.teamId === team.id).length
      : 0,
    aggregate: team && question ? findAggregate(session, question.id, team.id) : null,
    leaderDrilldown: isLeader && question ? buildLeaderDrilldown(session, question.id, team.id) : null,
    scoreboard: buildScoreboard(session),
    host: isHost || view === 'host' ? buildHostState(session) : null
  };
}

function buildHostState(session) {
  const q = currentQuestion(session);
  return {
    hostToken: session.hostToken,
    timerIsPaused: session.timer?.isPaused ?? false,
    teams: publicTeams(session),
    currentQuestion: q ? publicQuestion(session, q) : null,
    allAggregates: q ? session.aggregates.filter(a => a.questionId === q.id) : [],
    finalAnswers: q ? session.finalAnswers.filter(a => a.questionId === q.id) : []
  };
}

function publicQuestion(session, question) {
  const visibleAnswer = [PHASES.ANSWER_REVEAL, PHASES.INTER_QUESTION, PHASES.ENDED].includes(session.phase);
  return {
    id: question.id,
    type: question.type,
    category: question.category,
    text: question.text,
    choices: question.choices || [],
    correctAnswer: visibleAnswer ? question.correctAnswer : null,
    explanation: visibleAnswer ? question.explanation : null
  };
}

function publicPlayer(player) {
  return {
    id: player.id,
    displayName: player.displayName,
    teamId: player.teamId,
    role: player.role,
    score: player.score,
    stats: {
      ...player.stats,
      coc: round2(player.stats.coc),
      cfDefault: round2(defaultCfFromCoC(player.stats.coc))
    }
  };
}

function publicTeam(team) {
  return {
    id: team.id,
    name: team.name,
    enrollmentMode: team.enrollmentMode,
    memberCount: team.memberPlayerIds.length,
    score: team.score,
    lastFeedback: team.stats.lastFeedback || []
  };
}

function publicTeams(session) {
  return session.teams.map(publicTeam);
}

function buildLeaderDrilldown(session, questionId, teamId) {
  const members = session.players.filter(p => p.teamId === teamId);
  const submissions = session.submissions.filter(s => s.questionId === questionId && s.teamId === teamId);
  return members.map(p => {
    const s = submissions.find(sub => sub.playerId === p.id);
    return {
      playerId: p.id,
      displayName: p.displayName,
      role: p.role,
      coc: round2(p.stats.coc),
      cfDefault: round2(defaultCfFromCoC(p.stats.coc)),
      submitted: !!s,
      answer: s?.answer ?? null,
      cf: s ? round2(s.cf) : null,
      adjustedCf: s ? round2(s.adjustedCf) : null,
      cocAtSubmission: s ? round2(s.cocAtSubmission) : null
    };
  });
}

function buildScoreboard(session) {
  return {
    teams: [...session.teams].sort((a, b) => b.score - a.score).map(t => ({ id: t.id, name: t.name, score: round2(t.score) })),
    players: [...session.players].sort((a, b) => b.score - a.score).map(p => ({ id: p.id, name: p.displayName, teamId: p.teamId, score: round2(p.score), coc: round2(p.stats.coc) }))
  };
}

function currentQuestion(session) {
  return session.questions[session.currentQuestionIndex] || null;
}

function findPlayerByToken(session, token) {
  return session.players.find(p => p.clientToken === token);
}

function findAggregate(session, questionId, teamId) {
  return session.aggregates.find(a => a.questionId === questionId && a.teamId === teamId) || null;
}

function recomputeAggregate(session, questionId, teamId) {
  const question = session.questions.find(q => q.id === questionId);
  const submissions = session.submissions.filter(s => s.questionId === questionId && s.teamId === teamId);
  const aggregate = question.type === 'MULTIPLE_CHOICE'
    ? aggregateMultipleChoice(question, submissions)
    : aggregateNumeric(question, submissions);
  const existing = findAggregate(session, questionId, teamId);
  const payload = {
    id: existing?.id || nanoid(),
    sessionId: session.id,
    questionId,
    teamId,
    version: session.version + 1,
    ...aggregate,
    updatedAt: now()
  };
  if (existing) Object.assign(existing, payload);
  else session.aggregates.push(payload);
  return payload;
}

function aggregateMultipleChoice(question, submissions) {
  const init = Object.fromEntries((question.choices || []).map(c => [c, { raw: 0, cf: 0, coc: 0 }]));
  for (const s of submissions) {
    const key = s.normalizedAnswer;
    if (!init[key]) init[key] = { raw: 0, cf: 0, coc: 0 };
    init[key].raw += 1;
    init[key].cf += s.cf;
    init[key].coc += s.adjustedCf;
  }
  const pick = (field) => Object.entries(init).sort((a, b) => b[1][field] - a[1][field])[0]?.[0] || null;
  return {
    rawAnswer: pick('raw'),
    cfWeightedAnswer: pick('cf'),
    cocWeightedAnswer: pick('coc'),
    breakdown: init
  };
}

function aggregateNumeric(question, submissions) {
  const nums = submissions.map(s => Number(s.normalizedAnswer)).filter(Number.isFinite);
  const rawAnswer = median(nums);
  const cfWeightedAnswer = weightedMean(submissions, 'cf');
  const cocWeightedAnswer = weightedMean(submissions, 'adjustedCf');
  return {
    rawAnswer: rawAnswer == null ? null : round2(rawAnswer),
    cfWeightedAnswer: cfWeightedAnswer == null ? null : round2(cfWeightedAnswer),
    cocWeightedAnswer: cocWeightedAnswer == null ? null : round2(cocWeightedAnswer),
    breakdown: submissions.map(s => ({ answer: s.answer, normalizedAnswer: s.normalizedAnswer, cf: s.cf, adjustedCf: s.adjustedCf }))
  };
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function weightedMean(submissions, weightKey) {
  let total = 0;
  let weight = 0;
  for (const s of submissions) {
    const n = Number(s.normalizedAnswer);
    const w = Number(s[weightKey]);
    if (Number.isFinite(n) && Number.isFinite(w) && w > 0) {
      total += n * w;
      weight += w;
    }
  }
  if (!weight) return null;
  return total / weight;
}

function applyScoringAndCalibration(session, question) {
  for (const team of session.teams) {
    const final = session.finalAnswers.find(a => a.questionId === question.id && a.teamId === team.id);
    if (final && final.scoreAwarded === 0) {
      const score = scoreFinal(question, final.normalizedAnswer);
      final.scoreAwarded = score;
      team.score += score;
    }
    const teamSubs = session.submissions.filter(s => s.questionId === question.id && s.teamId === team.id);
    const methodWinner = methodComparison(session, question, team.id);
    team.stats.lastFeedback = methodWinner ? [`${methodWinner} performed best for this question.`] : [];
    for (const s of teamSubs) {
      const player = session.players.find(p => p.id === s.playerId);
      const correctness = correctnessScore(question, s.normalizedAnswer);
      const bias = s.cf - correctness; // positive overconfident, negative underconfident
      const learningRate = 0.25;
      player.stats.coc = clamp(-1, player.stats.coc * (1 - learningRate) + bias * learningRate, 1);
      player.stats.cfDefault = defaultCfFromCoC(player.stats.coc);
      player.stats.calibrationRounds += 1;
      if (s.cf <= 0.4 && correctness >= 0.75) player.stats.lcfHcrCount += 1;
      if (s.cf >= 0.75 && correctness <= 0.35) player.stats.hcfLcrCount += 1;
      player.stats.lastFeedback = feedbackForSubmission(s.cf, correctness, player.stats.coc);
      player.score += correctness * 10;
    }
  }
}

function methodComparison(session, question, teamId) {
  const agg = findAggregate(session, question.id, teamId);
  if (!agg) return null;
  const methods = [
    ['Raw aggregate', agg.rawAnswer],
    ['CF-weighted aggregate', agg.cfWeightedAnswer],
    ['CoC-adjusted aggregate', agg.cocWeightedAnswer]
  ];
  const scored = methods.map(([label, ans]) => [label, correctnessScore(question, normalizeAnswer(question, ans))]);
  scored.sort((a, b) => b[1] - a[1]);
  if (!Number.isFinite(scored[0]?.[1])) return null;
  return scored[0][0];
}

function feedbackForSubmission(cf, correctness, coc) {
  const notes = [];
  if (cf <= 0.4 && correctness >= 0.75) notes.push('You were more correct than your confidence suggested. Hidden signal.');
  if (cf >= 0.75 && correctness <= 0.35) notes.push('High confidence missed here. Your future default CF will cool down.');
  if (Math.abs(cf - correctness) <= 0.15) notes.push('Your confidence was well aligned this round.');
  if (coc < -0.15) notes.push('Current pattern: underconfident.');
  if (coc > 0.15) notes.push('Current pattern: overconfident.');
  return notes.length ? notes : ['Calibration updated.'];
}

function scoreFinal(question, normalizedAnswer) {
  return Math.round(correctnessScore(question, normalizedAnswer) * 100);
}

function correctnessScore(question, normalizedAnswer) {
  if (normalizedAnswer == null || normalizedAnswer === '') return 0;
  if (question.type === 'MULTIPLE_CHOICE') return normalizedAnswer === question.correctAnswer ? 1 : 0;
  const answer = Number(normalizedAnswer);
  const correct = Number(question.correctAnswer);
  if (!Number.isFinite(answer) || !Number.isFinite(correct)) return 0;
  const denom = Math.max(1, Math.abs(correct));
  const percentError = Math.abs(answer - correct) / denom;
  return clamp(0, 1 - percentError / (question.tolerance || 0.2), 1);
}

function normalizeAnswer(question, answer) {
  if (answer == null) return '';
  if (question.type === 'MULTIPLE_CHOICE') return String(answer).trim();
  const n = Number(String(answer).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : '';
}

function adjustedCfForPlayer(cf, coc) {
  // CoC is signed bias: positive means overconfident, negative means underconfident.
  // Subtract bias to pull CF back toward historical alignment.
  return clamp(0.01, cf - coc * 0.5, 1);
}

function defaultCfFromCoC(coc) {
  // Start from neutral. If a player is usually overconfident, lower the default.
  // If usually underconfident, raise the default. Keep it moderate to avoid autopilot.
  return clamp(0.15, 0.5 - coc * 0.3, 0.85);
}

function pollMsForPhase(phase) {
  if ([PHASES.QUESTION_ACTIVE, PHASES.AGGREGATES_VISIBLE, PHASES.FINAL_SUBMITTED, PHASES.ANSWER_REVEAL, PHASES.COUNTDOWN].includes(phase)) return 1000;
  if (phase === PHASES.OPEN) return 2500;
  return 3500;
}

function cleanName(input) {
  return String(input || '').trim().slice(0, 40).replace(/[<>]/g, '') || 'Unnamed';
}

function userError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}
