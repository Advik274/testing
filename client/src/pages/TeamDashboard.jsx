import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSocket } from '../hooks/useSocket';
import { Navbar, ToastContainer, BatteryBar, CountdownTimer } from '../components/shared/index.jsx';
import { AnnouncementOverlay } from '../components/shared/Announcement.jsx';
import { QuestionCard, EliminationOverlay, Phase1Leaderboard } from '../components/phase1/index.jsx';
import { SubmissionForm } from '../components/phase3/index.jsx';

export default function TeamDashboard() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [showEliminated, setShowEliminated] = useState(false);
  const [phase3Problem, setPhase3Problem] = useState(null);
  // Defense problem selection after capturing a zone
  const [defensePrompt, setDefensePrompt] = useState(null); // { zone_id, zone_name }
  const [defenseOptions, setDefenseOptions] = useState([]); // 5 options
  const [defenseSet, setDefenseSet] = useState(null); // { zone_name, problem_label }

  useEffect(() => {
    const savedId = sessionStorage.getItem('team_id');
    if (!savedId || savedId !== teamId) { navigate('/'); return; }
    const socket = getSocket();
    socket.on('team:eliminated', d => { if (d.team_id === teamId) setShowEliminated(true); });
    socket.on('phase3:problem_revealed', d => { if (d.team_id === 'all' || d.team_id === teamId) setPhase3Problem(d.problem); });

    // After capturing a zone, server tells THIS team to set their defense trap
    socket.on('zone:set_problem_prompt', ({ zone_id, zone_name }) => {
      setDefensePrompt({ zone_id, zone_name });
      setDefenseOptions([]);
      setDefenseSet(null);
      // Immediately request 5 options from server
      socket.emit('zone:set_defense_problem', { zone_id, team_id: teamId });
    });

    // Server responds with 5 options
    socket.on('zone:defense_options', ({ zone_id, zone_name, options }) => {
      setDefensePrompt({ zone_id, zone_name });
      setDefenseOptions(options);
    });

    // Server confirms defense is set
    socket.on('zone:defense_set', ({ zone_name, problem_label }) => {
      setDefenseSet({ zone_name, problem_label });
      setDefenseOptions([]);
      setTimeout(() => { setDefensePrompt(null); setDefenseSet(null); }, 4000);
    });

    return () => {
      socket.off('team:eliminated');
      socket.off('phase3:problem_revealed');
      socket.off('zone:set_problem_prompt');
      socket.off('zone:defense_options');
      socket.off('zone:defense_set');
    };
  }, [teamId]);

  const team = state.teams.find(t => t.id === teamId);

  useEffect(() => {
    if (team?.phase3_problem) setPhase3Problem(team.phase3_problem);
  }, [team?.phase3_problem]);

  if (!team) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>Loading...</div></div>;

  const phase = state.app_state.current_phase;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <AnnouncementOverlay />
      <Navbar subtitle={team.name} />
      <ToastContainer />
      {showEliminated && <EliminationOverlay team={team} onDismiss={() => { setShowEliminated(false); navigate('/spectator'); }} />}

      {/* ── DEFENSE TRAP SELECTOR — full-screen modal after capture ── */}
      {defensePrompt && (
        <div style={{ position:'fixed', inset:0, zIndex:8000, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}>
          <div style={{ maxWidth:560, width:'90%', padding:32, textAlign:'center' }}>
            {defenseSet ? (
              <>
                <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--accent)', marginBottom:8 }}>TRAP SET!</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:14, color:'var(--text2)' }}>{defenseSet.zone_name} is now defended.</div>
                <div style={{ marginTop:12, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text3)' }}>"{defenseSet.problem_label}"</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>🏴</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--accent)', marginBottom:4 }}>YOU CAPTURED {defensePrompt.zone_name}!</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text2)', marginBottom:24 }}>
                  Now set a trap — pick the challenge the next team must solve to take this zone from you.
                </div>
                {defenseOptions.length === 0 ? (
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text3)' }}>Loading options...</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, textAlign:'left' }}>
                    {defenseOptions.map(opt => (
                      <button key={opt.id} onClick={() => {
                        getSocket().emit('zone:confirm_defense', { zone_id: defensePrompt.zone_id, team_id: teamId, problem_id: opt.id });
                      }} style={{
                        padding:'14px 18px', background:'var(--bg3)', border:'1px solid var(--border)',
                        borderRadius:8, color:'var(--text)', textTransform:'none', letterSpacing:'normal',
                        fontFamily:'var(--font-body)', fontSize:14, textAlign:'left',
                        display:'flex', alignItems:'center', gap:12, cursor:'pointer',
                        transition:'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--bg2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg3)'; }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)', minWidth:70, textTransform:'uppercase' }}>{opt.type?.replace('_',' ')}</span>
                        <span style={{ flex:1 }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>

        {(phase === 'setup') && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--accent)', animation: 'glitch 4s infinite', marginBottom: 24 }}>DOMINANCE</div>
            <div className="card" style={{ display: 'inline-block', padding: '20px 40px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>REGISTERED AS</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: team.color }}>{team.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{team.year} Year · Code: {team.passcode}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginTop: 24, fontSize: 13 }}>Waiting for the event to start...</div>
          </div>
        )}

        {phase === 'phase1' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--warning)' }}>THE GAUNTLET</h1>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Round {state.app_state.phase1_round || 0} / 5</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--accent)' }}>{team.phase1_total_score}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>PTS</div>
              </div>
            </div>

            {team.is_eliminated ? (
              <div className="card" style={{ border: '1px solid var(--danger)', textAlign: 'center', padding: 32, marginBottom: 20 }}>
                <div style={{ fontSize: 40 }}>💀</div>
                <div style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)', fontSize: 24, marginTop: 8 }}>ELIMINATED</div>
                <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Final score: {team.phase1_total_score} pts</div>
              </div>
            ) : state.currentQuestion && state.app_state.phase1_round_active ? (
              <div style={{ marginBottom: 20 }}>
                <QuestionCard question={state.currentQuestion.question} teamId={teamId} />
              </div>
            ) : state.roundResult ? (
              <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginBottom: 8 }}>Round {state.roundResult.round_number} complete</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>Answer: <span style={{ color: 'var(--accent)' }}>{state.roundResult.correct_answer}</span></div>
                {state.roundResult.eliminated_ids?.includes(teamId) && <div style={{ color: 'var(--danger)', marginTop: 8 }}>You were eliminated this round.</div>}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>⏳ Waiting for round to start...</div>
              </div>
            )}

            <Phase1Leaderboard teams={state.teams} />
          </div>
        )}

        {phase === 'phase2' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>CAMPUS CONQUEST</h1>
              <CountdownTimer endTime={state.app_state.phase2_timer_end} />
            </div>

            {/* Team battery card */}
            <div className="card card-lg" style={{ marginBottom: 20, border: `1px solid ${team.color}44` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: team.color }}>{team.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: team.battery > 50 ? 'var(--accent)' : team.battery > 20 ? 'var(--warning)' : 'var(--danger)' }}>{team.battery}%</div>
              </div>
              <BatteryBar battery={team.battery} showLabel={false} height={10} />
              <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)' }}>
                Zones captured: {team.zones_captured} · Battery drains 2%/min · Capture zones for +30%
              </div>
            </div>

            {team.is_eliminated ? (
              <div className="card" style={{ border: '1px solid var(--danger)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>💀</div>
                <div style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)', fontSize: 24, marginTop: 8 }}>BATTERY DEPLETED</div>
                <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Your team has been eliminated.</div>
              </div>
            ) : (
              <div className="card card-lg">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 12, color: 'var(--info)' }}>HOW TO PLAY</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['🏃', 'Go to a campus zone physically'],
                    ['📱', 'Enter your team passcode on the zone laptop'],
                    ['🧠', 'Solve the challenge that appears'],
                    ['⚡', 'Capture it! Battery +30%. Zone is permanently yours.'],
                    ['🏆', 'Most zones captured when time runs out = advances to Phase 3'],
                  ].map(([icon, text]) => (
                    <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 6 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warning)' }}>⚠️ Once a zone is captured by any team, it's locked — no one else can take it. Act fast!</div>
                </div>
              </div>
            )}

            {/* Standings */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 12, color: 'var(--text2)' }}>STANDINGS</h3>
              {[...state.teams].filter(t => !t.is_eliminated).sort((a, b) => b.zones_captured - a.zones_captured || b.battery - a.battery).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: i < 4 ? 'var(--accent)' : 'var(--text3)', width: 28 }}>#{i+1}</div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{t.name}{t.id === teamId ? ' (you)' : ''}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)' }}>🏴 {t.zones_captured} · ⚡{t.battery}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'phase3' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--info)', marginBottom: 20 }}>FINAL BUILD</h1>
            {phase3Problem ? (
              <>
                <div className="card card-lg" style={{ border: '1px solid var(--info)', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--info)', marginBottom: 8, letterSpacing: '0.1em' }}>YOUR MISSION</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, lineHeight: 1.8, color: 'var(--text)' }}>{phase3Problem}</div>
                  <div style={{ marginTop: 16 }}><CountdownTimer endTime={state.app_state.phase3_timer_end} label="Time Remaining" /></div>
                </div>
                <SubmissionForm teamId={teamId} teamName={team.name} />
              </>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>⏳ Your problem statement will appear here shortly...</div>
              </div>
            )}
          </div>
        )}

        {phase === 'results' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--purple)', animation: 'glitch 3s infinite', marginBottom: 16 }}>EVENT COMPLETE</div>
            <a href="/spectator"><button className="btn-primary" style={{ fontSize: 16, padding: '12px 32px' }}>View Final Results →</button></a>
          </div>
        )}

      </div>
    </div>
  );
}
