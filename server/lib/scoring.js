export function calcPhase1Score(points, timeLimitSeconds, timeTakenMs) {
  const timeTakenSeconds = timeTakenMs / 1000;
  const timeBonus = Math.max(0, Math.round(timeLimitSeconds - timeTakenSeconds));
  return points + timeBonus;
}

export function calcPhase3Score(ui, functionality, problemFit) {
  return Math.round((ui * 0.3 + functionality * 0.4 + problemFit * 0.3) * 10);
}

export function getPhase1Board(teams) {
  return [...teams]
    .sort((a, b) => b.phase1_total_score - a.phase1_total_score)
    .map((t, i) => ({ rank: i+1, team_id: t.id, team_name: t.name, color: t.color, year: t.year, score: t.phase1_total_score, eliminated: t.is_eliminated }));
}

export function getFinalBoard(teams) {
  return [...teams]
    .filter(t => t.phase3_judge_scores)
    .sort((a, b) => b.phase3_judge_scores.total - a.phase3_judge_scores.total)
    .map((t, i) => ({ rank: i+1, team_id: t.id, team_name: t.name, color: t.color, scores: t.phase3_judge_scores }));
}
