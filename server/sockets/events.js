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

    // ────────────────────────────────────────────────────────────
    // PHASE 2 ZONE FLOW
    // Step 1: Team arrives → operator enters passcode → system deducts 5% battery
    // Step 2a (neutral zone): challenge from defending team's set problem OR admin default
    // Step 2b (captured zone): defending team ALREADY SET a problem — show it
    // Step 3: Operator selects problem (if first capture) OR problem auto-loads
    // Step 4: Team types their own answer on zone laptop
    // Step 5: Submit → correct = capture, wrong = fail (battery already spent)
    // ────────────────────────────────────────────────────────────

    // STEP 1: Team arrives at zone
    socket.on('zone:team_arrive', ({ zone_id, team_passcode, admin_token }) => {
      if (!auth(admin_token)) return;
      const zone = db.zones.find(z => z.id === zone_id);
      const team = db.teams.find(t => t.passcode === String(team_passcode));

      if (!zone) { socket.emit('zone:error', { message: 'Zone not found' }); return; }
      if (!team) { socket.emit('zone:error', { message: `No team with passcode "${team_passcode}"` }); return; }
      if (team.is_eliminated) { socket.emit('zone:error', { message: `${team.name} is eliminated` }); return; }
      if (zone._pending) { socket.emit('zone:error', { message: `Zone is busy — ${zone._pending.team_name} is currently attempting. Please wait.` }); return; }

      // Check if zone is captured by THIS team already
      if (zone.owner_team_id === team.id) { socket.emit('zone:error', { message: `${team.name} already owns this zone!` }); return; }

      // Deduct battery cost to attempt
      if (team.battery < BATTERY_ATTEMPT_COST) { socket.emit('zone:error', { message: `Not enough battery! Need ${BATTERY_ATTEMPT_COST}%. Current: ${team.battery}%` }); return; }
      team.battery = Math.max(0, team.battery - BATTERY_ATTEMPT_COST);
      io.emit('team:battery_updated', { team_id: team.id, battery: team.battery });

      if (zone.owner_team_id && zone.problem) {
        // Zone is captured AND defending team has set a problem — go straight to challenge
        zone._pending = { team_id: team.id, team_name: team.name, team_color: team.color, problem: zone.problem };
        saveDB();
        log(db, 'zone_attempt', `${team.name} is attempting ${zone.name} (-${BATTERY_ATTEMPT_COST}% battery)`, team.id);

        // Notify all clients zone is now being attempted
        io.emit('zone:status_update', { zone_id, is_attempting: true, attempting_team_name: team.name });

        socket.emit('zone:challenge_ready', {
          zone_id, zone_name: zone.name,
          team_name: team.name, team_color: team.color,
          battery_remaining: team.battery,
          problem: zone.problem,
          mode: 'attempt',
        });
      } else if (!zone.owner_team_id) {
        // Neutral zone — get 5 random options for operator to pick
        if (!db.used_zone_problem_ids) db.used_zone_problem_ids = [];
        const options = getFiveZoneOptions(db.used_zone_problem_ids);

        zone._pending = { team_id: team.id, team_name: team.name, team_color: team.color, problem: null, options };
        saveDB();
        log(db, 'zone_attempt', `${team.name} is attempting neutral zone ${zone.name} (-${BATTERY_ATTEMPT_COST}% battery)`, team.id);

        io.emit('zone:status_update', { zone_id, is_attempting: true, attempting_team_name: team.name });

        socket.emit('zone:select_problem', {
          zone_id, zone_name: zone.name,
          team_name: team.name, team_color: team.color,
          battery_remaining: team.battery,
          options: options.map(o => ({ id: o.id, label: o.label, type: o.type })),
          mode: 'select',
        });
      } else {
        // Captured zone but no problem set yet (defending team hasn't set one)
        socket.emit('zone:error', { message: 'The defending team has not set a challenge for this zone yet. Ask the zone owner.' });
        // Refund the battery since it's not the team's fault
        team.battery = Math.min(100, team.battery + BATTERY_ATTEMPT_COST);
        io.emit('team:battery_updated', { team_id: team.id, battery: team.battery });
        saveDB();
      }
    });

    // OPERATOR: Select a problem (for neutral zone or defending-team selection)
    socket.on('zone:select_problem', ({ zone_id, problem_id, admin_token }) => {
      if (!auth(admin_token)) return;
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone || !zone._pending || !zone._pending.options) { socket.emit('zone:error', { message: 'No pending selection for this zone' }); return; }

      const chosen = zone._pending.options.find(o => o.id === problem_id);
      if (!chosen) { socket.emit('zone:error', { message: 'Problem not found in options' }); return; }

      // Fetch the full problem from the pool (including the answer)
      import('../lib/questions.js').then(({ ZONE_PROBLEM_POOL }) => {
        const fullProblem = ZONE_PROBLEM_POOL.find(q => q.id === problem_id);
        if (!fullProblem) { socket.emit('zone:error', { message: 'Problem not found in pool' }); return; }

        zone._pending.problem = fullProblem;
        saveDB();

        socket.emit('zone:challenge_ready', {
          zone_id, zone_name: zone.name,
          team_name: zone._pending.team_name,
          team_color: zone._pending.team_color,
          battery_remaining: db.teams.find(t => t.id === zone._pending.team_id)?.battery,
          problem: { ...fullProblem, answer: undefined },
          mode: 'attempt',
        });
      }).catch(err => {
        console.error('Failed to load questions:', err);
        socket.emit('zone:error', { message: 'Server error loading problem' });
      });
    });

    // TEAM: Submit answer (typed directly on zone laptop)
    socket.on('zone:submit_answer', ({ zone_id, answer, admin_token }) => {
      if (!auth(admin_token)) return;
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone || !zone._pending || !zone._pending.problem) { socket.emit('zone:error', { message: 'No active challenge' }); return; }

      const pending = zone._pending;
      const team = db.teams.find(t => t.id === pending.team_id);
      const correct = answer.trim().toLowerCase() === pending.problem.answer.trim().toLowerCase();

      // Clear pending and notify all that zone is no longer being attempted
      zone._pending = null;
      io.emit('zone:status_update', { zone_id, is_attempting: false, attempting_team_name: null });

      if (!correct) {
        saveDB();
        socket.emit('zone:capture_result', {
          success: false, zone_id,
          correct_answer: pending.problem.answer,
          message: `❌ Wrong! The correct answer was: "${pending.problem.answer}"\n${team?.name} failed to capture ${zone.name}.`,
        });
        io.emit('toast:broadcast', { message: `${team?.name} failed to capture ${zone.name}`, type: 'warning' });
        log(db, 'zone_fail', `${team?.name} failed to capture ${zone.name}`, team?.id);
        return;
      }

      // SUCCESS
      const prevOwner = db.teams.find(t => t.id === zone.owner_team_id);
      if (prevOwner) {
        prevOwner.zones_captured = Math.max(0, (prevOwner.zones_captured || 0) - 1);
        prevOwner.zone_ids_captured = (prevOwner.zone_ids_captured || []).filter(z => z !== zone_id);
      }

      if (team) {
        team.battery = Math.min(100, team.battery + BATTERY_CAPTURE_GAIN);
        team.zones_captured = (team.zones_captured || 0) + 1;
        if (!team.zone_ids_captured) team.zone_ids_captured = [];
        team.zone_ids_captured.push(zone_id);
      }

      // Mark problem as used
      if (!db.used_zone_problem_ids) db.used_zone_problem_ids = [];
      if (!db.used_zone_problem_ids.includes(pending.problem.id)) db.used_zone_problem_ids.push(pending.problem.id);

      // Reset zone — new owner, no problem set yet (they need to set their own trap)
      zone.owner_team_id = team?.id || null;
      zone.owner_name = team?.name || null;
      zone.owner_color = team?.color || null;
      zone.captured_at = new Date().toISOString();
      zone.problem = null; // defending team must set new problem

      const msg = `🏴 ${team?.name} captured ${zone.name}! Battery +${BATTERY_CAPTURE_GAIN}% → ${team?.battery}%`;
      log(db, 'capture', msg, team?.id);
      saveDB();

      socket.emit('zone:capture_result', { success: true, zone_id, zone_name: zone.name, team_name: team?.name, battery: team?.battery, message: msg });
      io.emit('zone:captured', { zone_id, zone_name: zone.name, team_id: team?.id, team_name: team?.name, team_color: team?.color, battery: team?.battery });
      io.emit('state:sync', fullState(db));
      io.emit('leaderboard:phase2', phase2Board(db.teams));
      io.emit('toast:broadcast', { message: msg, type: 'success' });
      if (team) io.to(`team_${team.id}`).emit('toast:broadcast', { message: `✅ ${zone.name} captured! Set your trap now to defend it.`, type: 'success' });

      // Notify new owner to set their problem
      io.to(`team_${team?.id}`).emit('zone:set_problem_prompt', { zone_id, zone_name: zone.name });
    });

    // DEFENDING TEAM: Set their problem for captured zone (from team dashboard)
    socket.on('zone:set_defense_problem', ({ zone_id, team_id }) => {
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone || zone.owner_team_id !== team_id) { socket.emit('zone:error', { message: 'Only the zone owner can set the defense problem' }); return; }
      if (!db.used_zone_problem_ids) db.used_zone_problem_ids = [];

      const options = getFiveZoneOptions(db.used_zone_problem_ids);
      socket.emit('zone:defense_options', { zone_id, zone_name: zone.name, options: options.map(o => ({ id: o.id, label: o.label, type: o.type })) });
    });

    // DEFENDING TEAM: Confirm their chosen problem
    socket.on('zone:confirm_defense', ({ zone_id, team_id, problem_id }) => {
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone || zone.owner_team_id !== team_id) return;

      // Dynamic import to get full problem
      import('../lib/questions.js').then(({ ZONE_PROBLEM_POOL }) => {
        const problem = ZONE_PROBLEM_POOL.find(q => q.id === problem_id);
        if (!problem) { socket.emit('zone:error', { message: 'Problem not found' }); return; }

        zone.problem = problem;
        if (!db.used_zone_problem_ids) db.used_zone_problem_ids = [];
        // Don't mark as used yet — mark when someone actually attempts it

        saveDB();
        socket.emit('zone:defense_set', { zone_id, zone_name: zone.name, problem_label: problem.label });
        io.emit('state:sync', fullState(db));
        io.emit('toast:broadcast', { message: `🔒 ${zone.name} is now defended by ${zone.owner_name}!`, type: 'info' });
      });
    });

    // CANCEL attempt
    socket.on('zone:cancel_attempt', ({ zone_id, admin_token }) => {
      if (!auth(admin_token)) return;
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone) return;
      if (zone._pending) {
        // Refund battery
        const team = db.teams.find(t => t.id === zone._pending.team_id);
        if (team) {
          team.battery = Math.min(100, team.battery + BATTERY_ATTEMPT_COST);
          io.emit('team:battery_updated', { team_id: team.id, battery: team.battery });
        }
        zone._pending = null;
        io.emit('zone:status_update', { zone_id, is_attempting: false, attempting_team_name: null });
        saveDB();
      }
      socket.emit('zone:operator_ready', { zone: db.zones.find(z => z.id === zone_id) });
    });

    // PHASE 3: Submit project
    socket.on('phase3:submit_project', ({ team_id, deploy_url, github_url, notes }) => {
      const team = db.teams.find(t => t.id === team_id);
      if (!team || db.app_state.current_phase !== 'phase3') return;
      team.phase3_submission = { deploy_url: deploy_url || '', github_url: github_url || '', notes: notes || '', submitted_at: new Date().toISOString() };
      saveDB();
      socket.emit('phase3:submission_confirmed', { team_id });
      io.emit('toast:broadcast', { message: `📦 ${team.name} submitted their project!`, type: 'success' });
      io.emit('state:sync', fullState(db));
    });

    // ── ADMIN EVENTS ──────────────────────────────────────────────

    socket.on('admin:register_team', ({ name, year, members, admin_token }) => {
      if (!auth(admin_token) || !name?.trim()) return;
      const colors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6','#e11d48','#7c3aed','#0891b2','#16a34a','#d97706'];
      const usedColors = db.teams.map(t => t.color);
      const color = colors.find(c => !usedColors.includes(c)) || `hsl(${Math.random()*360},70%,55%)`;
      const passcode = Math.floor(1000 + Math.random() * 9000).toString();
      const team = { id: uuid(), name: name.trim(), year: year || '2nd', members: members || [], passcode, color, battery: 100, is_eliminated: false, elimination_phase: null, zones_captured: 0, zone_ids_captured: [], phase1_scores: [], phase1_total_score: 0, phase3_submission: null, phase3_judge_scores: null, phase3_problem: null };
      db.teams.push(team);
      saveDB();
      io.emit('state:sync', fullState(db));
      socket.emit('admin:team_registered', { team });
    });

    socket.on('admin:delete_team', ({ team_id, admin_token }) => {
      if (!auth(admin_token)) return;
      db.teams = db.teams.filter(t => t.id !== team_id);
      saveDB(); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:create_zone', ({ name, location, admin_token }) => {
      if (!auth(admin_token) || !name?.trim()) return;
      const zone = { id: `zone_${uuid().slice(0, 6)}`, name: name.trim(), location: location?.trim() || '', owner_team_id: null, owner_name: null, owner_color: null, captured_at: null, problem: null, _pending: null };
      db.zones.push(zone);
      saveDB(); io.emit('state:sync', fullState(db));
      socket.emit('admin:zone_created', { zone });
    });

    socket.on('admin:delete_zone', ({ zone_id, admin_token }) => {
      if (!auth(admin_token)) return;
      db.zones = db.zones.filter(z => z.id !== zone_id);
      saveDB(); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:start_phase', ({ phase, admin_token }) => {
      if (!auth(admin_token)) return;
      db.app_state.current_phase = phase;
      if (phase === 'phase1') { db.app_state.phase1_round = 0; db.app_state.phase1_round_active = false; db.app_state.current_question = null; if (!db.used_question_ids) db.used_question_ids = []; }
      if (phase === 'phase2') { db.app_state.phase2_timer_end = new Date(Date.now() + 90 * 60 * 1000).toISOString(); startBatteryDrain(db, io, saveDB); }
      if (phase === 'phase3') { stopBatteryDrain(); db.app_state.phase3_timer_end = new Date(Date.now() + 150 * 60 * 1000).toISOString(); }
      if (phase === 'results') { db.app_state.results_reveal_index = -1; stopBatteryDrain(); }
      log(db, 'phase_change', `Phase → ${phase}`);
      saveDB();
      io.emit('phase:changed', { new_phase: phase });
      io.emit('state:sync', fullState(db));
    });

    socket.on('admin:next_round', ({ admin_token }) => {
      if (!auth(admin_token) || db.app_state.current_phase !== 'phase1' || db.app_state.phase1_round >= 5) return;
      if (!db.used_question_ids) db.used_question_ids = [];
      const round = db.app_state.phase1_round + 1;
      const q = getRandomGauntletQuestion(db.used_question_ids, round);
      if (!q) { socket.emit('error', { message: 'No questions available' }); return; }
      db.used_question_ids.push(q.id);
      db.app_state.phase1_round = round;
      db.app_state.phase1_round_active = true;
      db.app_state.current_question = q;
      saveDB();
      io.emit('phase1:round_started', { round_number: round, question: { ...q, answer: undefined }, time_limit_seconds: q.time_limit_seconds });
      io.emit('state:sync', fullState(db));
      io.emit('toast:broadcast', { message: `⚡ Round ${round} — ${q.time_limit_seconds}s clock!`, type: 'info' });
    });

    socket.on('admin:end_round', ({ eliminate_count, admin_token }) => {
      if (!auth(admin_token) || !db.app_state.phase1_round_active) return;
      db.app_state.phase1_round_active = false;
      const round = db.app_state.phase1_round;
      const q = db.app_state.current_question;
      const active = db.teams.filter(t => !t.is_eliminated).sort((a, b) => b.phase1_total_score - a.phase1_total_score);
      const count = Math.min(Math.max(0, parseInt(eliminate_count) || 0), active.length - 1);
      const toElim = active.slice(active.length - count);
      const eliminatedIds = [];
      toElim.forEach(t => { t.is_eliminated = true; t.elimination_phase = 'phase1'; eliminatedIds.push(t.id); log(db, 'elimination', `💀 ${t.name} eliminated after Round ${round}`, t.id); io.emit('team:eliminated', { team_id: t.id, team_name: t.name }); });
      saveDB();
      io.emit('phase1:round_ended', { round_number: round, correct_answer: q?.answer, eliminated_count: count, eliminated_ids: eliminatedIds });
      io.emit('leaderboard:phase1', getPhase1Board(db.teams));
      io.emit('state:sync', fullState(db));
      io.emit('toast:broadcast', { message: `Round ${round} done. ${count} eliminated. ${active.length - count} remain.`, type: 'warning' });
    });

    socket.on('admin:eliminate_team', ({ team_id, admin_token }) => {
      if (!auth(admin_token)) return;
      const t = db.teams.find(t => t.id === team_id);
      if (!t) return;
      t.is_eliminated = true; t.elimination_phase = db.app_state.current_phase;
      log(db, 'elimination', `💀 ${t.name} manually eliminated`, team_id);
      saveDB(); io.emit('team:eliminated', { team_id, team_name: t.name }); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:restore_team', ({ team_id, admin_token }) => {
      if (!auth(admin_token)) return;
      const t = db.teams.find(t => t.id === team_id);
      if (!t) return;
      t.is_eliminated = false; t.elimination_phase = null;
      saveDB(); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:override_battery', ({ team_id, battery, admin_token }) => {
      if (!auth(admin_token)) return;
      const t = db.teams.find(t => t.id === team_id);
      if (!t) return;
      t.battery = Math.max(0, Math.min(100, Number(battery)));
      saveDB(); io.emit('team:battery_updated', { team_id, battery: t.battery }); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:reset_zone', ({ zone_id, admin_token }) => {
      if (!auth(admin_token)) return;
      const zone = db.zones.find(z => z.id === zone_id);
      if (!zone) return;
      if (zone.owner_team_id) { const owner = db.teams.find(t => t.id === zone.owner_team_id); if (owner) { owner.zones_captured = Math.max(0, (owner.zones_captured || 1) - 1); owner.zone_ids_captured = (owner.zone_ids_captured || []).filter(z => z !== zone_id); } }
      Object.assign(zone, { owner_team_id: null, owner_name: null, owner_color: null, captured_at: null, problem: null, _pending: null });
      saveDB(); io.emit('state:sync', fullState(db)); io.emit('zone:status_update', { zone_id, is_attempting: false, attempting_team_name: null });
    });

    socket.on('admin:assign_problem', ({ team_id, problem, admin_token }) => {
      if (!auth(admin_token)) return;
      if (team_id === 'all') { db.teams.forEach(t => { t.phase3_problem = problem; }); db.app_state.phase3_problem = problem; io.emit('phase3:problem_revealed', { problem, team_id: 'all' }); }
      else { const t = db.teams.find(t => t.id === team_id); if (t) { t.phase3_problem = problem; io.to(`team_${team_id}`).emit('phase3:problem_revealed', { problem, team_id }); } }
      saveDB(); io.emit('state:sync', fullState(db));
    });

    socket.on('admin:set_phase3_scores', ({ team_id, scores, admin_token }) => {
      if (!auth(admin_token)) return;
      const t = db.teams.find(t => t.id === team_id);
      if (!t) return;
      t.phase3_judge_scores = { ...scores, total: calcPhase3Score(scores.ui, scores.functionality, scores.problem_fit) };
      saveDB(); io.emit('leaderboard:final', getFinalBoard(db.teams)); io.emit('state:sync', fullState(db));
    });

    // Results reveal — sends full-screen takeover to ALL clients
    socket.on('admin:reveal_next', ({ admin_token }) => {
      if (!auth(admin_token)) return;
      const idx = (db.app_state.results_reveal_index ?? -1) + 1;
      db.app_state.results_reveal_index = idx;
      const board = getFinalBoard(db.teams);
      const revealBoard = [...board].reverse(); // worst to best
      const revealed = revealBoard[idx];
      saveDB();
      // Broadcast full-screen announcement to EVERYONE
      io.emit('results:announce', {
        index: idx,
        total: revealBoard.length,
        team: revealed || null,
        actual_rank: revealed ? board.indexOf(revealed) : -1,
        is_winner: revealed ? board.indexOf(revealed) === 0 : false,
        is_last: idx >= revealBoard.length - 1,
      });
    });

    socket.on('admin:reset_reveal', ({ admin_token }) => {
      if (!auth(admin_token)) return;
      db.app_state.results_reveal_index = -1;
      saveDB(); io.emit('results:announce', { index: -1, team: null });
    });

    socket.on('admin:broadcast', ({ message, type, admin_token }) => {
      if (!auth(admin_token)) return;
      io.emit('toast:broadcast', { message, type: type || 'info' });
    });

    socket.on('disconnect', () => {});
  });
}
