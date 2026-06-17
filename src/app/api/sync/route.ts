import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';

function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim();
  // Map common name variations to match database seeds
  if (lower.includes('korea') || lower.includes('corea')) return 'south korea';
  if (lower.includes('cote') || lower.includes('marfil') || lower.includes('divoire')) return 'ivory coast';
  if (lower.includes('verde') || lower.includes('cabo')) return 'cape verde';
  if (lower.includes('turkey') || lower.includes('turkiye')) return 'türkiye';
  if (lower.includes('drc') || lower.includes('congo dr') || lower.includes('congo, dem')) return 'congo dr';
  if (lower.includes('cura')) return 'curaçao';
  if (lower.includes('united states') || lower.includes('usa') || lower.includes('eeuu')) return 'united states';
  if (lower.includes('bosnia')) return 'bosnia and herzegovina';
  return lower;
}

export async function GET() {
  try {
    await ensureInit();

    // Fetch official schedule from public source
    const apiRes = await fetch('https://www.thestatsapi.com/world-cup/data/fixtures.json', {
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!apiRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch schedule from official source' }, { status: 502 });
    }

    const apiData = await apiRes.json();
    const apiFixtures = apiData.fixtures || [];

    // Fetch all database matches
    const dbRes = await query('SELECT * FROM matches');
    const dbMatches = dbRes.rows;

    let updatedCount = 0;

    for (const apiMatch of apiFixtures) {
      const apiHome = normalizeTeamName(apiMatch.homeTeam);
      const apiAway = normalizeTeamName(apiMatch.awayTeam);

      // Find match in our database by team names
      const dbMatch = dbMatches.find(dbm => {
        const dbHome = normalizeTeamName(dbm.home_team);
        const dbAway = normalizeTeamName(dbm.away_team);
        return (dbHome === apiHome && dbAway === apiAway) || (dbHome === apiAway && dbAway === apiHome);
      });

      if (dbMatch) {
        // Update the kickoff time in the database
        await query(
          'UPDATE matches SET match_date = $1 WHERE id = $2',
          [apiMatch.kickoffUtc, dbMatch.id]
        );
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. Se actualizaron los horarios de ${updatedCount} partidos.`,
      totalApiFixtures: apiFixtures.length
    });
  } catch (error: any) {
    console.error('GET /api/sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
