import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';
import { calculateMatchPoints, getCompleteKnockoutMatches, calculateKnockoutMatchPoints } from '@/utils/calculations';
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

    // 2. Fetch all matches (needed to construct the brackets correctly)
    const matchesRes = await query(
      "SELECT id, group_name, home_team, away_team, match_date, status, home_score, away_score FROM matches ORDER BY id ASC"
    );
    const allMatches = matchesRes.rows.map(row => ({
      id: row.id,
      groupName: row.group_name,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      status: row.status as 'PLAYED' | 'UPCOMING',
      homeScore: row.home_score,
      awayScore: row.away_score
    }));
    const playedMatches = allMatches.filter(m => m.status === 'PLAYED');

    // 3. Fetch all group stage predictions
    const predictionsRes = await query(
      'SELECT participant_id, match_id, predicted_home_score, predicted_away_score FROM predictions'
    );
    const predictions = predictionsRes.rows;

    // 4. Fetch official knockout results
    const koResultsRes = await query(
      'SELECT match_id, winner_team, home_score, away_score FROM knockout_results'
    );
    const knockoutResults = koResultsRes.rows;

    // Create a winner mapping for official knockout bracket construction
    const actualKoWinners: Record<string, string> = {};
    knockoutResults.forEach(r => {
      actualKoWinners[r.match_id] = r.winner_team || '';
    });
    const actualKoMatchesMap = getCompleteKnockoutMatches(allMatches, [], actualKoWinners);

    // 5. Fetch all knockout predictions
    const koPredictionsRes = await query(
      'SELECT participant_id, match_id, winner_team, home_score, away_score FROM knockout_predictions'
    );
    const allKoPredictions = koPredictionsRes.rows;

    // 6. Calculate scores including group stage and knockout
    const leaderboard = participants.map(p => {
      const pPreds = predictions.filter(pred => pred.participant_id === p.id);
      
      let points = 0;
      let exactCount = 0;
      let outcomeCount = 0;
      let wrongCount = 0;

      // Evaluate Group Stage Points
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

      // Evaluate Knockout Stage Points
      const pKoPreds = allKoPredictions.filter(kp => kp.participant_id === p.id);
      const pKoWinnerMap: Record<string, string> = {};
      const pKoScoreMap: Record<string, { home: number | ''; away: number | '' }> = {};
      pKoPreds.forEach(kp => {
        pKoWinnerMap[kp.match_id] = kp.winner_team || '';
        pKoScoreMap[kp.match_id] = {
          home: kp.home_score !== null && kp.home_score !== undefined ? kp.home_score : '',
          away: kp.away_score !== null && kp.away_score !== undefined ? kp.away_score : ''
        };
      });

      // Get participant's simulated bracket
      const participantKoMatchesMap = getCompleteKnockoutMatches(
        allMatches,
        pPreds.map(pr => ({
          participantId: p.id,
          matchId: pr.match_id,
          predictedHomeScore: pr.predicted_home_score,
          predictedAwayScore: pr.predicted_away_score
        })),
        pKoWinnerMap
      );

      // Match-by-match comparison
      knockoutResults.forEach(actualResult => {
        const matchId = actualResult.match_id;
        const actualMatch = actualKoMatchesMap[matchId];
        const predMatch = participantKoMatchesMap[matchId];
        const predScores = pKoScoreMap[matchId] || { home: '', away: '' };
        const predWinner = pKoWinnerMap[matchId] || '';

        if (actualMatch && predMatch) {
          const { points: koPts } = calculateKnockoutMatchPoints(
            predMatch.team1,
            predMatch.team2,
            predScores.home,
            predScores.away,
            predWinner,
            actualMatch.team1,
            actualMatch.team2,
            actualResult.home_score,
            actualResult.away_score,
            actualResult.winner_team
          );

          points += koPts;
          if (koPts === 3) exactCount += 1;
          else if (koPts === 1) outcomeCount += 1;
          else if (actualResult.home_score !== null && actualResult.home_score !== undefined) wrongCount += 1;
        }
      });

      return {
        participantId: p.id,
        name: p.name,
        points,
        exactCount,
        outcomeCount,
        wrongCount,
        totalPredictions: pPreds.length + pKoPreds.length
      };
    });

    // 7. Sort: points DESC, exactCount DESC, name ASC
    leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return a.name.localeCompare(b.name);
    });

    // 8. Return top 20
    const top20 = leaderboard.slice(0, 20);

    return NextResponse.json(top20);
  } catch (error: any) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
