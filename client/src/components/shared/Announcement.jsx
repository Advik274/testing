import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// Full-screen dramatic announcement overlay shown on ALL screens simultaneously
export function AnnouncementOverlay() {
  const { state, dispatch } = useApp();
  const ann = state.announcement;
  const [visible, setVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!ann || !ann.team) { setVisible(false); setShowContent(false); setShowConfetti(false); return; }
    setVisible(true);
    setShowContent(false);
    setShowConfetti(false);
    const t1 = setTimeout(() => setShowContent(true), 300);
    const t2 = ann.is_winner ? setTimeout(() => setShowConfetti(true), 800) : null;
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [ann?.index]);

  if (!visible || !ann?.team) return null;

  const team = ann.team;
  const rank = ann.actual_rank; // 0 = 1st
  const rankLabel = ['1st','2nd','3rd'][rank] || `${rank + 1}th`;
  const medal = ['🥇','🥈','🥉'][rank] || `#${rank + 1}`;
  const medalColor = ['#FFD700','#C0C0C0','#CD7F32'][rank] || 'var(--text3)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: ann.is_winner
        ? 'radial-gradient(ellipse at center, rgba(255,215,0,0.15) 0%, rgba(0,0,0,0.96) 70%)'
        : 'rgba(0,0,0,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.3s ease',
    }}>
      {showConfetti && <ConfettiRain />}

      <div style={{
        textAlign: 'center', maxWidth: 600, padding: 40, width: '90%',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'none' : 'scale(0.9) translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Rank label */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text3)', letterSpacing: '0.25em', marginBottom: 16 }}>
          {ann.is_winner ? '🏆 WINNER 🏆' : `PLACE ${ann.total - ann.index} OF ${ann.total}`}
        </div>

        {/* Medal */}
        <div style={{ fontSize: ann.is_winner ? 96 : 72, marginBottom: 16, animation: ann.is_winner ? 'glitch 2s infinite' : 'none' }}>
          {medal}
        </div>

        {/* Team name */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: ann.is_winner ? 52 : 38,
          fontWeight: 700,
          color: ann.is_winner ? '#FFD700' : team.color,
          letterSpacing: '0.08em',
          marginBottom: 8,
          textShadow: ann.is_winner ? '0 0 40px rgba(255,215,0,0.5)' : 'none',
        }}>
          {team.name}
        </div>

        {/* Rank */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: medalColor, marginBottom: 20 }}>
          {rankLabel} PLACE
        </div>

        {/* Score */}
        {team.scores && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${team.color}44`,
            borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'inline-block',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, color: ann.is_winner ? '#FFD700' : 'var(--accent)' }}>
              {team.scores.total}<span style={{ fontSize: 20, color: 'var(--text3)' }}>/100</span>
            </div>
            {ann.is_winner && (
              <div style={{ display: 'flex', gap: 20, marginTop: 8, justifyContent: 'center' }}>
                {[['UI', team.scores.ui], ['Func', team.scores.functionality], ['Fit', team.scores.problem_fit]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{v}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>{l}/10</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {ann.is_winner && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text3)', letterSpacing: '0.2em', marginTop: 8 }}>
            EBULLIANCE DOMINANCE CHAMPION
          </div>
        )}
      </div>
    </div>
  );
}

function ConfettiRain() {
  const pieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: ['#FFD700','#00ff88','#00aaff','#aa55ff','#ff3355','#ffffff','#ffaa00'][i % 7],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2.5 + Math.random() * 2.5}s`,
    size: `${6 + Math.random() * 10}px`,
    shape: Math.random() > 0.5 ? '50%' : '2px',
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`@keyframes fall { from { transform: translateY(-20px) rotate(0deg) scale(1); opacity:1; } to { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity:0; } }`}</style>
      {pieces.map(p => (
        <div key={p.id} style={{ position: 'absolute', top: 0, left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: p.shape, animation: `fall ${p.duration} ${p.delay} ease-in forwards` }} />
      ))}
    </div>
  );
}
