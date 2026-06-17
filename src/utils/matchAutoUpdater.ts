import { query, ensureInit } from './db';

function parseMatchDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.includes(':')) {
    if (dateStr.endsWith('Z') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 7) || dateStr.includes('+')) {
      return new Date(dateStr);
    }
    return new Date(`${dateStr.replace(' ', 'T')}-04:00`);
  }
  return new Date(`${dateStr}T23:59:59-04:00`);
}

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
 * (es decir, cuya fecha de juego + 2 horas es menor o igual a la hora actual)
 * pero que siguen marcados como 'UPCOMING'.
 */
export async function autoUpdateMatches() {
  try {
    await ensureInit();

    // Buscamos todos los partidos marcados como 'UPCOMING'
    const res = await query(
      "SELECT id, home_score, away_score, home_team, away_team, match_date FROM matches WHERE status = 'UPCOMING'"
    );

    const now = new Date();
    // Filtramos los partidos que ya deberían haber terminado (2 horas desde el kickoff)
    const expiredMatches = res.rows.filter(match => {
      const kickoff = parseMatchDate(match.match_date);
      const twoHoursLater = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
      return twoHoursLater <= now;
    });

    if (expiredMatches.length === 0) {
      return;
    }

    for (const match of expiredMatches) {
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
