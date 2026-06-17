import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';
import { calculateMatchPoints } from '@/utils/calculations';
import { Match, Prediction } from '@/types';
import { autoUpdateMatches } from '@/utils/matchAutoUpdater';

export async function GET() {
  try {
    await ensureInit();
    // Ejecutar la actualización automática diaria de partidos expirados
    await autoUpdateMatches();

    // 1. Fetch all participants
    const partRes = await query('SELECT id, name FROM participants');
    const participants = partRes.rows;

    // 2. Fetch played matches
    const matchesRes = await query(
      "SELECT id, group_name, home_team, away_team, match_date, status, home_score, away_score FROM matches WHERE status = 'PLAYED'"
    );
    const playedMatches: Match[] = matchesRes.rows.map(row => ({
      id: row.id,
      groupName: row.group_name,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      status: row.status as 'PLAYED',
      homeScore: row.home_score,
      awayScore: row.away_score
    }));

    // 3. Fetch all predictions
    const predictionsRes = await query(
      'SELECT participant_id, match_id, predicted_home_score, predicted_away_score FROM predictions'
    );
    const predictions = predictionsRes.rows;

    // 4. Calculate scores
    const leaderboard = participants.map(p => {
      const pPreds = predictions.filter(pred => pred.participant_id === p.id);
      
      let points = 0;
      let exactCount = 0;
      let outcomeCount = 0;
      let wrongCount = 0;

      playedMatches.forEach(match => {
        const pred = pPreds.find(pr => pr.match_id === match.id);
        if (pred) {
          const predictionObj: Prediction = {
            participantId: p.id,
            matchId: pred.match_id,
            predictedHomeScore: pred.predicted_home_score,
            predictedAwayScore: pred.predicted_away_score
          };
          const pts = calculateMatchPoints(predictionObj, match);
          points += pts;
          if (pts === 3) exactCount += 1;
          else if (pts === 1) outcomeCount += 1;
          else wrongCount += 1;
        }
      });

      return {
        participantId: p.id,
        name: p.name,
        points,
        exactCount,
        outcomeCount,
        wrongCount,
        totalPredictions: pPreds.length
      };
    });

    // 5. Sort: points DESC, exactCount DESC, name ASC
    leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return a.name.localeCompare(b.name);
    });

    // 6. Return top 20
    const top20 = leaderboard.slice(0, 20);

    return NextResponse.json(top20);
  } catch (error: any) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
