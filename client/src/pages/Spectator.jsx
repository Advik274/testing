import { useApp } from '../context/AppContext';
import { BatteryBar, CountdownTimer } from '../components/shared/index.jsx';
import { AnnouncementOverlay } from '../components/shared/Announcement.jsx';

export default function Spectator() {
  const { state } = useApp();
  const phase = state.app_state.current_phase;
  const phaseColors = { setup:'var(--text3)', phase1:'var(--warning)', phase2:'var(--accent)', phase3:'var(--info)', results:'var(--purple)' };
  const phaseNames = { setup:'Setting Up', phase1:'Phase 1 — The Gauntlet', phase2:'Phase 2 — Campus Conquest', phase3:'Phase 3 — Final Build', results:'Final Results' };

  const phase1Board = [...state.teams].sort((a,b) => b.phase1_total_score - a.phase1_total_score);
  const phase2Board = [...state.teams].filter(t=>!t.is_eliminated).sort((a,b) => b.zones_captured-a.zones_captured||b.battery-a.battery);
  const finalBoard  = [...state.teams].filter(t=>t.phase3_judge_scores).sort((a,b) => b.phase3_judge_scores.total-a.phase3_judge_scores.total);
  const medal = (i) => ['🥇','🥈','🥉'][i]||`#${i+1}`;
  const rankColor = (i) => ['#FFD700','#C0C0C0','#CD7F32'][i]||'var(--text3)';

  return (
    <div style={{ minHeight:'100vh', paddingBottom:40, position:'relative' }}>
      <AnnouncementOverlay />

      {/* Header */}
      <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'18px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, color:'var(--accent)', letterSpacing:'0.1em' }}>DOMINANCE</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', marginTop:2, letterSpacing:'0.2em' }}>EBULLIANCE · REBOOT × CSI × NCC</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, color:phaseColors[phase] }}>{phaseNames[phase]}</div>
          {phase==='phase1'&&state.app_state.phase1_round>0&&<div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text3)', marginTop:4 }}>Round {state.app_state.phase1_round}/5 {state.app_state.phase1_round_active?<span style={{color:'var(--danger)'}}>● LIVE</span>:''}</div>}
          {phase==='phase2'&&<CountdownTimer endTime={state.app_state.phase2_timer_end}/>}
          {phase==='phase3'&&<CountdownTimer endTime={state.app_state.phase3_timer_end}/>}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text3)' }}>{state.teams.filter(t=>!t.is_eliminated).length} active</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--danger)', marginTop:2 }}>{state.teams.filter(t=>t.is_eliminated).length} eliminated</div>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 16px' }}>

        {phase==='setup'&&(
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:72, color:'var(--accent)', animation:'glitch 4s infinite', marginBottom:16, lineHeight:1 }}>DOMINANCE</div>
            <div style={{ fontFamily:'var(--font-mono)', color:'var(--text3)', fontSize:14, marginBottom:32, letterSpacing:'0.2em' }}>GET READY. THE BATTLE BEGINS SOON.</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
              {state.teams.map(t=>(
                <div key={t.id} style={{ padding:'8px 20px', borderRadius:6, background:`${t.color}22`, border:`1px solid ${t.color}66`, color:t.color, fontFamily:'var(--font-display)', fontSize:16 }}>{t.name}</div>
              ))}
            </div>
          </div>
        )}

        {phase==='phase1'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {phase1Board.map((team,i)=>(
              <div key={team.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderRadius:8, background:i===0?'rgba(0,255,136,0.06)':'var(--bg2)', border:`1px solid ${i<3?rankColor(i)+'44':'var(--border)'}`, opacity:team.is_eliminated?0.3:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:26, width:48, textAlign:'center', color:rankColor(i) }}>{i<3?medal(i):`#${i+1}`}</div>
                <div style={{ width:12, height:12, borderRadius:'50%', background:team.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:20, textDecoration:team.is_eliminated?'line-through':'none' }}>{team.name}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>{team.year} year</div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:30, fontWeight:700, color:team.is_eliminated?'var(--text3)':'var(--accent)' }}>{team.phase1_total_score}</div>
              </div>
            ))}
          </div>
        )}

        {phase==='phase2'&&(
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Zone status strip */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {state.zones.map(z=>(
                <div key={z.id} style={{ padding:'6px 14px', borderRadius:6, background:z.owner_team_id?`${z.owner_color}22`:'var(--bg3)', border:`1px solid ${z.owner_team_id?z.owner_color+'55':'var(--border)'}`, color:z.owner_team_id?z.owner_color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:11 }}>
                  {z.is_attempting?`⚡ ${z.name} — ${z.attempting_team_name} attempting`:z.owner_team_id?`🏴 ${z.name} — ${z.owner_name}`:`○ ${z.name}`}
                </div>
              ))}
            </div>
            {phase2Board.map((team,i)=>(
              <div key={team.id} style={{ padding:'16px 20px', borderRadius:8, background:'var(--bg2)', border:`1px solid ${i<4?team.color+'55':'var(--border)'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:22, width:44, color:i<4?'var(--accent)':'var(--text3)' }}>#{i+1}</div>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:team.color, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:20 }}>{team.name}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text3)', marginTop:2 }}>🏴 {team.zones_captured} zone{team.zones_captured!==1?'s':''}{i<4&&<span className="badge badge-success" style={{marginLeft:8,fontSize:9}}>ADVANCING</span>}</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, color:team.battery>30?'var(--accent)':'var(--danger)' }}>⚡{team.battery}%</div>
                </div>
                <BatteryBar battery={team.battery} showLabel={false} height={6}/>
              </div>
            ))}
          </div>
        )}

        {phase==='phase3'&&(
          <div>
            {state.app_state.phase3_problem&&(
              <div className="card" style={{ border:'1px solid var(--info)', marginBottom:24, textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--info)', marginBottom:8, letterSpacing:'0.15em' }}>GLOBAL MISSION</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:15, color:'var(--text)', lineHeight:1.7 }}>{state.app_state.phase3_problem}</div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {state.teams.filter(t=>!t.is_eliminated).map(team=>(
                <div key={team.id} style={{ padding:'14px 20px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:team.color }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18 }}>{team.name}</div>
                    {team.phase3_problem&&team.phase3_problem!==state.app_state.phase3_problem&&<div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Custom problem</div>}
                  </div>
                  {team.phase3_submission?<span className="badge badge-success">Submitted ✓</span>:<span className="badge badge-info">Building...</span>}
                  {team.phase3_judge_scores&&<div style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:700, color:'var(--accent)' }}>{team.phase3_judge_scores.total}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase==='results'&&(
          <div>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:44, color:'var(--purple)', animation:'glitch 3s infinite', marginBottom:8 }}>FINAL RESULTS</div>
              <div style={{ fontFamily:'var(--font-mono)', color:'var(--text3)', fontSize:13, letterSpacing:'0.15em' }}>RESULTS BEING REVEALED...</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {finalBoard.map((team,i)=>(
                <div key={team.id} style={{ padding:'20px 24px', borderRadius:10, background:i===0?'rgba(255,215,0,0.08)':i===1?'rgba(192,192,192,0.06)':'var(--bg2)', border:`${i===0?2:1}px solid ${rankColor(i)}`, transform:i===0?'scale(1.02)':'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:i===0?48:32 }}>{medal(i)}</div>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:team.color }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:i===0?28:22, color:i===0?'#FFD700':'var(--text)' }}>{team.name}</div>
                      {i===0&&<div style={{ display:'flex', gap:16, marginTop:4 }}>{[['UI',team.phase3_judge_scores.ui],['Func',team.phase3_judge_scores.functionality],['Fit',team.phase3_judge_scores.problem_fit]].map(([l,v])=><span key={l} style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text3)' }}>{l}: {v}/10</span>)}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:i===0?40:28, fontWeight:700, color:i===0?'#FFD700':'var(--accent)' }}>{team.phase3_judge_scores.total}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>/ 100</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
