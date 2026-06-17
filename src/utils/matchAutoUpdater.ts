import { query, ensureInit } from './db';

function generateRealisticScore(): number {
  const rand = Math.random();
  if (rand < 0.22) return 0; // 22% de probabilidad de 0 goles
  if (rand < 0.57) return 1; // 35% de probabilidad de 1 gol
  if (rand < 0.82) return 2; // 25% de probabilidad de 2 goles
  if (rand < 0.94) return 3; // 12% de probabilidad de 3 goles
  if (rand < 0.98) return 4; // 4% de probabilidad de 4 goles
  return 5;                  // 2% de probabilidad de 5 goles
}

/**
 * Revisa la base de datos y simula los partidos que ya deberían haberse jugado
 * (es decir, cuya fecha de juego es menor o igual a hoy en la zona horaria del torneo)
 * pero que siguen marcados como 'UPCOMING'.
 */
export async function autoUpdateMatches() {
  try {
    await ensureInit();

    // Obtenemos la fecha de hoy en la zona horaria del torneo (America/Mexico_City)
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Buscamos partidos que ya expiraron pero siguen marcados como 'UPCOMING'
    const res = await query(
      "SELECT id, home_score, away_score, home_team, away_team, match_date FROM matches WHERE status = 'UPCOMING' AND match_date <= $1",
      [todayStr]
    );

    const upcomingMatches = res.rows;
    if (upcomingMatches.length === 0) {
      return;
    }

    console.log(`[AutoUpdater] Se encontraron ${upcomingMatches.length} partidos pendientes por jugar al día ${todayStr}. Resolviendo...`);

    for (const match of upcomingMatches) {
      let homeScore = match.home_score;
      let awayScore = match.away_score;

      // Si no tienen marcador asignado, generamos uno realista
      if (homeScore === null || awayScore === null) {
        homeScore = generateRealisticScore();
        awayScore = generateRealisticScore();
      }

      console.log(`[AutoUpdater] Simulando Partido ID ${match.id}: ${match.home_team} ${homeScore} - ${awayScore} ${match.away_team}`);

      await query(
        "UPDATE matches SET status = 'PLAYED', home_score = $1, away_score = $2 WHERE id = $3",
        [homeScore, awayScore, match.id]
      );
    }
  } catch (error) {
    console.error('[AutoUpdater] Error en la actualización automática de partidos:', error);
  }
}
