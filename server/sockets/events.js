import { v4 as uuid } from 'uuid';
import { calcPhase1Score, calcPhase3Score, getPhase1Board, getFinalBoard } from '../lib/scoring.js';
import { startBatteryDrain, stopBatteryDrain } from '../lib/battery.js';
import { getRandomGauntletQuestion, getFiveZoneOptions } from '../lib/questions.js';

const ADMIN = 'dominance2024';
const auth = (t) => t === ADMIN;

const BATTERY_ATTEMPT_COST = 5;   // cost to attempt a zone
const BATTERY_CAPTURE_GAIN = 20;  // gain on successful capture

function log(db, type, message, team_id = null) {
  db.event_log.unshift({ timestamp: new Date().toISOString(), type, message, team_id });
  if (db.event_log.length > 300) db.event_log = db.event_log.slice(0, 300);
}

// Strip sensitive data before sending to clients
function safeZones(zones) {
  return zones.map(({ _pending, ...z }) => ({
    ...z,
    problem: z.problem ? { ...z.problem, answer: undefined } : null,
    is_attempting: !!_pending,
    attempting_team_name: _pending?.team_name || null,
  }));
}

function fullState(db) {
  return {
    app_state: db.app_state,
    teams: db.teams,
    zones: safeZones(db.zones),
    event_log: db.event_log.slice(0, 80),
  };
}

function phase2Board(teams) {
  return [...teams]
    .filter(t => !t.is_eliminated)
    .sort((a, b) => b.zones_captured - a.zones_captured || b.battery - a.battery)
    .map((t, i) => ({ rank: i + 1, team_id: t.id, team_name: t.name, color: t.color, zones: t.zones_captured, battery: t.battery }));
}

export function registerSocketEvents(io, db, saveDB) {
  io.on('connection', (socket) => {
    socket.emit('state:sync', fullState(db));

    // ── TEAM JOIN ─────────────────────────────────────────────────
    socket.on('team:join', ({ team_id, passcode }) => {
      const team = db.teams.find(t => t.id === team_id);
      if (!team || team.passcode !== String(passcode)) { socket.emit('error', { message: 'Invalid team or passcode' }); return; }
      socket.join(`team_${team_id}`);
      socket.emit('team:joined', { team });
    });

    // ── ZONE OPERATOR JOIN ─────────────────────────────────────────
    socket.on('zone:operator_join', ({ zone_id, admin_token }) => {
      if (!auth(admin_token)) { socket.emit('error', { message: 'Invalid admin token' }); return; }
      socket.join(`zone_${zone_id}`);
      socket.emit('zone:operator_ready', { zone: db.zones.find(z => z.id === zone_id) });
    });

    // ── PHASE 1: Submit Answer ────────────────────────────────────
    socket.on('phase1:submit_answer', ({ team_id, question_id, answer, time_taken_ms }) => {
      if (db.app_state.current_phase !== 'phase1' || !db.app_state.phase1_round_active) return;
      const team = db.teams.find(t => t.id === team_id);
      const q = db.app_state.current_question;
      if (!team || !q || team.is_eliminated || q.id !== question_id) return;
      if (team.phase1_scores.find(s => s.round === db.app_state.phase1_round)) return;

      const correct = answer.trim().toLowerCase() === q.answer.trim().toLowerCase();
      const score = correct ? calcPhase1Score(q.points, q.time_limit_seconds, time_taken_ms) : 0;
      team.phase1_scores.push({ round: db.app_state.phase1_round, score, correct, time_taken_ms });
      team.phase1_total_score += score;
      saveDB();
      socket.emit('phase1:answer_result', { correct, score, total: team.phase1_total_score });
      io.emit('leaderboard:phase1', getPhase1Board(db.teams));
    });

    // TODO: Add missing comment for phase2:submit_answer handler
    // PHASE 2: Zone capture attempt flow
    socket.on('phase2:submit_answer', ({ team_id, zone_id, answer, time_taken_ms }) => {
      // ... (truncated)
    });

    // ────────────────────────────────────────────────────────────
    // PHASE 2 ZONE FLOW
    // Step 1: Team arrives → operator enters passcode → system deducts 5% battery
    // Step 2a (neutral zone): challenge from defending team's set problem OR admin default
    // Step 2b (captured zone): defending team ALREADY SET a problem — show it
    // Step 3: Operator selects problem (if first capture) OR problem auto-loads
    // Step 4: Team types their own answer on zone laptop
    // Step 5: Submit → correct = capture, wrong = fail (battery already spent)
    // ─
... (truncated)