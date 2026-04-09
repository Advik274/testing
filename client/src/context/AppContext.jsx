import { createContext, useContext, useReducer } from 'react';
import { useSocket, getSocket } from '../hooks/useSocket';

const AppContext = createContext(null);

const init = {
  app_state: { current_phase: 'setup', phase1_round: 0, phase1_round_active: false, results_reveal_index: -1 },
  teams: [], zones: [], event_log: [],
  leaderboard: [], toasts: [],
  currentQuestion: null, roundResult: null,
  // Results announcement — shown full-screen on ALL devices
  announcement: null, // { index, total, team, actual_rank, is_winner, is_last }
};

function reducer(state, { type, payload }) {
  switch (type) {
    case 'STATE_SYNC':       return { ...state, ...payload };
    case 'PHASE_CHANGED':    return { ...state, app_state: { ...state.app_state, current_phase: payload.new_phase }, currentQuestion: null, roundResult: null };
    case 'BATTERY_UPDATED':  return { ...state, teams: state.teams.map(t => t.id === payload.team_id ? { ...t, battery: payload.battery } : t) };
    case 'TEAM_ELIMINATED':  return { ...state, teams: state.teams.map(t => t.id === payload.team_id ? { ...t, is_eliminated: true } : t) };
    case 'LEADERBOARD':      return { ...state, leaderboard: payload };
    case 'ROUND_STARTED':    return { ...state, currentQuestion: payload, roundResult: null, app_state: { ...state.app_state, phase1_round: payload.round_number, phase1_round_active: true } };
    case 'ROUND_ENDED':      return { ...state, roundResult: payload, app_state: { ...state.app_state, phase1_round_active: false } };
    case 'ANNOUNCEMENT':     return { ...state, announcement: payload.index === -1 ? null : payload };
    case 'CLEAR_ANNOUNCEMENT': return { ...state, announcement: null };
    case 'ZONE_STATUS':      return { ...state, zones: state.zones.map(z => z.id === payload.zone_id ? { ...z, is_attempting: payload.is_attempting, attempting_team_name: payload.attempting_team_name } : z) };
    case 'ZONE_CAPTURED':    return { ...state, zones: state.zones.map(z => z.id === payload.zone_id ? { ...z, owner_team_id: payload.team_id, owner_name: payload.team_name, owner_color: payload.team_color, is_attempting: false, attempting_team_name: null } : z) };
    case 'ADD_TOAST': {
      const id = payload.id || Date.now() + Math.random();
      return { ...state, toasts: [{ ...payload, id }, ...state.toasts].slice(0, 5) };
    }
    case 'REMOVE_TOAST':     return { ...state, toasts: state.toasts.filter(t => t.id !== payload) };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  const addToast = (data) => {
    const id = Date.now() + Math.random();
    dispatch({ type: 'ADD_TOAST', payload: { ...data, id } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4500);
  };

  useSocket({
    'state:sync':          (d) => dispatch({ type: 'STATE_SYNC', payload: d }),
    'phase:changed':       (d) => dispatch({ type: 'PHASE_CHANGED', payload: d }),
    'team:battery_updated':(d) => dispatch({ type: 'BATTERY_UPDATED', payload: d }),
    'team:eliminated':     (d) => dispatch({ type: 'TEAM_ELIMINATED', payload: d }),
    'leaderboard:phase1':  (d) => dispatch({ type: 'LEADERBOARD', payload: d }),
    'leaderboard:phase2':  (d) => dispatch({ type: 'LEADERBOARD', payload: d }),
    'leaderboard:final':   (d) => dispatch({ type: 'LEADERBOARD', payload: d }),
    'phase1:round_started':(d) => dispatch({ type: 'ROUND_STARTED', payload: d }),
    'phase1:round_ended':  (d) => dispatch({ type: 'ROUND_ENDED', payload: d }),
    'results:announce':    (d) => dispatch({ type: 'ANNOUNCEMENT', payload: d }),
    'zone:status_update':  (d) => dispatch({ type: 'ZONE_STATUS', payload: d }),
    'zone:captured':       (d) => dispatch({ type: 'ZONE_CAPTURED', payload: d }),
    'toast:broadcast':     (d) => addToast(d),
  });

  const emit = (event, data = {}) => getSocket().emit(event, { ...data, admin_token: 'dominance2024' });

  return <AppContext.Provider value={{ state, dispatch, emit, addToast }}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
