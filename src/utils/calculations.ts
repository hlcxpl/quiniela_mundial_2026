import { Match, Prediction, GroupStandingRow, ParticipantScore, KnockoutMatch } from '../types';

// Calculate standings for a group
export function calculateGroupStandings(
  teams: string[],
  groupMatches: Match[],
  predictions: Prediction[]
): GroupStandingRow[] {
  // Initialize table rows
  const standingsMap: Record<string, GroupStandingRow> = {};
  teams.forEach(team => {
    standingsMap[team] = {
      position: 0,
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    };
  });

  // Process each match
  groupMatches.forEach(match => {
    // Find if the user has predicted this match
    const prediction = predictions.find(p => p.matchId === match.id);

    // Determine which scores to use: prediction first, then actual (if played)
    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (prediction !== undefined) {
      homeScore = prediction.predictedHomeScore;
      awayScore = prediction.predictedAwayScore;
    } else if (match.status === 'PLAYED') {
      homeScore = match.homeScore;
      awayScore = match.awayScore;
    }

    // If we have scores (either predicted or actual played), update standings
    if (homeScore !== null && awayScore !== null) {
      const homeRow = standingsMap[match.homeTeam];
      const awayRow = standingsMap[match.awayTeam];

      if (homeRow && awayRow) {
        homeRow.played += 1;
        awayRow.played += 1;

        homeRow.goalsFor += homeScore;
        homeRow.goalsAgainst += awayScore;
        awayRow.goalsFor += awayScore;
        awayRow.goalsAgainst += homeScore;

        homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
        awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;

        if (homeScore > awayScore) {
          homeRow.won += 1;
          homeRow.points += 3;
          awayRow.lost += 1;
        } else if (homeScore < awayScore) {
          awayRow.won += 1;
          awayRow.points += 3;
          homeRow.lost += 1;
        } else {
          homeRow.drawn += 1;
          awayRow.drawn += 1;
          homeRow.points += 1;
          awayRow.points += 1;
        }
      }
    }
  });

  // Convert map to array and sort
  const standingsList = Object.values(standingsMap);

  standingsList.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. Goal Difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3. Goals For
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 4. Alphabetical (stable fallback)
    return a.team.localeCompare(b.team);
  });

  // Assign positions (1-4)
  standingsList.forEach((row, index) => {
    row.position = index + 1;
  });

  return standingsList;
}

// Calculate the points for a prediction against a played match
export function calculateMatchPoints(prediction: Prediction, match: Match): number {
  if (match.status !== 'PLAYED' || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const actHome = match.homeScore;
  const actAway = match.awayScore;
  const predHome = prediction.predictedHomeScore;
  const predAway = prediction.predictedAwayScore;

  // Exact Match (3 pts)
  if (predHome === actHome && predAway === actAway) {
    return 3;
  }

  // Correct Outcome (1 pt)
  const actOutcome = Math.sign(actHome - actAway);
  const predOutcome = Math.sign(predHome - predAway);

  if (actOutcome === predOutcome) {
    return 1;
  }

  // Incorrect (0 pts)
  return 0;
}

// Calculate total score & stats for a participant
export function calculateParticipantScore(
  participantId: number,
  name: string,
  matches: Match[],
  predictions: Prediction[]
): ParticipantScore {
  const participantPredictions = predictions.filter(p => p.participantId === participantId);
  const playedMatches = matches.filter(m => m.status === 'PLAYED');

  let points = 0;
  let exactCount = 0;
  let outcomeCount = 0;
  let wrongCount = 0;

  playedMatches.forEach(match => {
    const pred = participantPredictions.find(p => p.matchId === match.id);
    if (pred) {
      const pts = calculateMatchPoints(pred, match);
      points += pts;
      if (pts === 3) exactCount += 1;
      else if (pts === 1) outcomeCount += 1;
      else wrongCount += 1;
    }
  });

  return {
    participantId,
    name,
    points,
    exactCount,
    outcomeCount,
    wrongCount,
    totalPredictions: participantPredictions.length
  };
}

// Extract best 3rd place teams from all groups A-L
export interface ThirdPlaceStanding {
  groupName: string;
  standing: GroupStandingRow;
}

export function getBestThirdPlaceTeams(
  groups: Record<string, string[]>,
  matches: Match[],
  predictions: Prediction[]
): ThirdPlaceStanding[] {
  const thirdPlaces: ThirdPlaceStanding[] = [];

  Object.entries(groups).forEach(([groupName, teams]) => {
    const groupMatches = matches.filter(m => m.groupName === groupName);
    const standings = calculateGroupStandings(teams, groupMatches, predictions);
    // Find third place team (index 2)
    const thirdPlaceRow = standings[2];
    if (thirdPlaceRow) {
      thirdPlaces.push({
        groupName,
        standing: thirdPlaceRow
      });
    }
  });

  // Sort the third places
  thirdPlaces.sort((a, b) => {
    const rowA = a.standing;
    const rowB = b.standing;

    // 1. Points
    if (rowB.points !== rowA.points) return rowB.points - rowA.points;
    // 2. Goal Difference
    if (rowB.goalDifference !== rowA.goalDifference) return rowB.goalDifference - rowA.goalDifference;
    // 3. Goals For
    if (rowB.goalsFor !== rowA.goalsFor) return rowB.goalsFor - rowA.goalsFor;
    // 4. Alphabetical group name
    return a.groupName.localeCompare(b.groupName);
  });

  return thirdPlaces;
}



// Generate the 16 Round of 32 matches based on group standings and best 3rd places
export function getRoundOf32Matchups(
  groups: Record<string, string[]>,
  matches: Match[],
  predictions: Prediction[]
): KnockoutMatch[] {
  const standings: Record<string, GroupStandingRow[]> = {};
  Object.entries(groups).forEach(([groupName, teams]) => {
    const groupMatches = matches.filter(m => m.groupName === groupName);
    standings[groupName] = calculateGroupStandings(teams, groupMatches, predictions);
  });

  const bestThirdPlaces = getBestThirdPlaceTeams(groups, matches, predictions);
  // Top 8 third places qualify
  const qualifiedThirds = bestThirdPlaces.slice(0, 8).map(tp => tp.standing.team);

  // Helper helper to get team names safely
  const winner = (g: string) => standings[g]?.[0]?.team || `Ganador Grupo ${g}`;
  const runnerUp = (g: string) => standings[g]?.[1]?.team || `2do Grupo ${g}`;
  const getThird = (idx: number) => qualifiedThirds[idx] || `3ro Calificado ${idx + 1}`;

  // Deterministic Round of 32 Pairings:
  // - Winners A-H vs Best 3rd place teams (8 matches)
  // - Winners I-L vs Runners-up J, I, L, K (4 matches)
  // - Runners-up A-H vs each other (4 matches)
  return [
    { id: 'R32-1', roundName: 'R32', team1: winner('A'), team2: getThird(0), placeholder1: '1A', placeholder2: '3ro' },
    { id: 'R32-2', roundName: 'R32', team1: winner('B'), team2: getThird(1), placeholder1: '1B', placeholder2: '3ro' },
    { id: 'R32-3', roundName: 'R32', team1: winner('C'), team2: getThird(2), placeholder1: '1C', placeholder2: '3ro' },
    { id: 'R32-4', roundName: 'R32', team1: winner('D'), team2: getThird(3), placeholder1: '1D', placeholder2: '3ro' },
    { id: 'R32-5', roundName: 'R32', team1: winner('E'), team2: getThird(4), placeholder1: '1E', placeholder2: '3ro' },
    { id: 'R32-6', roundName: 'R32', team1: winner('F'), team2: getThird(5), placeholder1: '1F', placeholder2: '3ro' },
    { id: 'R32-7', roundName: 'R32', team1: winner('G'), team2: getThird(6), placeholder1: '1G', placeholder2: '3ro' },
    { id: 'R32-8', roundName: 'R32', team1: winner('H'), team2: getThird(7), placeholder1: '1H', placeholder2: '3ro' },
    { id: 'R32-9', roundName: 'R32', team1: winner('I'), team2: runnerUp('J'), placeholder1: '1I', placeholder2: '2J' },
    { id: 'R32-10', roundName: 'R32', team1: winner('J'), team2: runnerUp('I'), placeholder1: '1J', placeholder2: '2I' },
    { id: 'R32-11', roundName: 'R32', team1: winner('K'), team2: runnerUp('L'), placeholder1: '1K', placeholder2: '2L' },
    { id: 'R32-12', roundName: 'R32', team1: winner('L'), team2: runnerUp('K'), placeholder1: '1L', placeholder2: '2K' },
    { id: 'R32-13', roundName: 'R32', team1: runnerUp('A'), team2: runnerUp('C'), placeholder1: '2A', placeholder2: '2C' },
    { id: 'R32-14', roundName: 'R32', team1: runnerUp('B'), team2: runnerUp('D'), placeholder1: '2B', placeholder2: '2D' },
    { id: 'R32-15', roundName: 'R32', team1: runnerUp('E'), team2: runnerUp('F'), placeholder1: '2E', placeholder2: '2F' },
    { id: 'R32-16', roundName: 'R32', team1: runnerUp('G'), team2: runnerUp('H'), placeholder1: '2G', placeholder2: '2H' }
  ];
}
