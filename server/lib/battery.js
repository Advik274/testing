let batteryInterval = null;

export function startBatteryDrain(db, io, saveDB) {
  if (batteryInterval) clearInterval(batteryInterval);

  batteryInterval = setInterval(() => {
    if (db.app_state.current_phase !== 'phase2') return;

    db.teams.forEach(team => {
      if (team.is_eliminated) return;

      team.battery = Math.max(0, parseFloat((team.battery - db.app_state.battery_drain_percent_per_tick).toFixed(1)));
      io.emit('team:battery_updated', { team_id: team.id, battery: team.battery });

      if (team.battery === 20 || team.battery === 10) {
        io.to(`team_${team.id}`).emit('toast:broadcast', {
          message: `⚠️ Battery at ${team.battery}%! Capture a zone NOW!`,
          type: 'warning', team_id: team.id,
        });
      }

      if (team.battery <= 0) {
        team.is_eliminated = true;
        team.elimination_phase = 'phase2';
        const msg = `💀 ${team.name} eliminated — battery dead`;
        db.event_log.unshift({ timestamp: new Date().toISOString(), type: 'elimination', message: msg, team_id: team.id });
        io.emit('team:eliminated', { team_id: team.id, team_name: team.name });
        io.emit('toast:broadcast', { message: msg, type: 'danger' });
      }
    });

    saveDB();
    io.emit('leaderboard:phase2', buildPhase2Board(db.teams));
  }, db.app_state.battery_drain_interval_ms);

  console.log('🔋 Battery drain started');
}

export function stopBatteryDrain() {
  if (batteryInterval) { clearInterval(batteryInterval); batteryInterval = null; }
}

function buildPhase2Board(teams) {
  return [...teams]
    .filter(t => !t.is_eliminated)
    .sort((a, b) => b.zones_captured - a.zones_captured || b.battery - a.battery)
    .map((t, i) => ({ rank: i+1, team_id: t.id, team_name: t.name, color: t.color, zones: t.zones_captured, battery: t.battery }));
}
