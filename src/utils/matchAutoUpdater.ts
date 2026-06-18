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
  // Deshabilitado para evitar la simulación de scores aleatorios.
  // Los marcadores oficiales son ingresados manualmente por el administrador en la pestaña Admin.
  return;
}
