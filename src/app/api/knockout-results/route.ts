import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';

export async function GET() {
  try {
    await ensureInit();
    const result = await query('SELECT * FROM knockout_results');
    
    const results: Record<string, { winnerTeam: string; homeScore: number | ''; awayScore: number | '' }> = {};
    result.rows.forEach(row => {
      results[row.match_id] = {
        winnerTeam: row.winner_team || '',
        homeScore: row.home_score !== null && row.home_score !== undefined ? row.home_score : '',
        awayScore: row.away_score !== null && row.away_score !== undefined ? row.away_score : ''
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('GET /api/knockout-results error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureInit();
    const { matchId, homeScore, awayScore, winnerTeam } = await request.json();

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const home = homeScore === '' || homeScore === null || homeScore === undefined ? null : parseInt(homeScore, 10);
    const away = awayScore === '' || awayScore === null || awayScore === undefined ? null : parseInt(awayScore, 10);

    if (home === null && away === null && !winnerTeam) {
      await query('DELETE FROM knockout_results WHERE match_id = $1', [matchId]);
      return NextResponse.json({ success: true, deleted: true });
    } else {
      await query(
        `INSERT INTO knockout_results (match_id, winner_team, home_score, away_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (match_id)
         DO UPDATE SET
           winner_team = EXCLUDED.winner_team,
           home_score = EXCLUDED.home_score,
           away_score = EXCLUDED.away_score`,
        [matchId, winnerTeam || null, home, away]
      );
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('POST /api/knockout-results error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
