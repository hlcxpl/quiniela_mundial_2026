import { Team, Match } from '../types';

export const TEAMS: Record<string, Team> = {
  // Group A
  'Mexico': { name: 'Mexico', flag: '🇲🇽', code: 'MEX' },
  'South Africa': { name: 'South Africa', flag: '🇿🇦', code: 'RSA' },
  'South Korea': { name: 'South Korea', flag: '🇰🇷', code: 'KOR' },
  'Czechia': { name: 'Czechia', flag: '🇨🇿', code: 'CZE' },
  // Group B
  'Canada': { name: 'Canada', flag: '🇨🇦', code: 'CAN' },
  'Bosnia and Herzegovina': { name: 'Bosnia and Herzegovina', flag: '🇧🇦', code: 'BIH' },
  'Qatar': { name: 'Qatar', flag: '🇶🇦', code: 'QAT' },
  'Switzerland': { name: 'Switzerland', flag: '🇨🇭', code: 'SUI' },
  // Group C
  'Brazil': { name: 'Brazil', flag: '🇧🇷', code: 'BRA' },
  'Morocco': { name: 'Morocco', flag: '🇲🇦', code: 'MAR' },
  'Haiti': { name: 'Haiti', flag: '🇭🇹', code: 'HAI' },
  'Scotland': { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'SCO' },
  // Group D
  'United States': { name: 'United States', flag: '🇺🇸', code: 'USA' },
  'Paraguay': { name: 'Paraguay', flag: '🇵🇾', code: 'PAR' },
  'Australia': { name: 'Australia', flag: '🇦🇺', code: 'AUS' },
  'Türkiye': { name: 'Türkiye', flag: '🇹🇷', code: 'TUR' },
  // Group E
  'Germany': { name: 'Germany', flag: '🇩🇪', code: 'GER' },
  'Curaçao': { name: 'Curaçao', flag: '🇨🇼', code: 'CUW' },
  'Ivory Coast': { name: 'Ivory Coast', flag: '🇨🇮', code: 'CIV' },
  'Ecuador': { name: 'Ecuador', flag: '🇪🇨', code: 'ECU' },
  // Group F
  'Netherlands': { name: 'Netherlands', flag: '🇳🇱', code: 'NED' },
  'Japan': { name: 'Japan', flag: '🇯🇵', code: 'JPN' },
  'Sweden': { name: 'Sweden', flag: '🇸🇪', code: 'SWE' },
  'Tunisia': { name: 'Tunisia', flag: '🇹🇳', code: 'TUN' },
  // Group G
  'Belgium': { name: 'Belgium', flag: '🇧🇪', code: 'BEL' },
  'Egypt': { name: 'Egypt', flag: '🇪🇬', code: 'EGY' },
  'Iran': { name: 'Iran', flag: '🇮🇷', code: 'IRN' },
  'New Zealand': { name: 'New Zealand', flag: '🇳🇿', code: 'NZL' },
  // Group H
  'Spain': { name: 'Spain', flag: '🇪🇸', code: 'ESP' },
  'Cape Verde': { name: 'Cape Verde', flag: '🇨🇻', code: 'CPV' },
  'Saudi Arabia': { name: 'Saudi Arabia', flag: '🇸🇦', code: 'KSA' },
  'Uruguay': { name: 'Uruguay', flag: '🇺🇾', code: 'URU' },
  // Group I
  'France': { name: 'France', flag: '🇫🇷', code: 'FRA' },
  'Senegal': { name: 'Senegal', flag: '🇸🇳', code: 'SEN' },
  'Norway': { name: 'Norway', flag: '🇳🇴', code: 'NOR' },
  'Iraq': { name: 'Iraq', flag: '🇮🇶', code: 'IRQ' },
  // Group J
  'Argentina': { name: 'Argentina', flag: '🇦🇷', code: 'ARG' },
  'Algeria': { name: 'Algeria', flag: '🇩🇿', code: 'ALG' },
  'Austria': { name: 'Austria', flag: '🇦🇹', code: 'AUT' },
  'Jordan': { name: 'Jordan', flag: '🇯🇴', code: 'JOR' },
  // Group K
  'Portugal': { name: 'Portugal', flag: '🇵🇹', code: 'POR' },
  'Uzbekistan': { name: 'Uzbekistan', flag: '🇺🇿', code: 'UZB' },
  'Colombia': { name: 'Colombia', flag: '🇨🇴', code: 'COL' },
  'Congo DR': { name: 'Congo DR', flag: '🇨🇩', code: 'COD' },
  // Group L
  'England': { name: 'England', flag: '🏴\u200d🏴\u200d🏴\u200d🏴\u200d🏴\u200d🏴\u200d', code: 'ENG' }, // England emoji is multi-character flag
  'Croatia': { name: 'Croatia', flag: '🇭🇷', code: 'CRO' },
  'Ghana': { name: 'Ghana', flag: '🇬🇭', code: 'GHA' },
  'Panama': { name: 'Panama', flag: '🇵🇦', code: 'PAN' }
};

export const GROUPS: Record<string, string[]> = {
  'A': ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  'B': ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  'C': ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  'D': ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  'E': ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  'F': ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  'G': ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  'H': ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  'I': ['France', 'Senegal', 'Norway', 'Iraq'],
  'J': ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  'K': ['Portugal', 'Uzbekistan', 'Colombia', 'Congo DR'],
  'L': ['England', 'Croatia', 'Ghana', 'Panama']
};

export const INITIAL_MATCHES: Match[] = [
  // GROUP A
  { id: 1, groupName: 'A', homeTeam: 'Mexico', awayTeam: 'South Africa', matchDate: '2026-06-11', status: 'PLAYED', homeScore: 2, awayScore: 0 },
  { id: 2, groupName: 'A', homeTeam: 'South Korea', awayTeam: 'Czechia', matchDate: '2026-06-11', status: 'PLAYED', homeScore: 2, awayScore: 1 },
  { id: 3, groupName: 'A', homeTeam: 'Mexico', awayTeam: 'South Korea', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 4, groupName: 'A', homeTeam: 'South Africa', awayTeam: 'Czechia', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 5, groupName: 'A', homeTeam: 'Mexico', awayTeam: 'Czechia', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 6, groupName: 'A', homeTeam: 'South Korea', awayTeam: 'South Africa', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP B
  { id: 7, groupName: 'B', homeTeam: 'Canada', awayTeam: 'Bosnia and Herzegovina', matchDate: '2026-06-12', status: 'PLAYED', homeScore: 1, awayScore: 1 },
  { id: 8, groupName: 'B', homeTeam: 'Qatar', awayTeam: 'Switzerland', matchDate: '2026-06-13', status: 'PLAYED', homeScore: 1, awayScore: 1 },
  { id: 9, groupName: 'B', homeTeam: 'Canada', awayTeam: 'Qatar', matchDate: '2026-06-18', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 10, groupName: 'B', homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Switzerland', matchDate: '2026-06-18', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 11, groupName: 'B', homeTeam: 'Canada', awayTeam: 'Switzerland', matchDate: '2026-06-23', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 12, groupName: 'B', homeTeam: 'Qatar', awayTeam: 'Bosnia and Herzegovina', matchDate: '2026-06-23', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP C
  { id: 13, groupName: 'C', homeTeam: 'Brazil', awayTeam: 'Morocco', matchDate: '2026-06-13', status: 'PLAYED', homeScore: 1, awayScore: 1 },
  { id: 14, groupName: 'C', homeTeam: 'Scotland', awayTeam: 'Haiti', matchDate: '2026-06-13', status: 'PLAYED', homeScore: 1, awayScore: 0 },
  { id: 15, groupName: 'C', homeTeam: 'Brazil', awayTeam: 'Scotland', matchDate: '2026-06-18', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 16, groupName: 'C', homeTeam: 'Morocco', awayTeam: 'Haiti', matchDate: '2026-06-18', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 17, groupName: 'C', homeTeam: 'Brazil', awayTeam: 'Haiti', matchDate: '2026-06-23', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 18, groupName: 'C', homeTeam: 'Scotland', awayTeam: 'Morocco', matchDate: '2026-06-23', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP D
  { id: 19, groupName: 'D', homeTeam: 'United States', awayTeam: 'Paraguay', matchDate: '2026-06-12', status: 'PLAYED', homeScore: 4, awayScore: 1 },
  { id: 20, groupName: 'D', homeTeam: 'Australia', awayTeam: 'Türkiye', matchDate: '2026-06-13', status: 'PLAYED', homeScore: 2, awayScore: 0 },
  { id: 21, groupName: 'D', homeTeam: 'United States', awayTeam: 'Australia', matchDate: '2026-06-19', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 22, groupName: 'D', homeTeam: 'Paraguay', awayTeam: 'Türkiye', matchDate: '2026-06-19', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 23, groupName: 'D', homeTeam: 'United States', awayTeam: 'Türkiye', matchDate: '2026-06-24', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 24, groupName: 'D', homeTeam: 'Australia', awayTeam: 'Paraguay', matchDate: '2026-06-24', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP E
  { id: 25, groupName: 'E', homeTeam: 'Germany', awayTeam: 'Curaçao', matchDate: '2026-06-14', status: 'PLAYED', homeScore: 7, awayScore: 1 },
  { id: 26, groupName: 'E', homeTeam: 'Ivory Coast', awayTeam: 'Ecuador', matchDate: '2026-06-14', status: 'PLAYED', homeScore: 1, awayScore: 0 },
  { id: 27, groupName: 'E', homeTeam: 'Germany', awayTeam: 'Ivory Coast', matchDate: '2026-06-19', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 28, groupName: 'E', homeTeam: 'Curaçao', awayTeam: 'Ecuador', matchDate: '2026-06-19', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 29, groupName: 'E', homeTeam: 'Germany', awayTeam: 'Ecuador', matchDate: '2026-06-24', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 30, groupName: 'E', homeTeam: 'Ivory Coast', awayTeam: 'Curaçao', matchDate: '2026-06-24', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP F
  { id: 31, groupName: 'F', homeTeam: 'Netherlands', awayTeam: 'Japan', matchDate: '2026-06-14', status: 'PLAYED', homeScore: 2, awayScore: 2 },
  { id: 32, groupName: 'F', homeTeam: 'Sweden', awayTeam: 'Tunisia', matchDate: '2026-06-14', status: 'PLAYED', homeScore: 5, awayScore: 1 },
  { id: 33, groupName: 'F', homeTeam: 'Netherlands', awayTeam: 'Sweden', matchDate: '2026-06-20', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 34, groupName: 'F', homeTeam: 'Japan', awayTeam: 'Tunisia', matchDate: '2026-06-20', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 35, groupName: 'F', homeTeam: 'Netherlands', awayTeam: 'Tunisia', matchDate: '2026-06-25', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 36, groupName: 'F', homeTeam: 'Sweden', awayTeam: 'Japan', matchDate: '2026-06-25', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP G
  { id: 37, groupName: 'G', homeTeam: 'Belgium', awayTeam: 'Egypt', matchDate: '2026-06-15', status: 'PLAYED', homeScore: 1, awayScore: 1 },
  { id: 38, groupName: 'G', homeTeam: 'Iran', awayTeam: 'New Zealand', matchDate: '2026-06-15', status: 'PLAYED', homeScore: 2, awayScore: 2 },
  { id: 39, groupName: 'G', homeTeam: 'Belgium', awayTeam: 'Iran', matchDate: '2026-06-20', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 40, groupName: 'G', homeTeam: 'Egypt', awayTeam: 'New Zealand', matchDate: '2026-06-20', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 41, groupName: 'G', homeTeam: 'Belgium', awayTeam: 'New Zealand', matchDate: '2026-06-25', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 42, groupName: 'G', homeTeam: 'Iran', awayTeam: 'Egypt', matchDate: '2026-06-25', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP H
  { id: 43, groupName: 'H', homeTeam: 'Spain', awayTeam: 'Cape Verde', matchDate: '2026-06-15', status: 'PLAYED', homeScore: 0, awayScore: 0 },
  { id: 44, groupName: 'H', homeTeam: 'Saudi Arabia', awayTeam: 'Uruguay', matchDate: '2026-06-15', status: 'PLAYED', homeScore: 1, awayScore: 1 },
  { id: 45, groupName: 'H', homeTeam: 'Spain', awayTeam: 'Saudi Arabia', matchDate: '2026-06-21', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 46, groupName: 'H', homeTeam: 'Cape Verde', awayTeam: 'Uruguay', matchDate: '2026-06-21', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 47, groupName: 'H', homeTeam: 'Spain', awayTeam: 'Uruguay', matchDate: '2026-06-26', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 48, groupName: 'H', homeTeam: 'Saudi Arabia', awayTeam: 'Cape Verde', matchDate: '2026-06-26', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP I
  { id: 49, groupName: 'I', homeTeam: 'France', awayTeam: 'Senegal', matchDate: '2026-06-16', status: 'PLAYED', homeScore: 3, awayScore: 1 },
  { id: 50, groupName: 'I', homeTeam: 'Iraq', awayTeam: 'Norway', matchDate: '2026-06-16', status: 'PLAYED', homeScore: 1, awayScore: 4 },
  { id: 51, groupName: 'I', homeTeam: 'France', awayTeam: 'Iraq', matchDate: '2026-06-21', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 52, groupName: 'I', homeTeam: 'Senegal', awayTeam: 'Norway', matchDate: '2026-06-21', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 53, groupName: 'I', homeTeam: 'France', awayTeam: 'Norway', matchDate: '2026-06-26', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 54, groupName: 'I', homeTeam: 'Iraq', awayTeam: 'Senegal', matchDate: '2026-06-26', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP J
  { id: 55, groupName: 'J', homeTeam: 'Argentina', awayTeam: 'Algeria', matchDate: '2026-06-16', status: 'UPCOMING', homeScore: 3, awayScore: 0 },
  { id: 56, groupName: 'J', homeTeam: 'Austria', awayTeam: 'Jordan', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 57, groupName: 'J', homeTeam: 'Argentina', awayTeam: 'Austria', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 58, groupName: 'J', homeTeam: 'Algeria', awayTeam: 'Jordan', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 59, groupName: 'J', homeTeam: 'Argentina', awayTeam: 'Jordan', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 60, groupName: 'J', homeTeam: 'Austria', awayTeam: 'Algeria', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP K
  { id: 61, groupName: 'K', homeTeam: 'Portugal', awayTeam: 'Congo DR', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 62, groupName: 'K', homeTeam: 'Uzbekistan', awayTeam: 'Colombia', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 63, groupName: 'K', homeTeam: 'Portugal', awayTeam: 'Uzbekistan', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 64, groupName: 'K', homeTeam: 'Congo DR', awayTeam: 'Colombia', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 65, groupName: 'K', homeTeam: 'Portugal', awayTeam: 'Colombia', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 66, groupName: 'K', homeTeam: 'Uzbekistan', awayTeam: 'Congo DR', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null },

  // GROUP L
  { id: 67, groupName: 'L', homeTeam: 'England', awayTeam: 'Croatia', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 68, groupName: 'L', homeTeam: 'Ghana', awayTeam: 'Panama', matchDate: '2026-06-17', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 69, groupName: 'L', homeTeam: 'England', awayTeam: 'Ghana', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 70, groupName: 'L', homeTeam: 'Croatia', awayTeam: 'Panama', matchDate: '2026-06-22', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 71, groupName: 'L', homeTeam: 'England', awayTeam: 'Panama', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null },
  { id: 72, groupName: 'L', homeTeam: 'Croatia', awayTeam: 'Ghana', matchDate: '2026-06-27', status: 'UPCOMING', homeScore: null, awayScore: null }
];
