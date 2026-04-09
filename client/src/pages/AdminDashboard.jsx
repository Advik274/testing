import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar, ToastContainer, BatteryBar } from '../components/shared/index.jsx';
import { Phase1Leaderboard } from '../components/phase1/index.jsx';
import { AnnouncementOverlay } from '../components/shared/Announcement.jsx';

const PROBLEMS = [
  'Build a real-time feedback portal where users submit ratings and see live averages.',
  'Create a task manager with priorities, deadlines, and team member assignment.',
  'Build a campus event finder — events listed, RSVP, capacity tracked live.',
  'Create a code snippet sharing app with syntax highlighting and upvotes.',
  'Build a team budget tracker with expense categories and visual breakdown.',
  'Build a simple quiz app where admin adds questions and participants answer live.',
  'Create a lost-and-found portal for your college campus with search and filters.',
  'Build a study group finder — students post subjects, others join groups.',
];

export default function AdminDashboard() {
  const { state, emit } = useApp();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState('setup');

  const [teamName, setTeamName] = useState('');
  const [teamYear, setTeamYear] = useState('2nd');
  const [teamMembers, setTeamMembers] = useState('');
  const [regMsg, setRegMsg] = useState('');

  const [zoneName, setZoneName] = useState('');
  const [zoneLocation, setZoneLocation] = useState('');

  const [eliminateCount, setEliminateCount] = useState(0);

  const [selectedProblem, setSelectedProblem] = useState(PROBLEMS[0]);
  const [customProblem, setCustomProblem] = useState('');
  const [problemTarget, setProblemTarget] = useState('all');

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [battOverride, setBattOverride] = useState({});

  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="card card-lg" style={{ maxWidth:340, width:'90%', textAlign:'center' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--accent)', marginBottom:20 }}>ADMIN ACCESS</div>
        <input value={pin} onChange={e=>setPin(e.target.value)} placeholder="Admin token" type="password" onKeyDown={e=>e.key==='Enter'&&setAuthed(pin==='dominance2024')} style={{ textAlign:'center', marginBottom:12 }}/>
        <button className="btn-primary" onClick={()=>setAuthed(pin==='dominance2024')} style={{ width:'100%' }}>Enter</button>
        {pin&&pin!=='dominance2024'&&<div style={{ color:'var(--danger)', marginTop:8, fontSize:13 }}>Wrong token</div>}
      </div>
    </div>
  );

  const phase = state.app_state.current_phase;
  const activeTeams = state.teams.filter(t=>!t.is_eliminated);
  const phases = ['setup','phase1','phase2','phase3','results'];
  const phaseLabels = { setup:'Setup', phase1:'Phase 1', phase2:'Phase 2', phase3:'Phase 3', results:'Results' };
  const phaseColors = { setup:'var(--text3)', phase1:'var(--warning)', phase2:'var(--accent)', phase3:'var(--info)', results:'var(--purple)' };
  const currentIdx = phases.indexOf(phase);
  const nextPhase = phases[currentIdx+1];

  const registerTeam = () => {
    if (!teamName.trim()) return;
    emit('admin:register_team', { name:teamName.trim(), year:teamYear, members:teamMembers.split(',').map(m=>m.trim()).filter(Boolean) });
    setRegMsg('⏳ Registering...');
    // Response comes via state:sync — just show confirmation after brief delay
    setTimeout(() => {
      const found = state.teams.slice(-1)[0];
      setTeamName(''); setTeamMembers('');
      setRegMsg('✅ Team registered! Check teams list below for the passcode.');
      setTimeout(() => setRegMsg(''), 6000);
    }, 600);
  };

  const tabs = [
    { key:'setup',   label:'⚙️ Setup' },
    { key:'control', label:'🎮 Control' },
    { key:'teams',   label:`👥 Teams (${state.teams.length})` },
    { key:'zones',   label:'🗺️ Zones' },
    { key:'phase3',  label:'🏗️ Phase 3' },
    { key:'results', label:'🏆 Results' },
    { key:'log',     label:'📋 Log' },
  ];

  return (
    <div style={{ minHeight:'100vh', paddingBottom:40 }}>
      <AnnouncementOverlay />
      <Navbar title="ADMIN PANEL"/>
      <ToastContainer/>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'16px' }}>

        {/* Status bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[['Phase', phaseLabels[phase], phaseColors[phase]], ['Active', activeTeams.length, 'var(--accent)'], ['Zones', `${state.zones.filter(z=>z.owner_team_id).length}/${state.zones.length}`, 'var(--info)'], ['Round', phase==='phase1'?`${state.app_state.phase1_round}/5`:'—', 'var(--warning)']].map(([l,v,c])=>(
            <div key={l} className="card" style={{ textAlign:'center', padding:12 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, flexWrap:'wrap' }}>
          {tabs.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{ padding:'7px 14px', borderRadius:6, background:tab===t.key?'var(--bg3)':'transparent', border:`1px solid ${tab===t.key?'var(--border2)':'transparent'}`, color:tab===t.key?'var(--text)':'var(--text3)', fontFamily:'var(--font-mono)', fontSize:11 }}>{t.label}</button>
          ))}
        </div>

        {/* ── SETUP ─────────────────────────────────────────────── */}
        {tab==='setup'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="card card-lg">
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:16, color:'var(--warning)' }}>TEAM REGISTRATION</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:4, textTransform:'uppercase' }}>Team Name *</label>
                  <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="e.g. Team Alpha" onKeyDown={e=>e.key==='Enter'&&registerTeam()}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:4, textTransform:'uppercase' }}>Year</label>
                  <select value={teamYear} onChange={e=>setTeamYear(e.target.value)}>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:4, textTransform:'uppercase' }}>Members (comma separated)</label>
                <input value={teamMembers} onChange={e=>setTeamMembers(e.target.value)} placeholder="Alice, Bob, Charlie"/>
              </div>
              <button className="btn-primary" onClick={registerTeam} disabled={!teamName.trim()} style={{ width:'100%' }}>Register + Auto-Generate Passcode</button>
              {regMsg&&<div style={{ marginTop:10, padding:'10px 14px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:13, color:'var(--accent)' }}>{regMsg}</div>}
            </div>

            {state.teams.length>0&&(
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:12 }}>TEAMS ({state.teams.length})</h3>
                {state.teams.map(t=>(
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:t.color }}/>
                    <div style={{ flex:1 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:14 }}>{t.name}</span>
                      <span style={{ marginLeft:8, fontSize:11, color:'var(--text3)' }}>{t.year} · {t.members?.join(', ')||'—'}</span>
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'var(--accent)', letterSpacing:'0.3em' }}>{t.passcode}</div>
                    <button onClick={()=>emit('admin:delete_team',{team_id:t.id})} style={{ background:'none', border:'none', color:'var(--danger)', fontSize:18, cursor:'pointer', padding:'0 6px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="card card-lg">
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:16, color:'var(--info)' }}>ZONE SETUP</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:4, textTransform:'uppercase' }}>Zone Name *</label>
                  <input value={zoneName} onChange={e=>setZoneName(e.target.value)} placeholder="e.g. CS Lab Block"/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:4, textTransform:'uppercase' }}>Location</label>
                  <input value={zoneLocation} onChange={e=>setZoneLocation(e.target.value)} placeholder="e.g. Block A, Ground Floor"/>
                </div>
              </div>
              <button className="btn-info" onClick={()=>{ emit('admin:create_zone',{name:zoneName,location:zoneLocation}); setZoneName(''); setZoneLocation(''); }} disabled={!zoneName.trim()} style={{ width:'100%' }}>Add Zone</button>
            </div>

            {state.zones.length>0&&(
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:12 }}>ZONES ({state.zones.length})</h3>
                {state.zones.map((z,i)=>(
                  <div key={z.id} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', width:24 }}>Z{i+1}</span>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:14, fontWeight:500 }}>{z.name}</span>
                      {z.location&&<span style={{ marginLeft:8, fontSize:11, color:'var(--text3)' }}>{z.location}</span>}
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>{z.id}</span>
                    <button onClick={()=>emit('admin:delete_zone',{zone_id:z.id})} style={{ background:'none', border:'none', color:'var(--danger)', fontSize:16, cursor:'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONTROL ───────────────────────────────────────────── */}
        {tab==='control'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card card-lg">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:16, color:'var(--text2)' }}>PHASE CONTROL</h3>
              <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
                {phases.map((p,i)=>(
                  <div key={p} style={{ padding:'4px 14px', borderRadius:4, background:p===phase?`${phaseColors[p]}22`:i<currentIdx?'rgba(0,255,136,0.06)':'var(--bg3)', border:`1px solid ${p===phase?phaseColors[p]:i<currentIdx?'rgba(0,255,136,0.3)':'var(--border)'}`, color:p===phase?phaseColors[p]:i<currentIdx?'var(--accent)':'var(--text3)', fontFamily:'var(--font-mono)', fontSize:11 }}>
                    {i<currentIdx?'✓ ':p===phase?'● ':'○ '}{phaseLabels[p]}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
                {nextPhase&&<button className="btn-primary" onClick={()=>{ if(confirm(`Advance to ${phaseLabels[nextPhase]}?`)) emit('admin:start_phase',{phase:nextPhase}); }} style={{ fontSize:15, padding:'12px 28px' }}>▶ Advance to {phaseLabels[nextPhase]}</button>}
                {phase==='phase1'&&<>
                  <button className="btn-warning" onClick={()=>emit('admin:next_round',{})} disabled={state.app_state.phase1_round_active||state.app_state.phase1_round>=5}>⚡ Start Round {state.app_state.phase1_round+1}</button>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="number" min="0" max={activeTeams.length-1} value={eliminateCount} onChange={e=>setEliminateCount(e.target.value)} style={{ width:90 }} placeholder="# elim"/>
                    <button className="btn-danger" onClick={()=>{ if(confirm(`End round and eliminate ${eliminateCount}?`)) emit('admin:end_round',{eliminate_count:eliminateCount}); }} disabled={!state.app_state.phase1_round_active}>End + Eliminate {eliminateCount}</button>
                  </div>
                </>}
              </div>
              {phase==='phase1'&&state.app_state.phase1_round_active&&state.app_state.current_question&&(
                <div style={{ padding:'12px 16px', background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.3)', borderRadius:6 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--warning)', marginBottom:4 }}>ACTIVE QUESTION — Round {state.app_state.phase1_round}</div>
                  <div style={{ fontSize:14, marginBottom:4 }}>{state.app_state.current_question.question}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)' }}>Answer: {state.app_state.current_question.answer}</div>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:12 }}>BROADCAST</h3>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                {['info','success','warning','danger'].map(t=>(
                  <button key={t} onClick={()=>setBroadcastType(t)} style={{ padding:'4px 12px', background:broadcastType===t?'var(--bg3)':'transparent', border:'1px solid var(--border)', color:`var(--${t==='success'?'accent':t==='info'?'info':t})`, fontFamily:'var(--font-mono)', fontSize:11 }}>{t}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Message to all screens..." onKeyDown={e=>e.key==='Enter'&&broadcastMsg&&(emit('admin:broadcast',{message:broadcastMsg,type:broadcastType}),setBroadcastMsg(''))}/>
                <button className="btn-ghost" onClick={()=>{ emit('admin:broadcast',{message:broadcastMsg,type:broadcastType}); setBroadcastMsg(''); }}>Send</button>
              </div>
            </div>

            {phase==='results'&&(
              <div className="card card-lg" style={{ border:'1px solid var(--purple)' }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8, color:'var(--purple)' }}>DRAMATIC REVEAL</h3>
                <div style={{ color:'var(--text3)', fontSize:13, marginBottom:16 }}>Each click reveals the next team on ALL screens simultaneously — worst to best.</div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn-primary" onClick={()=>emit('admin:reveal_next',{})} style={{ flex:1, padding:14, fontSize:16 }}>▶ Reveal Next</button>
                  <button className="btn-ghost" onClick={()=>emit('admin:reset_reveal',{})}>Reset</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEAMS ─────────────────────────────────────────────── */}
        {tab==='teams'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {state.teams.map(team=>(
              <div key={team.id} className="card" style={{ border:`1px solid ${team.color}33`, opacity:team.is_eliminated?0.55:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:team.color }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:15 }}>{team.name} <span style={{ fontSize:11, color:'var(--text3)' }}>{team.year}</span></div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', marginTop:2 }}>Code: <span style={{ color:'var(--accent)' }}>{team.passcode}</span> · Score: {team.phase1_total_score} · Zones: {team.zones_captured}</div>
                  </div>
                  {phase==='phase2'&&<div style={{ minWidth:100 }}><BatteryBar battery={team.battery} height={6}/></div>}
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    {phase==='phase2'&&<>
                      <input type="number" min="0" max="100" value={battOverride[team.id]??''} onChange={e=>setBattOverride(b=>({...b,[team.id]:e.target.value}))} placeholder="bat%" style={{ width:60, padding:'4px 6px', fontSize:12 }}/>
                      <button className="btn-ghost" onClick={()=>emit('admin:override_battery',{team_id:team.id,battery:battOverride[team.id]})} style={{ padding:'4px 8px', fontSize:11 }}>Set</button>
                    </>}
                    {team.is_eliminated
                      ?<button className="btn-ghost" onClick={()=>emit('admin:restore_team',{team_id:team.id})} style={{ fontSize:11, padding:'4px 10px', color:'var(--accent)' }}>Restore</button>
                      :<button className="btn-danger" onClick={()=>{ if(confirm(`Eliminate ${team.name}?`)) emit('admin:eliminate_team',{team_id:team.id}); }} style={{ padding:'4px 10px', fontSize:11 }}>Eliminate</button>
                    }
                    {team.is_eliminated&&<span className="badge badge-danger">OUT</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ZONES ─────────────────────────────────────────────── */}
        {tab==='zones'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:'10px 14px', background:'rgba(0,170,255,0.08)', border:'1px solid rgba(0,170,255,0.2)', borderRadius:6 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--info)' }}>Zone laptop URL format: <strong>http://[YOUR_IP]:5173/zone/[ZONE_ID]</strong></div>
            </div>
            {state.zones.map((z,i)=>(
              <div key={z.id} className="card" style={{ border:`1px solid ${z.owner_team_id?z.owner_color+'66':'var(--border)'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:16 }}>Z{i+1} — {z.name}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', marginTop:2 }}>ID: {z.id}{z.location&&` · ${z.location}`}</div>
                    {z.owner_team_id&&<div style={{ fontSize:12, color:z.owner_color, marginTop:4 }}>🏴 {z.owner_name} {z.problem?'· 🔒 Defense set':'· ⚠️ No defense set'}</div>}
                    {z.is_attempting&&<div style={{ fontSize:12, color:'var(--warning)', marginTop:2 }}>⚡ {z.attempting_team_name} is attempting...</div>}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {z.owner_team_id&&<button className="btn-ghost" onClick={()=>emit('admin:reset_zone',{zone_id:z.id})} style={{ padding:'4px 10px', fontSize:11 }}>Reset</button>}
                    <span className={`badge ${z.owner_team_id?'badge-success':'badge-info'}`}>{z.owner_team_id?'CAPTURED':'NEUTRAL'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PHASE 3 ───────────────────────────────────────────── */}
        {tab==='phase3'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card card-lg" style={{ border:'1px solid var(--info)' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:16, color:'var(--info)' }}>ASSIGN PROBLEMS</h3>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:6, textTransform:'uppercase' }}>Assign To</label>
                <select value={problemTarget} onChange={e=>setProblemTarget(e.target.value)}>
                  <option value="all">All Teams (same problem)</option>
                  {state.teams.filter(t=>!t.is_eliminated).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                {PROBLEMS.map((p,i)=>(
                  <button key={i} onClick={()=>{ setSelectedProblem(p); setCustomProblem(''); }} style={{ textAlign:'left', padding:'10px 14px', background:selectedProblem===p&&!customProblem?'rgba(0,170,255,0.1)':'var(--bg3)', border:`1px solid ${selectedProblem===p&&!customProblem?'var(--info)':'var(--border)'}`, borderRadius:6, color:'var(--text)', textTransform:'none', letterSpacing:'normal', fontFamily:'var(--font-body)', fontSize:13, lineHeight:1.5 }}>{p}</button>
                ))}
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:10, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:6, textTransform:'uppercase' }}>Or custom:</label>
                <textarea value={customProblem} onChange={e=>{ setCustomProblem(e.target.value); setSelectedProblem(''); }} rows={3} placeholder="Type your own problem..."/>
              </div>
              <button className="btn-info" onClick={()=>emit('admin:assign_problem',{team_id:problemTarget,problem:customProblem.trim()||selectedProblem})} style={{ width:'100%', padding:14, fontSize:15 }}>
                🚀 Reveal Problem to {problemTarget==='all'?'All Teams':state.teams.find(t=>t.id===problemTarget)?.name}
              </button>
            </div>

            {/* Judge panel */}
            <div className="card">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:16 }}>JUDGE SUBMISSIONS</h3>
              {state.teams.filter(t=>t.phase3_submission).length===0&&<div style={{ textAlign:'center', padding:24, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>No submissions yet.</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {state.teams.filter(t=>t.phase3_submission).map(team=>(
                  <JudgeCard key={team.id} team={team} onScore={scores=>emit('admin:set_phase3_scores',{team_id:team.id,scores})}/>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────── */}
        {tab==='results'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card card-lg" style={{ border:'1px solid var(--purple)' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8, color:'var(--purple)' }}>DRAMATIC REVEAL</h3>
              <div style={{ color:'var(--text3)', fontSize:13, marginBottom:16 }}>Full-screen overlay appears on ALL screens (teams, operators, spectator) simultaneously. Worst place → 1st place.</div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-primary" onClick={()=>emit('admin:reveal_next',{})} style={{ flex:1, padding:14, fontSize:16 }}>▶ Reveal Next</button>
                <button className="btn-ghost" onClick={()=>emit('admin:reset_reveal',{})}>Reset</button>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:12 }}>SCORES</h3>
              {[...state.teams].filter(t=>t.phase3_judge_scores).sort((a,b)=>b.phase3_judge_scores.total-a.phase3_judge_scores.total).map((t,i)=>(
                <div key={t.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:16, width:32, color:['#FFD700','#C0C0C0','#CD7F32'][i]||'var(--text3)' }}>#{i+1}</div>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:t.color }}/>
                  <div style={{ flex:1, fontFamily:'var(--font-display)', fontSize:15 }}>{t.name}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'var(--accent)' }}>{t.phase3_judge_scores.total}/100</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOG ───────────────────────────────────────────────── */}
        {tab==='log'&&(
          <div className="card" style={{ maxHeight:600, overflowY:'auto' }}>
            {state.event_log.length===0&&<div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>No events yet.</div>}
            {state.event_log.map((log,i)=>{
              const c = { capture:'var(--accent)', elimination:'var(--danger)', phase_change:'var(--info)', zone_attempt:'var(--warning)', zone_fail:'var(--danger)' };
              return (
                <div key={i} style={{ display:'flex', gap:12, padding:'8px 12px', background:i%2===0?'var(--bg3)':'transparent', borderRadius:4 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', whiteSpace:'nowrap', marginTop:2 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span style={{ fontSize:13, color:c[log.type]||'var(--text2)' }}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

// Editable judge score card
function JudgeCard({ team, onScore }) {
  const existing = team.phase3_judge_scores;
  const [scores, setScores] = useState({ ui:existing?.ui??'', functionality:existing?.functionality??'', problem_fit:existing?.problem_fit??'' });
  const [editing, setEditing] = useState(!existing);

  const total = scores.ui!==''&&scores.functionality!==''&&scores.problem_fit!==''
    ? Math.round((Number(scores.ui)*0.3+Number(scores.functionality)*0.4+Number(scores.problem_fit)*0.3)*10) : existing?.total;

  const submit = () => { onScore({ ui:Number(scores.ui), functionality:Number(scores.functionality), problem_fit:Number(scores.problem_fit) }); setEditing(false); };

  return (
    <div style={{ padding:'14px', background:'var(--bg3)', borderRadius:8, border:`1px solid ${team.color}33` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:team.color }}/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:15 }}>{team.name}</span>
          {existing&&!editing&&<span className="badge badge-success">Scored: {existing.total}</span>}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {team.phase3_submission?.deploy_url&&<a href={team.phase3_submission.deploy_url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', fontSize:12, fontFamily:'var(--font-mono)' }}>🌐 Deployed</a>}
          {team.phase3_submission?.github_url&&<a href={team.phase3_submission.github_url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--info)', fontSize:12, fontFamily:'var(--font-mono)' }}>📦 GitHub</a>}
          {existing&&!editing&&<button onClick={()=>setEditing(true)} className="btn-ghost" style={{ padding:'3px 10px', fontSize:11 }}>Edit</button>}
        </div>
      </div>
      {team.phase3_submission?.notes&&<div style={{ fontSize:12, color:'var(--text2)', padding:'6px 10px', background:'var(--bg2)', borderRadius:4, marginBottom:10 }}>{team.phase3_submission.notes}</div>}

      {editing ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
            {[['ui','UI (30%)'],['functionality','Func. (40%)'],['problem_fit','Fit (30%)']].map(([k,l])=>(
              <div key={k}>
                <label style={{ display:'block', fontSize:9, color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{l}</label>
                <input type="number" min="0" max="10" value={scores[k]} onChange={e=>setScores(s=>({...s,[k]:e.target.value}))} placeholder="0-10" style={{ textAlign:'center', fontFamily:'var(--font-mono)', fontSize:22, fontWeight:700 }}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button className="btn-primary" onClick={submit} disabled={scores.ui===''||scores.functionality===''||scores.problem_fit===''}>Submit Scores</button>
            {total!==undefined&&<span style={{ fontFamily:'var(--font-mono)', fontSize:22, fontWeight:700, color:'var(--accent)' }}>→ {total}/100</span>}
            {existing&&<button className="btn-ghost" onClick={()=>setEditing(false)} style={{ marginLeft:'auto' }}>Cancel</button>}
          </div>
        </>
      ) : (
        <div style={{ display:'flex', gap:16 }}>
          {[['UI',existing?.ui],['Func',existing?.functionality],['Fit',existing?.problem_fit]].map(([l,v])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:700, color:'var(--accent)' }}>{v}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>{l}/10</div>
            </div>
          ))}
          <div style={{ marginLeft:'auto', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, color:'#FFD700' }}>{existing?.total}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>TOTAL</div>
          </div>
        </div>
      )}
    </div>
  );
}
