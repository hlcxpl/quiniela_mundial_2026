import { NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { autoUpdateMatches } from '@/utils/matchAutoUpdater';

const FALLBACK_WORLD_CUP_NEWS = [
  {
    title: "México domina a Sudáfrica y se lleva el partido inaugural",
    description: "La selección mexicana impuso condiciones en el Estadio Azteca y derrotó 2-0 a Sudáfrica, dominando la posesión y el mediocampo de principio a fin.",
    link: "https://www.fifa.com",
    pubDate: "Thu, 11 Jun 2026 21:30:00 GMT",
    image: "/images/stadium.png"
  },
  {
    title: "Alemania aplasta y arrolla a Curazao con goleada histórica",
    description: "Con un fútbol ofensivo letal, la selección de Alemania pasó por encima de Curazao por 7-1 en Houston. Los teutones dominaron todo el encuentro.",
    link: "https://www.fifa.com",
    pubDate: "Sun, 14 Jun 2026 18:00:00 GMT",
    image: "/images/soccer_ball.png"
  }
];

export async function GET() {
  try {
    // Asegurar la actualización automática diaria antes de generar noticias
    await autoUpdateMatches();

    // Fetch played and upcoming matches from the DB to generate real-time news
    const matchesRes = await query(
      "SELECT id, home_team, away_team, home_score, away_score, status, match_date, group_name FROM matches ORDER BY status = 'PLAYED' DESC, match_date DESC"
    );
    const dbMatches = matchesRes.rows;

    const playedMatches = dbMatches.filter(m => m.status === 'PLAYED');
    const upcomingMatches = dbMatches.filter(m => m.status === 'UPCOMING');

    const generatedNews: any[] = [];
    const localImages = ['/images/stadium.png', '/images/soccer_ball.png', '/images/players.png', '/images/trophy.png'];

    // 1. Generate recaps for played matches
    playedMatches.forEach((match, index) => {
      if (generatedNews.length >= 4) return; // Keep max 4 played recaps
      
      const home = match.home_team;
      const away = match.away_team;
      const hScore = match.home_score;
      const aScore = match.away_score;
      const group = match.group_name;

      let title = '';
      let description = '';

      if (hScore > aScore) {
        title = `Reseña: ${home} impone su jerarquía y derrota ${hScore}-${aScore} a ${away}`;
        description = `La escuadra de ${home} sumó de a tres al vencer con contundencia a ${away} por ${hScore} goles a ${aScore} en el Grupo ${group}. Un partido marcado por la posesión de balón y gran efectividad de cara al arco.`;
      } else if (aScore > hScore) {
        title = `Reseña: ¡Sorpresa de ${away}! Vence ${aScore}-${hScore} a ${home}`;
        description = `Golpe de autoridad en el Grupo ${group}. La selección de ${away} superó tácticamente a ${home} y selló un importante triunfo ${aScore}-${hScore} en el Estadio mundialista, encendiendo el panorama de la clasificación.`;
      } else {
        title = `Reseña: Empate electrizante de ${home} y ${away} en el Grupo ${group}`;
        description = `Tablas en el marcador. En un duelo lleno de drama e idas y vueltas constantes, ${home} y ${away} igualaron ${hScore}-${aScore}, llevándose un punto cada uno que mantiene abierta la lucha por el pase.`;
      }

      // Rotate local images beautifully
      const img = localImages[index % localImages.length];

      generatedNews.push({
        title,
        description,
        link: 'https://www.fifa.com/worldcup',
        pubDate: match.match_date,
        image: img
      });
    });

    // 2. Generate previews for upcoming matches
    upcomingMatches.forEach((match, index) => {
      if (generatedNews.length >= 6) return; // Keep max 6 articles total
      
      const home = match.home_team;
      const away = match.away_team;
      const group = match.group_name;

      // Rotate local images with an offset for variety
      const img = localImages[(index + 2) % localImages.length];

      generatedNews.push({
        title: `Previa: Choque decisivo entre ${home} y ${away} en el Grupo ${group}`,
        description: `Las selecciones de ${home} y ${away} chocan en esta jornada de la Copa del Mundo. Ambos combinados buscan una victoria crucial para escalar posiciones en el grupo y perfilarse rumbo a los octavos de final.`,
        link: 'https://www.fifa.com/worldcup',
        pubDate: match.match_date,
        image: img
      });
    });

    // Fallbacks if we don't have enough matches
    if (generatedNews.length < 6) {
      for (let i = 0; i < FALLBACK_WORLD_CUP_NEWS.length; i++) {
        if (generatedNews.length >= 6) break;
        generatedNews.push(FALLBACK_WORLD_CUP_NEWS[i]);
      }
    }

    return NextResponse.json(generatedNews.slice(0, 6));
  } catch (error: any) {
    console.error('Error generating news from DB:', error);
    return NextResponse.json(FALLBACK_WORLD_CUP_NEWS);
  }
}
