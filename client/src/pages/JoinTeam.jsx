import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../hooks/useSocket';

export default function JoinTeam() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(setTeams).catch(() => {});
  }, []);

  const handleJoin = () => {
    if (!selectedTeam || !passcode) { setError('Select a team and enter your passcode'); return; }
    setLoading(true); setError('');
    const socket = getSocket();
    socket.emit('team:join', { team_id: selectedTeam, passcode });
    const onJoined = ({ team }) => { socket.off('team:joined', onJoined); socket.off('error', onErr); sessionStorage.setItem('team_id', team.id); navigate(`/team/${team.id}`); };
    const onErr = ({ message }) => { socket.off('team:joined', onJoined); socket.off('error', onErr); setError(message); setLoading(false); };
    socket.once('team:joined', onJoined);
    socket.once('error', onErr);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', animation: 'glitch 4s infinite' }}>
            DOMINANCE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 8, letterSpacing: '0.2em' }}>
            EBULLIANCE · REBOOT × CSI × NCC
          </div>
        </div>

        <div className="card card-lg">
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Join Your Team</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' }}>Select Team</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
              <option value="">-- Select your team --</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' }}>Passcode</label>
            <input type="text" placeholder="4-digit code" value={passcode} onChange={e => setPasscode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJoin()} maxLength={4} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 28, letterSpacing: '0.4em' }} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</div>}
          <button className="btn-primary" onClick={handleJoin} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 16 }}>
            {loading ? 'Joining...' : 'Enter the Arena →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', gap: 24, justifyContent: 'center' }}>
          <a href="/spectator" style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>VIEW LEADERBOARD</a>
          <a href="/admin" style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>ADMIN</a>
        </div>
      </div>
    </div>
  );
}
