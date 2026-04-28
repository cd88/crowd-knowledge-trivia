import express from 'express';
import QRCode from 'qrcode';
import { connectDb } from './db.js';
import {
  buildState,
  createSession,
  createTeam,
  endSession,
  getPublicSessions,
  getSession,
  interQuestion,
  joinSession,
  joinTeam,
  openSession,
  pauseTimer,
  requireHost,
  resumeTimer,
  revealAggregates,
  revealAnswer,
  startCountdown,
  startQuestion,
  submitAnswer,
  submitFinalAnswer
} from './store.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(new URL('../public', import.meta.url).pathname));

app.get('/api/sessions', async (_req, res, next) => {
  try { res.json({ sessions: await getPublicSessions() }); }
  catch (err) { next(err); }
});

app.post('/api/sessions', async (req, res, next) => {
  try {
    const session = await createSession(req.body || {});
    res.json({
      joinCode: session.joinCode,
      hostToken: session.hostToken,
      hostUrl: `/host/${session.joinCode}?hostToken=${session.hostToken}`,
      playerUrl: `/play/${session.joinCode}`
    });
  } catch (err) { next(err); }
});

app.get('/api/session/:joinCode/qr', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const url = `${req.protocol}://${req.get('host')}/play/${session.joinCode}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
    res.json({ url, dataUrl });
  } catch (err) { next(err); }
});

app.get('/api/session/:joinCode/state', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    res.json(buildState(session, {
      playerToken: req.query.playerToken,
      hostToken: req.query.hostToken,
      sinceVersion: req.query.sinceVersion,
      view: req.query.view
    }));
  } catch (err) { next(err); }
});

app.post('/api/session/:joinCode/join', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const player = joinSession(session, req.body || {});
    res.json({ playerToken: player.clientToken, player });
  } catch (err) { next(err); }
});

app.post('/api/session/:joinCode/teams', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const team = createTeam(session, req.body || {});
    res.json({ team });
  } catch (err) { next(err); }
});

app.post('/api/session/:joinCode/teams/:teamId/join', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const team = joinTeam(session, { ...(req.body || {}), teamId: req.params.teamId });
    res.json({ team });
  } catch (err) { next(err); }
});

app.post('/api/session/:joinCode/submissions', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const submission = submitAnswer(session, req.body || {});
    res.json({ submission });
  } catch (err) { next(err); }
});

app.post('/api/session/:joinCode/final-answer', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    const finalAnswer = submitFinalAnswer(session, req.body || {});
    res.json({ finalAnswer });
  } catch (err) { next(err); }
});

const hostActions = {
  open: openSession,
  countdown: startCountdown,
  pause: pauseTimer,
  resume: resumeTimer,
  startQuestion,
  revealAggregates,
  revealAnswer,
  interQuestion,
  end: endSession
};

app.post('/api/session/:joinCode/host/:action', async (req, res, next) => {
  try {
    const session = await mustSession(req.params.joinCode);
    requireHost(session, req.body?.hostToken);
    const fn = hostActions[req.params.action];
    if (!fn) return res.status(404).json({ error: 'Unknown host action.' });
    fn(session);
    res.json({ ok: true, phase: session.phase, version: session.version });
  } catch (err) { next(err); }
});

app.get('/play/:joinCode', (_req, res) => res.sendFile(new URL('../public/play.html', import.meta.url).pathname));
app.get('/host/:joinCode', (_req, res) => res.sendFile(new URL('../public/host.html', import.meta.url).pathname));
app.get('/', (_req, res) => res.sendFile(new URL('../public/index.html', import.meta.url).pathname));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error.' });
});

async function mustSession(joinCode) {
  const session = await getSession(joinCode);
  if (!session) {
    const err = new Error('Session not found.');
    err.status = 404;
    throw err;
  }
  return session;
}

connectDb()
  .then(() => app.listen(port, () =>
    console.log(`Team Trivia CoC prototype running at http://localhost:${port}`)))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
