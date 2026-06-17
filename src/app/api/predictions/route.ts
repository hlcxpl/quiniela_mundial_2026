import { NextResponse } from 'next/server';
import { query, ensureInit, getDbPool } from '@/utils/db';

export function parseMatchDateChile(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.includes(':')) {
    if (dateStr.endsWith('Z') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 7) || dateStr.includes('+')) {
      return new Date(dateStr);
    }
    return new Date(`${dateStr.replace(' ', 'T')}-04:00`);
  }
  // Si no tiene componente de hora, asumimos las 23:59:59 para mantenerlo abierto todo el día
  return new Date(`${dateStr}T23:59:59-04:00`);
}

export async function GET(request: Request) {
  try {
    await ensureInit();
    const { searchParams } = new URL(request.url);
    const participantIdStr = searchParams.get('participantId');

    if (!participantIdStr) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    const participantId = parseInt(participantIdStr, 10);

    // Get group stage predictions
    const predictionsRes = await query(
      'SELECT match_id, predicted_home_score, predicted_away_score FROM predictions WHERE participant_id = $1',
      [participantId]
    );

    const predictions = predictionsRes.rows.map(row => ({
      matchId: row.match_id,
      predictedHomeScore: row.predicted_home_score,
      predictedAwayScore: row.predicted_away_score
    }));

    // Get knockout predictions and scores
    const koRes = await query(
      'SELECT match_id, winner_team, home_score, away_score FROM knockout_predictions WHERE participant_id = $1',
      [participantId]
    );

    const knockoutPredictions: Record<string, string> = {};
    const knockoutScores: Record<string, { home: number | ''; away: number | '' }> = {};
    koRes.rows.forEach(row => {
      knockoutPredictions[row.match_id] = row.winner_team || '';
      knockoutScores[row.match_id] = {
        home: row.home_score !== null && row.home_score !== undefined ? row.home_score : '',
        away: row.away_score !== null && row.away_score !== undefined ? row.away_score : ''
      };
    });

    return NextResponse.json({
      predictions,
      knockoutPredictions,
      knockoutScores
    });
  } catch (error: any) {
    console.error('GET /api/predictions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const dbPool = getDbPool();
  const client = await dbPool.connect();

  try {
    await ensureInit();
    const { participantId, predictions, knockoutPredictions, knockoutScores } = await request.json();

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Save group stage predictions
    if (predictions && Array.isArray(predictions)) {
      for (const pred of predictions) {
        const home = pred.predictedHomeScore === '' || pred.predictedHomeScore === null ? null : parseInt(pred.predictedHomeScore, 10);
        const away = pred.predictedAwayScore === '' || pred.predictedAwayScore === null ? null : parseInt(pred.predictedAwayScore, 10);
        
        // Only save if scores are valid integers
        if (home !== null && !isNaN(home) && away !== null && !isNaN(away)) {
          // Check if match kickoff has already passed or if it is already played
          const matchCheck = await client.query('SELECT match_date, status FROM matches WHERE id = $1', [pred.matchId]);
          if (matchCheck.rows.length > 0) {
            const matchRow = matchCheck.rows[0];
            const kickoff = parseMatchDateChile(matchRow.match_date);
            const now = new Date();
            const lockTime = new Date(kickoff.getTime() - 15 * 60 * 1000);
            if (now >= lockTime || matchRow.status === 'PLAYED') {
              // Skip saving this prediction since the match has started or finished
              continue;
            }
          }

          await client.query(
            `INSERT INTO predictions (participant_id, match_id, predicted_home_score, predicted_away_score)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (participant_id, match_id)
             DO UPDATE SET 
               predicted_home_score = EXCLUDED.predicted_home_score, 
               predicted_away_score = EXCLUDED.predicted_away_score`,
            [participantId, pred.matchId, home, away]
          );
        }
      }
    }

    // 2. Save knockout predictions and scores
    const koMatchIds = new Set<string>();
    if (knockoutPredictions && typeof knockoutPredictions === 'object') {
      Object.keys(knockoutPredictions).forEach(id => koMatchIds.add(id));
    }
    if (knockoutScores && typeof knockoutScores === 'object') {
      Object.keys(knockoutScores).forEach(id => koMatchIds.add(id));
    }

    for (const matchId of koMatchIds) {
      const winnerTeam = knockoutPredictions?.[matchId] || null;
      const scores = knockoutScores?.[matchId];
      const home = scores && scores.home !== '' && scores.home !== null && scores.home !== undefined
        ? parseInt(scores.home, 10)
        : null;
      const away = scores && scores.away !== '' && scores.away !== null && scores.away !== undefined
        ? parseInt(scores.away, 10)
        : null;

      if (!winnerTeam && home === null && away === null) {
        // If everything is cleared, delete the row
        await client.query(
          `DELETE FROM knockout_predictions WHERE participant_id = $1 AND match_id = $2`,
          [participantId, matchId]
        );
      } else {
        await client.query(
          `INSERT INTO knockout_predictions (participant_id, match_id, winner_team, home_score, away_score)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (participant_id, match_id)
           DO UPDATE SET 
             winner_team = EXCLUDED.winner_team,
             home_score = EXCLUDED.home_score,
             away_score = EXCLUDED.away_score`,
          [participantId, matchId, winnerTeam, home, away]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('POST /api/predictions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
