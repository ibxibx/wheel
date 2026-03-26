const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── In-memory state ────────────────────────────────────────────────────────
// queue : names submitted via /join, waiting to be added to the wheel
// wheel : names currently on the wheel
// all names are stored lowercase-trimmed for dedup; display form kept separately
const state = {
  queue: [],   // [{ id, name }]
  wheel: [],   // [{ id, name }]
};
let nextId = 1;

// All names currently in either list (for dedup check)
function allNames() {
  return [...state.queue, ...state.wheel].map(e => e.name.toLowerCase().trim());
}

// ── SSE — presenter stream ─────────────────────────────────────────────────
// Presenter page connects once; we push state whenever anything changes.
const sseClients = new Set();

function broadcast() {
  const payload = `data: ${JSON.stringify({ queue: state.queue, wheel: state.wheel })}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send current state immediately on connect
  res.write(`data: ${JSON.stringify({ queue: state.queue, wheel: state.wheel })}\n\n`);

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── API ────────────────────────────────────────────────────────────────────

// Phone submits a name → goes into queue
app.post('/api/join', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name)                            return res.json({ ok: false, error: 'Name is required.' });
  if (name.length > 40)                 return res.json({ ok: false, error: 'Name is too long.' });
  if (allNames().includes(name.toLowerCase())) {
    return res.json({ ok: false, error: 'That name is already on the wheel or in the queue.' });
  }
  state.queue.push({ id: nextId++, name });
  broadcast();
  res.json({ ok: true });
});

// Presenter adds a name directly to the wheel (manual add, bypasses queue)
app.post('/api/wheel-add', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name)                            return res.json({ ok: false, error: 'Name is required.' });
  if (name.length > 40)                 return res.json({ ok: false, error: 'Name is too long.' });
  if (allNames().includes(name.toLowerCase())) {
    return res.json({ ok: false, error: 'That name is already on the wheel or in the queue.' });
  }
  state.wheel.push({ id: nextId++, name });
  broadcast();
  res.json({ ok: true });
});

// Presenter approves a queued name → moves to wheel
app.post('/api/approve/:id', (req, res) => {
  const id  = parseInt(req.params.id, 10);
  const idx = state.queue.findIndex(e => e.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'Not found in queue.' });
  const [entry] = state.queue.splice(idx, 1);
  state.wheel.push(entry);
  broadcast();
  res.json({ ok: true });
});

// Presenter removes a name from queue (dismiss without adding)
app.delete('/api/queue/:id', (req, res) => {
  const id  = parseInt(req.params.id, 10);
  const idx = state.queue.findIndex(e => e.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'Not found.' });
  state.queue.splice(idx, 1);
  broadcast();
  res.json({ ok: true });
});

// Presenter removes a name from wheel
app.delete('/api/wheel/:id', (req, res) => {
  const id  = parseInt(req.params.id, 10);
  const idx = state.wheel.findIndex(e => e.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'Not found.' });
  state.wheel.splice(idx, 1);
  broadcast();
  res.json({ ok: true });
});

// ── Serve pages ────────────────────────────────────────────────────────────
app.get('/',     (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/join', (_, res) => res.sendFile(path.join(__dirname, 'join.html')));

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎡  Wheel server running`);
  console.log(`   Presenter : http://localhost:${PORT}`);
  console.log(`   Join link : http://<your-local-ip>:${PORT}/join`);
  console.log(`   (find your IP with: ipconfig | findstr IPv4)\n`);
});
