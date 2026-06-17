export interface Team {
  name: string;
  flag: string; // Emoji representing the flag
  code: string; // 3-letter FIFA code
}

export interface Match {
  id: number;
  groupName: string; // E.g. 'A', 'B', etc.
  homeTeam: string; // Name of home team
  awayTeam: string; // Name of away team
  matchDate: string; // E.g. '2026-06-11'
  status: 'PLAYED' | 'UPCOMING';
  homeScore: number | null; // Actual score (null if not played)
  awayScore: number | null; // Actual score (null if not played)
}

export interface Prediction {
  participantId: number;
  matchId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

export interface Participant {
  id: number;
  name: string;
}

export interface GroupStandingRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ParticipantScore {
  participantId: number;
  name: string;
  points: number;
  exactCount: number;
  outcomeCount: number;
  wrongCount: number;
  totalPredictions: number;
}

export interface GroupData {
  name: string;
  teams: string[];
  matches: Match[];
}

export interface KnockoutMatch {
  id: string; // E.g. 'R32-1', 'R16-1', 'QF-1', 'SF-1', 'F'
  roundName: 'R32' | 'R16' | 'QF' | 'SF' | 'F';
  team1: string;
  team2: string;
  placeholder1: string;
  placeholder2: string;
}
