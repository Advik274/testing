import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerSocketEvents } from './sockets/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000']
  : true; // allow all in dev

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_, res) => res.json({ status: 'ok', phase: db.app_state?.current_phase }));

// ── DB ─────────────────────────────────────────────────────────
let db = {};
const DB_PATH = './data/db.json';

function loadDB() {
  if (!existsSync(DB_PATH)) {
    db = {
      app_state: {
        current_phase: 'setup', phase1_round: 0, phase1_round_active: false,
        phase2_timer_end: null, phase3_timer_end: null,
        battery_drain_interval_ms: 60000, battery_drain_percent_per_tick: 2,
        phase3_problem: null, results_reveal_index: -1, current_question: null,
      },
      teams: [], zones: [], used_question_ids: [], used_zone_problem_ids: [], event_log: [],
    };
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log('✅ Fresh database created');
    return;
  }
  db = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  if (!db.used_zone_problem_ids) db.used_zone_problem_ids = [];
  if (!db.used_question_ids) db.used_question_ids = [];
  if (db.app_state.results_reveal_index === undefined) db.app_state.results_reveal_index = -1;
}

let _saveT = null;
function saveDB() {
  if (_saveT) clearTimeout(_saveT);
  _saveT = setTimeout(() => writeFileSync(DB_PATH, JSON.stringify(db, null, 2)), 200);
}

loadDB();

// ── REST ───────────────────────────────────────────────────────
app.get('/api/state', (_, res) => res.json({ app_state: db.app_state }));
app.get('/api/teams', (_, res) => res.json(db.teams.map(({ id, name, color, passcode, year }) => ({ id, name, color, passcode, year }))));

// ── Static Client Files (Production) ───────────────────────────
const clientDistPath = join(__dirname, '../client/dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_, res) => res.sendFile(join(clientDistPath, 'index.html')));
}

app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/health')) {
    const indexPath = join(clientDistPath, 'index.html');
    if (existsSync(indexPath)) return res.sendFile(indexPath);
  }
  next();
});

// ── Socket ─────────────────────────────────────────────────────
registerSocketEvents(io, db, saveDB);

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 DOMINANCE v3 — port ${PORT}`);
  console.log(`   Phase: ${db.app_state.current_phase} | Teams: ${db.teams.length} | Zones: ${db.zones.length}\n`);
});
