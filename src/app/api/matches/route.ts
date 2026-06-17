import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';
import { autoUpdateMatches } from '@/utils/matchAutoUpdater';

export async function GET() {
  try {
    await ensureInit();
    // Ejecutar la actualización automática diaria de partidos expirados
    await autoUpdateMatches();
    
    const result = await query('SELECT * FROM matches ORDER BY id ASC');
    
    // Map database snake_case columns back to camelCase for the frontend
    const matches = result.rows.map(row => ({
      id: row.id,
      groupName: row.group_name,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      status: row.status,
      homeScore: row.home_score,
      awayScore: row.away_score
    }));

    return NextResponse.json(matches);
  } catch (error: any) {
    console.error('GET /api/matches error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureInit();
    const { matchId, homeScore, awayScore, status } = await request.json();

    if (matchId === undefined || !status) {
      return NextResponse.json({ error: 'matchId and status are required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE matches 
       SET home_score = $1, away_score = $2, status = $3 
       WHERE id = $4 
       RETURNING *`,
      [
        homeScore === '' || homeScore === null ? null : parseInt(homeScore, 10),
        awayScore === '' || awayScore === null ? null : parseInt(awayScore, 10),
        status,
        matchId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const updatedMatch = {
      id: row.id,
      groupName: row.group_name,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      status: row.status,
      homeScore: row.home_score,
      awayScore: row.away_score
    };

    return NextResponse.json(updatedMatch);
  } catch (error: any) {
    console.error('POST /api/matches error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
