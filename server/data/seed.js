// Minimal seed - just creates empty db structure. Teams/zones added by admin at runtime.
import { writeFileSync } from 'fs';

const db = {
  app_state: {
    current_phase: 'setup',
    phase1_round: 0,
    phase1_round_active: false,
    phase1_eliminate_count: 0,
    phase2_timer_end: null,
    phase3_timer_end: null,
    battery_drain_interval_ms: 60000,
    battery_drain_percent_per_tick: 2,
    phase3_problem: null,
    results_reveal_index: -1,
  },
  teams: [],
  zones: [],
  phase1_questions: [],
  used_question_ids: [],
  event_log: [],
};

writeFileSync('./data/db.json', JSON.stringify(db, null, 2));
console.log('✅ Fresh database created. Register teams and zones from the Admin panel.');
