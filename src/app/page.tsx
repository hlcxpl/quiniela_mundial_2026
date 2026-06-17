'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Match, Prediction, Participant, GroupStandingRow, ParticipantScore, KnockoutMatch } from '../types';
import { TEAMS, GROUPS } from '../data/initialData';
import { 
  calculateGroupStandings, 
  getBestThirdPlaceTeams, 
  getRoundOf32Matchups,
  calculateParticipantScore,
  getCompleteKnockoutMatches,
  calculateKnockoutMatchPoints
} from '../utils/calculations';
import styles from './page.module.css';

export default function QuinielaPage() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // UI Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'groups' | 'knockout' | 'leaderboard' | 'admin' | 'rules'>('groups');
  const [activeGroup, setActiveGroup] = useState<string>('A');
  const [bracketZoom, setBracketZoom] = useState<number>(0.7);
  const [adminSubTab, setAdminSubTab] = useState<'groups' | 'knockout'>('groups');

  // Backend Data State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, string>>({});
  const [knockoutScores, setKnockoutScores] = useState<Record<string, { home: number | ''; away: number | '' }>>({});
  const [knockoutResults, setKnockoutResults] = useState<Record<string, { winnerTeam: string; homeScore: number | ''; awayScore: number | '' }>>({});

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);

  // Interactive Tutorial State
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sports News State
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState<boolean>(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
      setLeaderboardLoading(false);
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
      setLeaderboardLoading(false);
    }
  }, []);

  const handleTabChange = (tab: 'groups' | 'knockout' | 'leaderboard' | 'admin' | 'rules') => {
    setActiveTab(tab);
    if (tab === 'leaderboard') {
      fetchLeaderboard();
    }
  };

  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
      setNewsLoading(false);
    } catch (e) {
      console.error('Error fetching news:', e);
      setNewsLoading(false);
    }
  };

  // Parse dates relative to Chile timezone (UTC-4 in winter/June)
  const parseMatchDateChile = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.includes(':')) {
      if (dateStr.endsWith('Z') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 7) || dateStr.includes('+')) {
        return new Date(dateStr);
      }
      return new Date(`${dateStr.replace(' ', 'T')}-04:00`);
    }
    // Si no tiene componente de hora, asumimos las 23:59:59 para mantenerlo abierto todo el día
    return new Date(`${dateStr}T23:59:59-04:00`);
  };

  // Helper to determine free channels
  const getFreeBroadcasters = (match: Match): string[] => {
    const channels = ['ViX (Gratis)', 'Pluto TV'];
    const home = match.homeTeam.toLowerCase();
    const away = match.awayTeam.toLowerCase();
    
    if (home.includes('mexico') || away.includes('mexico')) {
      channels.unshift('Canal 5', 'Azteca 7');
    }
    if (home.includes('united states') || away.includes('united states') || home.includes('usa') || away.includes('usa')) {
      channels.unshift('FOX (OTA)', 'Telemundo');
    }
    if (home.includes('spain') || away.includes('spain') || home.includes('españa') || away.includes('españa')) {
      channels.unshift('La 1 (RTVE)', 'RTVE Play');
    }
    if (home.includes('argentina') || away.includes('argentina')) {
      channels.unshift('TV Pública', 'Telefe');
    }
    if (home.includes('colombia') || away.includes('colombia')) {
      channels.unshift('Caracol TV', 'RCN');
    }
    if (home.includes('england') || away.includes('england') || home.includes('croatia') || away.includes('croatia')) {
      channels.unshift('BBC One', 'ITV 1');
    }
    return channels;
  };

  // Load user from localStorage and fetch news on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('quiniela_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setSelectedParticipantId(user.id);
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
    fetchNews();
  }, []);

  // Fetch initial database data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch participants list
      const partRes = await fetch('/api/participants');
      const partData = await partRes.json();
      setParticipants(partData);

      // Fetch matches list (including results)
      const matchRes = await fetch('/api/matches');
      const matchData = await matchRes.json();
      setMatches(matchData);

      // Fetch official knockout results
      const koResultsRes = await fetch('/api/knockout-results');
      let koResultsData = {};
      if (koResultsRes.ok) {
        koResultsData = await koResultsRes.json();
        setKnockoutResults(koResultsData);
      }

      // Fetch predictions for the active view
      const activeId = selectedParticipantIdRef.current || (currentUserRef.current ? currentUserRef.current.id : null);
      if (activeId) {
        const predRes = await fetch(`/api/predictions?participantId=${activeId}`);
        const predData = await predRes.json();
        
        const mappedPreds: Prediction[] = predData.predictions.map((p: any) => ({
          participantId: activeId,
          matchId: p.matchId,
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore
        }));

        setPredictions(mappedPreds);
        setKnockoutPredictions(predData.knockoutPredictions || {});
        setKnockoutScores(predData.knockoutScores || {});
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      showStatus('Error al cargar datos del servidor', 'error');
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep refs in sync so fetchData/polling can read latest values without being in deps
  const currentUserRef = useRef(currentUser);
  const selectedParticipantIdRef = useRef(selectedParticipantId);
  const matchesRef = useRef(matches);
  const activeTabRef = useRef(activeTab);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { selectedParticipantIdRef.current = selectedParticipantId; }, [selectedParticipantId]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Trigger fetch when mount, or when selected participant shifts
  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      setLoading(false);
    }
  // fetchData is stable (useCallback with [] deps), so this is safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedParticipantId]);

  // Check if user has seen tutorial once logged in
  useEffect(() => {
    if (currentUser) {
      const hasSeen = localStorage.getItem('hasSeenTutorial_2026');
      if (hasSeen !== 'true') {
        setShowTutorial(true);
        setTutorialStep(0);
      }
    } else {
      setShowTutorial(false);
    }
  }, [currentUser]);

  const handleSkipTutorial = () => {
    localStorage.setItem('hasSeenTutorial_2026', 'true');
    setShowTutorial(false);
  };

  const handleNextTutorial = () => {
    if (tutorialStep < 4) {
      setTutorialStep(prev => prev + 1);
    } else {
      handleSkipTutorial();
    }
  };

  const handlePrevTutorial = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  const handleStartTutorial = () => {
    setTutorialStep(0);
    setShowTutorial(true);
  };

  // Smart Polling Effect to update scores dynamically
  // IMPORTANT: We do NOT put `matches` or `activeTab` in deps here.
  // Instead we use refs (matchesRef, activeTabRef) so this effect only
  // runs once on mount (per user login) and doesn't re-trigger every
  // time fetchData updates matches state — which was the infinite loop.
  useEffect(() => {
    if (!currentUser) return;
    
    let timerId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const runPollingLogic = () => {
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);

      const currentMatches = matchesRef.current;
      if (!currentMatches || currentMatches.length === 0) return;

      const now = new Date();
      let hasLiveMatch = false;
      let nextKickoffTime: Date | null = null;
      let expectedMatchEndTime: Date | null = null;

      currentMatches.forEach(match => {
        try {
          const kickoff = parseMatchDateChile(match.matchDate);
          // Standard soccer match duration including halftime & extra time = ~130 minutes
          const endTime = new Date(kickoff.getTime() + 130 * 60 * 1000);

          if (match.status !== 'PLAYED') {
            if (now >= kickoff && now <= endTime) {
              hasLiveMatch = true;
            } else if (now < kickoff) {
              if (!nextKickoffTime || kickoff < nextKickoffTime) {
                nextKickoffTime = kickoff;
              }
            }
          }

          if (now < endTime) {
            if (!expectedMatchEndTime || endTime < expectedMatchEndTime) {
              expectedMatchEndTime = endTime;
            }
          }
        } catch (e) {
          console.error('Error parsing match date for polling:', e);
        }
      });

      if (hasLiveMatch) {
        console.log('Hay un partido en curso. Sincronizando y actualizando marcadores cada 4 minutos.');
        // Sync immediately once
        fetch('/api/sync').then(() => {
          fetchData();
          if (activeTabRef.current === 'leaderboard') fetchLeaderboard();
        }).catch(err => console.error('Error during initial live sync:', err));

        intervalId = setInterval(async () => {
          try {
            await fetch('/api/sync');
          } catch (e) {
            console.error('Error during auto-sync:', e);
          }
          fetchData();
          if (activeTabRef.current === 'leaderboard') fetchLeaderboard();
        }, 4 * 60 * 1000); // 4 minutes
      } else {
        // Find the next closest event to trigger a single update (either a kickoff or match end)
        let nextTriggerTime: Date | null = null;
        if (nextKickoffTime) nextTriggerTime = nextKickoffTime;
        if (expectedMatchEndTime) {
          if (!nextTriggerTime || expectedMatchEndTime < nextTriggerTime) {
            nextTriggerTime = expectedMatchEndTime;
          }
        }

        if (nextTriggerTime) {
          const msUntilTrigger = (nextTriggerTime as Date).getTime() - now.getTime();
          if (msUntilTrigger > 0) {
            console.log(`No hay partidos en curso. Programando próxima actualización en ${Math.round(msUntilTrigger / 1000)}s (${(nextTriggerTime as Date).toISOString()})`);
            timerId = setTimeout(() => {
              fetchData();
              if (activeTabRef.current === 'leaderboard') fetchLeaderboard();
              runPollingLogic(); // Recalculate states
            }, msUntilTrigger);
          }
        } else {
          console.log('No hay partidos programados en el futuro.');
        }
      }
    };

    // Delay slightly to ensure matchesRef is populated after initial fetchData
    const initTimer = setTimeout(runPollingLogic, 2000);

    return () => {
      clearTimeout(initTimer);
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  // Only re-run when the user changes (login/logout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Alert/Status helper
  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!usernameInput.trim() || !passwordInput) {
      setAuthError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('quiniela_user', JSON.stringify(data));
        setCurrentUser(data);
        setSelectedParticipantId(data.id);
        setUsernameInput('');
        setPasswordInput('');
        showStatus(`¡Bienvenido de nuevo, ${data.name}!`, 'success');
      } else {
        setAuthError(data.error || 'Usuario o contraseña incorrectos.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Error de red al intentar iniciar sesión.');
      setLoading(false);
    }
  };

  // Handle Registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!usernameInput.trim() || !passwordInput) {
      setAuthError('Por favor ingresa un usuario y una contraseña.');
      return;
    }

    if (passwordInput.length < 4) {
      setAuthError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('quiniela_user', JSON.stringify(data));
        setCurrentUser(data);
        setSelectedParticipantId(data.id);
        setUsernameInput('');
        setPasswordInput('');
        showStatus(`¡Registro exitoso! Bienvenido, ${data.name}`, 'success');
      } else {
        setAuthError(data.error || 'Error al intentar registrarse.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Register error:', error);
      setAuthError('Error de red al intentar registrarse.');
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('quiniela_user');
    setCurrentUser(null);
    setSelectedParticipantId(null);
    setPredictions([]);
    setKnockoutPredictions({});
    setKnockoutScores({});
    showStatus('Sesión cerrada correctamente', 'success');
  };

  // Update a prediction score locally (only if eligible)
  const handlePredictionChange = (matchId: number, isHome: boolean, val: string) => {
    if (!currentUser || selectedParticipantId !== currentUser.id) return;

    // Check if match already has score (PLAYED)
    const matchObj = matches.find(m => m.id === matchId);
    if (matchObj && matchObj.status === 'PLAYED') return;

    const parsedVal = val === '' ? null : parseInt(val, 10);
    
    setPredictions(prev => {
      const existingIdx = prev.findIndex(p => p.matchId === matchId);
      
      if (existingIdx > -1) {
        const updated = [...prev];
        if (parsedVal === null) {
          if (isHome) {
            updated[existingIdx].predictedHomeScore = '' as any;
          } else {
            updated[existingIdx].predictedAwayScore = '' as any;
          }
        } else {
          if (isHome) {
            updated[existingIdx].predictedHomeScore = parsedVal;
          } else {
            updated[existingIdx].predictedAwayScore = parsedVal;
          }
        }
        return updated;
      } else {
        return [...prev, {
          participantId: currentUser.id,
          matchId,
          predictedHomeScore: isHome ? (parsedVal ?? 0) : 0,
          predictedAwayScore: isHome ? 0 : (parsedVal ?? 0)
        }];
      }
    });
  };

  // Save predictions to server
  const handleSavePredictions = async () => {
    if (!currentUser || selectedParticipantId !== currentUser.id) return;
    try {
      setSaving(true);
      
      // Filter out incomplete predictions (empty values)
      const validPredictions = predictions.filter(
        p => p.predictedHomeScore !== ('' as any) && p.predictedAwayScore !== ('' as any)
      );

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUser.id,
          predictions: validPredictions,
          knockoutPredictions,
          knockoutScores
        })
      });

      if (res.ok) {
        showStatus('¡Tus predicciones han sido guardadas!', 'success');
        fetchData(); // Refresh calculations
      } else {
        const data = await res.json();
        showStatus(data.error || 'Error al guardar predicciones', 'error');
      }
      setSaving(false);
    } catch (error) {
      console.error('Error saving predictions:', error);
      showStatus('Error de red al guardar', 'error');
      setSaving(false);
    }
  };

  // Update actual match score (Admin Tab)
  const handleAdminScoreChange = async (matchId: number, homeVal: string, awayVal: string, status: 'PLAYED' | 'UPCOMING') => {
    try {
      const homeScore = homeVal === '' ? null : parseInt(homeVal, 10);
      const awayScore = awayVal === '' ? null : parseInt(awayVal, 10);

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          homeScore,
          awayScore,
          status
        })
      });

      if (res.ok) {
        showStatus('Marcador oficial actualizado', 'success');
        // Refresh matching data
        const matchRes = await fetch('/api/matches');
        const matchData = await matchRes.json();
        setMatches(matchData);
      } else {
        const data = await res.json();
        showStatus(data.error || 'Error al actualizar marcador', 'error');
      }
    } catch (error) {
      console.error('Error updating match score:', error);
      showStatus('Error de red al actualizar marcador', 'error');
    }
  };

  // Update actual knockout match score and winner (Admin Tab)
  const handleAdminKnockoutScoreUpdate = async (matchId: string, homeVal: string, awayVal: string, winnerTeam: string) => {
    try {
      const res = await fetch('/api/knockout-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          homeScore: homeVal === '' ? null : parseInt(homeVal, 10),
          awayScore: awayVal === '' ? null : parseInt(awayVal, 10),
          winnerTeam: winnerTeam || null
        })
      });

      if (res.ok) {
        showStatus('Resultado oficial de eliminatoria actualizado', 'success');
        // Refresh matching data
        fetchData();
        fetchLeaderboard();
      } else {
        const data = await res.json();
        showStatus(data.error || 'Error al actualizar resultado', 'error');
      }
    } catch (error) {
      console.error('Error updating admin knockout result:', error);
      showStatus('Error de red al actualizar resultado', 'error');
    }
  };

  // Sync official schedule and times
  const handleSyncSchedule = async () => {
    try {
      showStatus('Sincronizando horarios con la API...', 'success');
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok) {
        showStatus(data.message || 'Horarios sincronizados con éxito', 'success');
        fetchData(); // Refresh UI
      } else {
        showStatus(data.error || 'Error al sincronizar horarios', 'error');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showStatus('Error de red al sincronizar', 'error');
    }
  };

  // Clear dependent selections
  const clearDependentSelections = (updated: Record<string, string>, parentId: string, prevWinner: string) => {
    const childMatchMapping: Record<string, { childId: string }> = {
      'R32-1': { childId: 'R16-1' }, 'R32-2': { childId: 'R16-1' },
      'R32-3': { childId: 'R16-2' }, 'R32-4': { childId: 'R16-2' },
      'R32-5': { childId: 'R16-3' }, 'R32-6': { childId: 'R16-3' },
      'R32-7': { childId: 'R16-4' }, 'R32-8': { childId: 'R16-4' },
      'R32-9': { childId: 'R16-5' }, 'R32-10': { childId: 'R16-5' },
      'R32-11': { childId: 'R16-6' }, 'R32-12': { childId: 'R16-6' },
      'R32-13': { childId: 'R16-7' }, 'R32-14': { childId: 'R16-7' },
      'R32-15': { childId: 'R16-8' }, 'R32-16': { childId: 'R16-8' },

      'R16-1': { childId: 'QF-1' }, 'R16-2': { childId: 'QF-1' },
      'R16-3': { childId: 'QF-2' }, 'R16-4': { childId: 'QF-2' },
      'R16-5': { childId: 'QF-3' }, 'R16-6': { childId: 'QF-3' },
      'R16-7': { childId: 'QF-4' }, 'R16-8': { childId: 'QF-4' },

      'QF-1': { childId: 'SF-1' }, 'QF-2': { childId: 'SF-1' },
      'QF-3': { childId: 'SF-2' }, 'QF-4': { childId: 'SF-2' },

      'SF-1': { childId: 'F' }, 'SF-2': { childId: 'F' }
    };

    const map = childMatchMapping[parentId];
    if (map) {
      const childId = map.childId;
      if (updated[childId] === prevWinner) {
        updated[childId] = '';
        clearDependentSelections(updated, childId, prevWinner);
      }
    }
  };

  // Select team in knockout bracket
  const handleSelectKnockoutWinner = (matchId: string, teamName: string, forceSelect?: boolean) => {
    if (!currentUser || selectedParticipantId !== currentUser.id) return;
    if (!teamName || teamName.startsWith('Ganador') || teamName.startsWith('2do') || teamName.startsWith('3ro') || teamName.startsWith('Finalista')) return;

    // Manual click verification (if not forced automatically by score comparison)
    const scores = knockoutScores[matchId] || { home: '', away: '' };
    const home = scores.home;
    const away = scores.away;
    const isTie = home !== '' && away !== '' && Number(home) === Number(away);

    if (!forceSelect && !isTie) {
      // Manual click has no effect if scores are not equal or not entered
      return;
    }

    setKnockoutPredictions(prev => {
      const isCurrentlyWinner = prev[matchId] === teamName;
      if (forceSelect && isCurrentlyWinner) return prev;

      const updated = { ...prev };

      if (isCurrentlyWinner && !forceSelect) {
        // Toggle off (only allowed manually in ties)
        updated[matchId] = '';
        clearDependentSelections(updated, matchId, teamName);
      } else {
        // Toggle on (and clear old winner if existed)
        const prevWinner = prev[matchId];
        updated[matchId] = teamName;
        if (prevWinner && prevWinner !== teamName) {
          clearDependentSelections(updated, matchId, prevWinner);
        }
      }

      return updated;
    });
  };

  // Update score in knockout bracket and auto-select winner if there is a goal difference
  const handleKnockoutScoreChange = (matchId: string, isHome: boolean, val: string, team1: string, team2: string) => {
    if (!currentUser || selectedParticipantId !== currentUser.id) return;

    const parsedVal = val === '' ? '' : parseInt(val, 10);
    if (parsedVal !== '' && (isNaN(parsedVal) || parsedVal < 0)) return;

    setKnockoutScores(prev => {
      const matchScores = prev[matchId] || { home: '', away: '' };
      const updatedScores = {
        ...matchScores,
        [isHome ? 'home' : 'away']: parsedVal
      };

      const newScores = { ...prev, [matchId]: updatedScores };

      const home = updatedScores.home;
      const away = updatedScores.away;

      if (home === '' || away === '') {
        // If scores are cleared or incomplete, delete winner and clear downstream selections
        setTimeout(() => {
          setKnockoutPredictions(prevPreds => {
            const prevWinner = prevPreds[matchId];
            if (prevWinner) {
              const updated = { ...prevPreds };
              updated[matchId] = '';
              clearDependentSelections(updated, matchId, prevWinner);
              return updated;
            }
            return prevPreds;
          });
        }, 0);
      } else {
        const homeInt = Number(home);
        const awayInt = Number(away);
        if (homeInt > awayInt) {
          setTimeout(() => {
            handleSelectKnockoutWinner(matchId, team1, true);
          }, 0);
        } else if (awayInt > homeInt) {
          setTimeout(() => {
            handleSelectKnockoutWinner(matchId, team2, true);
          }, 0);
        }
      }

      return newScores;
    });
  };

  // Check if viewing own sweepstakes
  const isEditingOwn = currentUser !== null && selectedParticipantId === currentUser.id;
  const activeParticipantName = participants.find(p => p.id === selectedParticipantId)?.name || 'Invitado';

  // Auth Screen rendering if not logged in
  if (!currentUser) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        background: 'radial-gradient(circle at 50% 30%, #112d45 0%, #060b13 70%)'
      }}>
        <div style={{
          background: 'rgba(16, 24, 40, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.6s ease'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>⚽</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', background: 'linear-gradient(135deg, #ffffff 40%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Quiniela Mundial 2026
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
              Predice resultados y compite con tus amigos.
            </p>
          </div>

          {/* Tab switches */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.3rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              style={{
                flexGrow: 1,
                background: authMode === 'login' ? 'var(--primary)' : 'none',
                color: authMode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s'
              }}
            >
              Ingresar
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              style={{
                flexGrow: 1,
                background: authMode === 'register' ? 'var(--primary)' : 'none',
                color: authMode === 'register' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s'
              }}
            >
              Registrarse
            </button>
          </div>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.2rem', fontWeight: 500 }}>
              ⚠ {authError}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Usuario</label>
              <input 
                type="text" 
                placeholder="Nombre de usuario" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                style={{
                  background: 'rgba(6, 11, 19, 0.8)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                maxLength={20}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Contraseña</label>
              <input 
                type="password" 
                placeholder="Ingresa tu clave" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  background: 'rgba(6, 11, 19, 0.8)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                required
              />
            </div>

            <button 
              type="submit" 
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                padding: '0.8rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'background 0.2s',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculations derived from current state
  // 1. Build actual official bracket matchups
  const actualKoWinnersMap: Record<string, string> = {};
  Object.keys(knockoutResults).forEach(matchId => {
    actualKoWinnersMap[matchId] = knockoutResults[matchId]?.winnerTeam || '';
  });
  const actualKoMatches = getCompleteKnockoutMatches(matches, [], actualKoWinnersMap);

  // 2. Build participant's predicted bracket matchups
  const participantKoMatches = getCompleteKnockoutMatches(matches, predictions, knockoutPredictions);

  // 3. Compute points and accumulate
  let koPointsTotal = 0;
  let koExactCount = 0;
  let koOutcomeCount = 0;
  let koWrongCount = 0;

  // Let's create an ordered array of matches to compute sequential cumulative scores
  const koMatchIdsOrder: string[] = [
    ...Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`),
    ...Array.from({ length: 4 }, (_, i) => `QF-${i + 1}`),
    ...Array.from({ length: 2 }, (_, i) => `SF-${i + 1}`),
    'F'
  ];

  // We want to calculate points won at each step, explanation, and cumulative total
  const koMatchesPointsInfo: Record<string, {
    pointsGained: number;
    explanation: string;
    actualScore: string;
    actualWinner: string;
    cumulativePoints: number;
  }> = {};

  const groupStageScoreCard = selectedParticipantId
    ? calculateParticipantScore(selectedParticipantId, activeParticipantName, matches, predictions)
    : { participantId: 0, name: 'N/A', points: 0, exactCount: 0, outcomeCount: 0, wrongCount: 0, totalPredictions: 0 };

  let runningCumulativePoints = groupStageScoreCard.points;

  koMatchIdsOrder.forEach(matchId => {
    const actualResult = knockoutResults[matchId];
    const actualMatch = actualKoMatches[matchId];
    const predMatch = participantKoMatches[matchId];

    if (actualResult && actualMatch && predMatch) {
      const predWinner = knockoutPredictions[matchId] || '';
      const predScores = knockoutScores[matchId] || { home: '', away: '' };

      const { points: matchPts, explanation } = calculateKnockoutMatchPoints(
        predMatch.team1,
        predMatch.team2,
        predScores.home,
        predScores.away,
        predWinner,
        actualMatch.team1,
        actualMatch.team2,
        actualResult.homeScore,
        actualResult.awayScore,
        actualResult.winnerTeam
      );

      // Check if match was actually played/recorded
      const isPlayed = actualResult.homeScore !== '' && actualResult.homeScore !== null &&
                       actualResult.awayScore !== '' && actualResult.awayScore !== null &&
                       !!actualResult.winnerTeam;

      if (isPlayed) {
        koPointsTotal += matchPts;
        if (matchPts === 3) koExactCount += 1;
        else if (matchPts === 1) koOutcomeCount += 1;
        else koWrongCount += 1;

        runningCumulativePoints += matchPts;

        koMatchesPointsInfo[matchId] = {
          pointsGained: matchPts,
          explanation,
          actualScore: `${actualMatch.team1} ${actualResult.homeScore} - ${actualResult.awayScore} ${actualMatch.team2}`,
          actualWinner: actualResult.winnerTeam,
          cumulativePoints: runningCumulativePoints
        };
      }
    }
  });

  // Combined score card (Group + Knockout)
  const scoreCard: ParticipantScore = {
    participantId: groupStageScoreCard.participantId,
    name: groupStageScoreCard.name,
    points: groupStageScoreCard.points + koPointsTotal,
    exactCount: groupStageScoreCard.exactCount + koExactCount,
    outcomeCount: groupStageScoreCard.outcomeCount + koOutcomeCount,
    wrongCount: groupStageScoreCard.wrongCount + koWrongCount,
    totalPredictions: groupStageScoreCard.totalPredictions + Object.keys(knockoutPredictions).length
  };

  const activeGroupMatches = matches.filter(m => m.groupName === activeGroup);
  const activeGroupTeams = GROUPS[activeGroup] || [];
  const groupStandings = calculateGroupStandings(activeGroupTeams, activeGroupMatches, predictions);

  const r32Matches = getRoundOf32Matchups(GROUPS, matches, predictions);
  
  const getWinnerOf = (matchId: string, defaultName: string): string => {
    return knockoutPredictions[matchId] || defaultName;
  };

  const r16Matches: KnockoutMatch[] = [
    { id: 'R16-1', roundName: 'R16', team1: getWinnerOf('R32-1', 'Ganador R32 M1'), team2: getWinnerOf('R32-2', 'Ganador R32 M2'), placeholder1: 'Ganador M1', placeholder2: 'Ganador M2' },
    { id: 'R16-2', roundName: 'R16', team1: getWinnerOf('R32-3', 'Ganador R32 M3'), team2: getWinnerOf('R32-4', 'Ganador R32 M4'), placeholder1: 'Ganador M3', placeholder2: 'Ganador M4' },
    { id: 'R16-3', roundName: 'R16', team1: getWinnerOf('R32-5', 'Ganador R32 M5'), team2: getWinnerOf('R32-6', 'Ganador R32 M6'), placeholder1: 'Ganador M5', placeholder2: 'Ganador M6' },
    { id: 'R16-4', roundName: 'R16', team1: getWinnerOf('R32-7', 'Ganador R32 M7'), team2: getWinnerOf('R32-8', 'Ganador R32 M8'), placeholder1: 'Ganador M7', placeholder2: 'Ganador M8' },
    { id: 'R16-5', roundName: 'R16', team1: getWinnerOf('R32-9', 'Ganador R32 M9'), team2: getWinnerOf('R32-10', 'Ganador R32 M10'), placeholder1: 'Ganador M9', placeholder2: 'Ganador M10' },
    { id: 'R16-6', roundName: 'R16', team1: getWinnerOf('R32-11', 'Ganador R32 M11'), team2: getWinnerOf('R32-12', 'Ganador R32 M12'), placeholder1: 'Ganador M11', placeholder2: 'Ganador M12' },
    { id: 'R16-7', roundName: 'R16', team1: getWinnerOf('R32-13', 'Ganador R32 M13'), team2: getWinnerOf('R32-14', 'Ganador R32 M14'), placeholder1: 'Ganador M13', placeholder2: 'Ganador M14' },
    { id: 'R16-8', roundName: 'R16', team1: getWinnerOf('R32-15', 'Ganador R32 M15'), team2: getWinnerOf('R32-16', 'Ganador R32 M16'), placeholder1: 'Ganador M15', placeholder2: 'Ganador M16' }
  ];

  const qfMatches: KnockoutMatch[] = [
    { id: 'QF-1', roundName: 'QF', team1: getWinnerOf('R16-1', 'Ganador R16 M1'), team2: getWinnerOf('R16-2', 'Ganador R16 M2'), placeholder1: 'Ganador M1', placeholder2: 'Ganador M2' },
    { id: 'QF-2', roundName: 'QF', team1: getWinnerOf('R16-3', 'Ganador R16 M3'), team2: getWinnerOf('R16-4', 'Ganador R16 M4'), placeholder1: 'Ganador M3', placeholder2: 'Ganador M4' },
    { id: 'QF-3', roundName: 'QF', team1: getWinnerOf('R16-5', 'Ganador R16 M5'), team2: getWinnerOf('R16-6', 'Ganador R16 M6'), placeholder1: 'Ganador M5', placeholder2: 'Ganador M6' },
    { id: 'QF-4', roundName: 'QF', team1: getWinnerOf('R16-7', 'Ganador R16 M7'), team2: getWinnerOf('R16-8', 'Ganador R16 M8'), placeholder1: 'Ganador M7', placeholder2: 'Ganador M8' }
  ];

  const sfMatches: KnockoutMatch[] = [
    { id: 'SF-1', roundName: 'SF', team1: getWinnerOf('QF-1', 'Ganador QF M1'), team2: getWinnerOf('QF-2', 'Ganador QF M2'), placeholder1: 'Ganador Q1', placeholder2: 'Ganador Q2' },
    { id: 'SF-2', roundName: 'SF', team1: getWinnerOf('QF-3', 'Ganador QF M3'), team2: getWinnerOf('QF-4', 'Ganador QF M4'), placeholder1: 'Ganador Q3', placeholder2: 'Ganador Q4' }
  ];

  const finalMatch: KnockoutMatch = {
    id: 'F',
    roundName: 'F',
    team1: getWinnerOf('SF-1', 'Finalista 1'),
    team2: getWinnerOf('SF-2', 'Finalista 2'),
    placeholder1: 'Finalista 1',
    placeholder2: 'Finalista 2'
  };

  const renderKnockoutMatch = (match: KnockoutMatch) => {
    const winner = knockoutPredictions[match.id] || '';
    const scores = knockoutScores[match.id] || { home: '', away: '' };
    const t1Exists = !match.team1.startsWith('Ganador') && !match.team1.startsWith('2do') && !match.team1.startsWith('3ro') && !match.team1.startsWith('Finalista');
    const t2Exists = !match.team2.startsWith('Ganador') && !match.team2.startsWith('2do') && !match.team2.startsWith('3ro') && !match.team2.startsWith('Finalista');
    const isFinal = match.roundName === 'F';
    const ptsInfo = koMatchesPointsInfo[match.id];

    return (
      <div key={match.id} className={styles.koMatch} style={isFinal ? { border: '2px solid var(--accent)', margin: '0' } : undefined}>
        {/* Points Badge */}
        {ptsInfo && (
          <div className={`${styles.koPointsBadge} ${
            ptsInfo.pointsGained === 3 ? styles.exactPoints :
            ptsInfo.pointsGained === 1 ? styles.outcomePoints : styles.zeroPoints
          }`}>
            +{ptsInfo.pointsGained} PTS
          </div>
        )}

        {/* Hover Tooltip */}
        {ptsInfo && (
          <div className={styles.koTooltip}>
            <div className={styles.koTooltipTitle}>Resultado Real</div>
            <div className={styles.koTooltipScore}>{ptsInfo.actualScore}</div>
            <div className={styles.koTooltipWinner}>Ganador Oficial: {ptsInfo.actualWinner}</div>
            <div style={{ margin: '0.4rem 0', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div className={styles.koTooltipPoints}>{ptsInfo.explanation}</div>
            <div className={styles.koTooltipCumulative}>Acumulado: <strong>{ptsInfo.cumulativePoints} PTS</strong></div>
          </div>
        )}

        {/* Team 1 (Home) */}
        <div 
          onClick={() => isEditingOwn && t1Exists && handleSelectKnockoutWinner(match.id, match.team1)}
          className={`${styles.koTeam} ${winner === match.team1 ? styles.koTeamWinner : ''}`}
          style={{ cursor: (isEditingOwn && t1Exists) ? 'pointer' : 'default' }}
        >
          <div className={styles.koTeamContent}>
            <span className={styles.flag}>{(TEAMS[match.team1] || {}).flag}</span>
            {t1Exists ? (
              <span className={styles.koTeamName}>{match.team1}</span>
            ) : (
              <span className={styles.koTeamPlaceholder}>{match.placeholder1}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t1Exists && t2Exists && (
              isEditingOwn ? (
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scores.home}
                  onChange={(e) => handleKnockoutScoreChange(match.id, true, e.target.value, match.team1, match.team2)}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.koScoreInput}
                  placeholder="-"
                />
              ) : (
                scores.home !== '' && <span className={styles.koScoreDisplay}>{scores.home}</span>
              )
            )}
            {t1Exists && winner === match.team1 && (
              <span 
                style={isFinal ? { color: 'var(--accent)' } : undefined} 
                className={styles.koTeamWinnerCheck}
              >
                {isFinal ? '👑' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Team 2 (Away) */}
        <div 
          onClick={() => isEditingOwn && t2Exists && handleSelectKnockoutWinner(match.id, match.team2)}
          className={`${styles.koTeam} ${winner === match.team2 ? styles.koTeamWinner : ''}`}
          style={{ cursor: (isEditingOwn && t2Exists) ? 'pointer' : 'default' }}
        >
          <div className={styles.koTeamContent}>
            <span className={styles.flag}>{(TEAMS[match.team2] || {}).flag}</span>
            {t2Exists ? (
              <span className={styles.koTeamName}>{match.team2}</span>
            ) : (
              <span className={styles.koTeamPlaceholder}>{match.placeholder2}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t1Exists && t2Exists && (
              isEditingOwn ? (
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scores.away}
                  onChange={(e) => handleKnockoutScoreChange(match.id, false, e.target.value, match.team1, match.team2)}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.koScoreInput}
                  placeholder="-"
                />
              ) : (
                scores.away !== '' && <span className={styles.koScoreDisplay}>{scores.away}</span>
              )
            )}
            {t2Exists && winner === match.team2 && (
              <span 
                style={isFinal ? { color: 'var(--accent)' } : undefined} 
                className={styles.koTeamWinnerCheck}
              >
                {isFinal ? '👑' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const champion = getWinnerOf('F', '');

  const groupStageMatchesCount = 72;
  const completedPredictionsCount = predictions.filter(
    p => p.predictedHomeScore !== ('' as any) && p.predictedAwayScore !== ('' as any)
  ).length;

  return (
    <>
      {/* Dark base layer - always visible, never white */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -3, background: '#04080f', pointerEvents: 'none' }} />

      {/* Background image layer */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -2, pointerEvents: 'none', overflow: 'hidden' }}>
        <Image
          src="/images/world_cup_bg.jpg"
          alt="World Cup 2026 Background"
          fill
          priority
          quality={75}
          sizes="100vw"
          style={{ objectFit: 'cover', opacity: 0.55 }}
        />
      </div>

      {/* Subtle dark overlay for text readability */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, pointerEvents: 'none', background: 'rgba(4, 8, 15, 0.45)' }} />

      {/* Interactive Tutorial Overlay */}
      {showTutorial && (
        <div className={styles.tutorialOverlay}>
          <div className={styles.tutorialCard}>
            <div className={styles.tutorialHeader}>
              <h3>Cómo Jugar - Paso {tutorialStep + 1} de 5</h3>
              <button onClick={handleSkipTutorial} className={styles.tutorialCloseBtn}>×</button>
            </div>
            
            <div className={styles.tutorialBody}>
              {tutorialStep === 0 && (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>👤</div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>1. Identidad y Visualización</h4>
                  <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    Estás registrado como <strong>{currentUser.name}</strong>. En la esquina superior derecha puedes ver tu sesión y también seleccionar la quiniela de otros participantes para ver sus pronósticos en modo de solo lectura.
                  </p>
                </div>
              )}
              {tutorialStep === 1 && (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>⚽</div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>2. Pronosticar Fase de Grupos</h4>
                  <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    En la pestaña de <strong>Fase de Grupos</strong>, selecciona la letra del grupo (A - L) e ingresa tus predicciones de marcadores. Al llenar los marcadores, la tabla de posiciones del grupo se calculará automáticamente al instante.
                  </p>
                </div>
              )}
              {tutorialStep === 2 && (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>🏆</div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>3. Simulador de Eliminación Directa</h4>
                  <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    Una vez definidos los puestos en fase de grupos, ve a <strong>Eliminación Directa</strong>. Allí podrás predecir las llaves desde Dieciseisavos (Round of 32) hasta la Final. Haz clic sobre el escudo del equipo que crees que ganará o ingresa goles para avanzar tu llave automáticamente.
                  </p>
                </div>
              )}
              {tutorialStep === 3 && (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>📊</div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>4. Puntuaciones y Clasificación</h4>
                  <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    En la pestaña de <strong>Tabla de Posiciones</strong> se calcula el puntaje oficial de los participantes:
                  </p>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5, listStyleType: 'disc' }}>
                    <li><strong style={{ color: '#ffffff' }}>3 Puntos:</strong> Si aciertas el marcador exacto del partido.</li>
                    <li><strong style={{ color: '#ffffff' }}>1 Punto:</strong> Si aciertas el ganador o empate, pero no el marcador exacto.</li>
                    <li><strong style={{ color: '#ffffff' }}>0 Puntos:</strong> Si fallas el resultado.</li>
                  </ul>
                </div>
              )}
              {tutorialStep === 4 && (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>📰</div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>5. Reseñas y Noticias en Tiempo Real</h4>
                  <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    En el panel de <strong>Reseñas del Mundial</strong> verás resúmenes automáticos y previas de los partidos. Estas noticias se van actualizando diariamente a medida que se juegan los partidos reales del torneo.
                  </p>
                </div>
              )}
            </div>
            
            <div className={styles.tutorialFooter}>
              <button 
                onClick={handleSkipTutorial} 
                className={styles.tutorialBtnSkip}
              >
                Omitir
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handlePrevTutorial} 
                  disabled={tutorialStep === 0}
                  className={styles.tutorialBtnNav}
                  style={{ opacity: tutorialStep === 0 ? 0.4 : 1 }}
                >
                  Atrás
                </button>
                <button 
                  onClick={handleNextTutorial} 
                  className={styles.tutorialBtnPrimary}
                >
                  {tutorialStep === 4 ? 'Finalizar' : 'Siguiente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.container} ${activeTab === 'knockout' ? styles.wideContainer : ''}`}>
        {/* Floating Status Notification */}
      {statusMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: statusMessage.type === 'success' ? 'rgba(6, 78, 59, 0.95)' : 'rgba(127, 29, 29, 0.95)',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          {statusMessage.type === 'success' ? '✓' : '✗'} {statusMessage.text}
        </div>
      )}

      {/* Header section */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Quiniela Mundial 2026</h1>
          <p>
            Simulador de resultados y predicciones 
            <span className={styles.dateBadge}>Junio 16, 2026</span>
          </p>
        </div>

        {/* User Status / View Toggle */}
        <div className={styles.participantSection}>
          <div className={styles.selectGroup}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Visualizar Quiniela de:</span>
              <span style={{ color: isEditingOwn ? 'var(--primary)' : 'var(--accent)', fontWeight: 700 }}>
                {isEditingOwn ? '● Tu Quiniela' : '👁️ Modo Lectura'}
              </span>
            </label>
            <div className={styles.selectControls}>
              <select 
                value={selectedParticipantId || ''} 
                onChange={(e) => setSelectedParticipantId(parseInt(e.target.value, 10))}
                className={styles.selectInput}
              >
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === currentUser.id ? '(Yo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Usuario Activo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>👤 {currentUser.name}</span>
              <button onClick={handleLogout} className={styles.buttonSecondary} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                Cerrar Sesión
              </button>
              <button 
                onClick={handleStartTutorial} 
                className={styles.helpButton}
                title="Cómo Jugar - Tutorial Interactivo"
              >
                ❓
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Read only Warning Banner */}
      {!isEditingOwn && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid var(--accent)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          color: '#fef08a',
          fontSize: '0.9rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.5s ease'
        }}>
          <span>👁️</span> Estás visualizando la quiniela de <strong>{activeParticipantName}</strong> en modo de solo lectura. Los cambios que realices no se guardarán. Para modificar tus predicciones, selecciona tu usuario en la esquina superior derecha.
        </div>
      )}

      {/* Score Overview and Predictions progress */}
      <section className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={`${styles.statVal} ${styles.statValPrimary}`}>{scoreCard.points} PTS</div>
          <div className={styles.statLbl}>Puntos Obtenidos</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statVal} ${styles.statValAccent}`}>{scoreCard.exactCount}</div>
          <div className={styles.statLbl}>Marcador Exacto (+3)</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: '#3b82f6' }} className={styles.statVal}>{scoreCard.outcomeCount}</div>
          <div className={styles.statLbl}>Resultado Acertado (+1)</div>
        </div>
        <div className={styles.statCard}>
          <div style={{ color: 'var(--danger)' }} className={styles.statVal}>{scoreCard.wrongCount}</div>
          <div className={styles.statLbl}>Predicciones Erradas</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>
            {completedPredictionsCount} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ {groupStageMatchesCount}</span>
          </div>
          <div className={styles.statLbl}>Predicciones Listas</div>
        </div>
      </section>

      {/* Sticky Save Button (only visible when editing own quiniela) */}
      {isEditingOwn && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(16, 24, 40, 0.4)',
          border: '1px solid var(--border-color)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          backdropFilter: 'blur(4px)'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {saving ? 'Guardando predicciones...' : `Tienes cambios pendientes en tu quiniela`}
          </span>
          <button 
            onClick={handleSavePredictions} 
            disabled={saving} 
            className={styles.button}
            style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
          >
            {saving ? 'Guardando...' : '💾 Guardar Predicciones'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button 
          onClick={() => handleTabChange('groups')} 
          className={`${styles.tabButton} ${activeTab === 'groups' ? styles.activeTab : ''}`}
        >
          🏆 Fase de Grupos
        </button>
        <button 
          onClick={() => handleTabChange('knockout')} 
          className={`${styles.tabButton} ${activeTab === 'knockout' ? styles.activeTab : ''}`}
        >
          ⚡ Fase de Eliminación
        </button>
        <button 
          onClick={() => handleTabChange('leaderboard')} 
          className={`${styles.tabButton} ${activeTab === 'leaderboard' ? styles.activeTab : ''}`}
        >
          📊 Tabla de Participantes
        </button>
        <button 
          onClick={() => handleTabChange('admin')} 
          className={`${styles.tabButton} ${activeTab === 'admin' ? styles.activeTab : ''}`}
        >
          ⚙️ Actualizar Resultados (Admin)
        </button>
        <button 
          onClick={() => handleTabChange('rules')} 
          className={`${styles.tabButton} ${activeTab === 'rules' ? styles.activeTab : ''}`}
        >
          📜 Reglas de Puntuación
        </button>
      </nav>

      {/* Tab Contents: Groups View */}
      {activeTab === 'groups' && (
        <div className="animate-slide-up">
          {/* Groups Horizontal Selector */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {Object.keys(GROUPS).map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                style={{
                  background: activeGroup === g ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeGroup === g ? '#ffffff' : 'var(--text-secondary)',
                  border: activeGroup === g ? 'none' : '1px solid var(--border-color)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s',
                  minWidth: '45px'
                }}
              >
                Grupo {g}
              </button>
            ))}
          </div>

          {/* Live Matches Widget */}
          {(() => {
            const now = new Date();
            const liveMatches = matches.filter(match => {
              const kickoff = parseMatchDateChile(match.matchDate);
              const twoHoursLater = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
              return match.status !== 'PLAYED' && kickoff <= now && now <= twoHoursLater;
            });

            if (liveMatches.length === 0) return null;

            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(6, 11, 19, 0.6) 100%)',
                border: '2px dashed var(--danger)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '2rem',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
              }} className="animate-slide-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--danger)', letterSpacing: '0.05em' }}>
                    🔴 Partidos En Vivo
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {liveMatches.map(lm => {
                    const homeTeamData = TEAMS[lm.homeTeam] || { flag: '' };
                    const awayTeamData = TEAMS[lm.awayTeam] || { flag: '' };
                    const channels = getFreeBroadcasters(lm);

                    return (
                      <div key={lm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{homeTeamData.flag}</span>
                            <span style={{ fontWeight: 700 }}>{lm.homeTeam}</span>
                          </div>
                          <span style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--accent)', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace' }}>
                            {lm.homeScore !== null ? lm.homeScore : 0} - {lm.awayScore !== null ? lm.awayScore : 0}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px', justifyContent: 'flex-end' }}>
                            <span style={{ fontWeight: 700 }}>{lm.awayTeam}</span>
                            <span style={{ fontSize: '1.5rem' }}>{awayTeamData.flag}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          📺 <strong>Ver gratis:</strong> {channels.join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className={styles.groupsGrid}>
            {/* Standings Table Card */}
            <div className={styles.groupCard}>
              <div className={styles.groupHeader}>
                <h3>Tabla Grupo {activeGroup}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculado en tiempo real</span>
              </div>
              <div className={styles.groupTableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.pos}>Pos</th>
                      <th>Equipo</th>
                      <th className={styles.numCol}>PJ</th>
                      <th className={styles.numCol}>G</th>
                      <th className={styles.numCol}>E</th>
                      <th className={styles.numCol}>P</th>
                      <th className={styles.numCol}>GF</th>
                      <th className={styles.numCol}>GC</th>
                      <th className={styles.numCol}>DG</th>
                      <th className={styles.ptsCol}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStandings.map((row) => {
                      const teamData = TEAMS[row.team] || { flag: '', code: row.team };
                      const isAdvancing = row.position <= 2;
                      return (
                        <tr key={row.team}>
                          <td className={`${styles.pos} ${isAdvancing ? styles.posAdv : styles.posElim}`}>{row.position}</td>
                          <td>
                            <div className={styles.teamCol}>
                              <span className={styles.flag}>{teamData.flag}</span>
                              <span className={styles.teamName}>{row.team}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({teamData.code})</span>
                            </div>
                          </td>
                          <td className={styles.numCol}>{row.played}</td>
                          <td className={styles.numCol}>{row.won}</td>
                          <td className={styles.numCol}>{row.drawn}</td>
                          <td className={styles.numCol}>{row.lost}</td>
                          <td className={styles.numCol}>{row.goalsFor}</td>
                          <td className={styles.numCol}>{row.goalsAgainst}</td>
                          <td className={styles.numCol} style={{ color: row.goalDifference > 0 ? 'var(--primary)' : row.goalDifference < 0 ? 'var(--danger)' : 'inherit' }}>
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className={styles.ptsCol}>{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matches List Card */}
            <div className={styles.groupCard}>
              <div className={styles.groupHeader}>
                <h3>Partidos Grupo {activeGroup}</h3>
                <span className={styles.matchesTitle}>Predicción ({activeParticipantName})</span>
              </div>
              <div className={styles.matchesList}>
                {activeGroupMatches.map(match => {
                  const homeTeamData = TEAMS[match.homeTeam] || { flag: '' };
                  const awayTeamData = TEAMS[match.awayTeam] || { flag: '' };

                  // Find user prediction
                  const pred = predictions.find(p => p.matchId === match.id);
                  const predHome = pred ? pred.predictedHomeScore : '';
                  const predAway = pred ? pred.predictedAwayScore : '';

                  // Enforce rules:
                  // 1. Can only edit predictions for UPCOMING matches
                  // 2. Match must not have started yet (kickoff time in the future)
                  // 3. Can only edit your own predictions
                  const kickoffObj = parseMatchDateChile(match.matchDate);
                  const lockTime = new Date(kickoffObj.getTime() - 15 * 60 * 1000);
                  const hasMatchStarted = new Date() >= lockTime;
                  const isMatchEditable = match.status === 'UPCOMING' && !hasMatchStarted && isEditingOwn;

                  // Calculate points if played
                  let pointsGained: number | null = null;
                  if (match.status === 'PLAYED' && pred) {
                    pointsGained = calculateParticipantScore(selectedParticipantId!, '', [match], predictions).points;
                  }

                  return (
                    <div key={match.id} className={styles.matchCard}>
                      <div className={styles.matchInfo}>
                        {/* Match Status/Date */}
                        <div className={styles.matchDate}>
                          <span>
                            📅 {(() => {
                              try {
                                const kickoff = parseMatchDateChile(match.matchDate);
                                if (match.matchDate.includes('T')) {
                                  return kickoff.toLocaleString('es-ES', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false
                                  }) + ' hs';
                                }
                              } catch (e) {}
                              return match.matchDate;
                            })()}
                          </span>
                          {match.status === 'PLAYED' ? (
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>● Finalizado (Bloqueado)</span>
                          ) : hasMatchStarted ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>● Iniciado (Bloqueado)</span>
                          ) : (
                            <span style={{ color: isMatchEditable ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {isMatchEditable ? '⏳ Abierto' : '🔒 Solo Lectura'}
                            </span>
                          )}
                        </div>

                        {/* Free Broadcasters Info */}
                        {match.status === 'UPCOMING' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            📺 <strong>Canales gratis:</strong> {getFreeBroadcasters(match).slice(0, 3).join(', ')}
                          </div>
                        )}

                        {/* Match teams and inputs */}
                        <div className={styles.matchRow}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={styles.teamLabel}>
                              <span className={styles.flag}>{homeTeamData.flag}</span>
                              <span className={styles.teamName}>{match.homeTeam}</span>
                            </div>
                            <div className={styles.inputGroup}>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={match.status === 'PLAYED' ? (match.homeScore !== null ? match.homeScore : '') : predHome}
                                onChange={(e) => handlePredictionChange(match.id, true, e.target.value)}
                                className={styles.scoreInput}
                                placeholder="-"
                                disabled={!isMatchEditable}
                              />
                              <span className={styles.divider}>-</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={match.status === 'PLAYED' ? (match.awayScore !== null ? match.awayScore : '') : predAway}
                                onChange={(e) => handlePredictionChange(match.id, false, e.target.value)}
                                className={styles.scoreInput}
                                placeholder="-"
                                disabled={!isMatchEditable}
                              />
                            </div>
                            <div className={styles.teamLabel} style={{ justifyContent: 'flex-end', minWidth: '110px' }}>
                              <span className={styles.teamName} style={{ textAlign: 'right' }}>{match.awayTeam}</span>
                              <span className={styles.flag}>{awayTeamData.flag}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Display prediction side/badge if played */}
                      {match.status === 'PLAYED' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '1rem', minWidth: '95px' }}>
                          <div className={styles.playedResult}>
                            <span className={styles.actualScoreLabel}>Predicción</span>
                            <span className={styles.actualScoreValue} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                              {pred ? `${pred.predictedHomeScore} - ${pred.predictedAwayScore}` : 'Sin pred.'}
                            </span>
                          </div>
                          
                          {/* Points Display */}
                          {pointsGained !== null && (
                            <div className={`${styles.pointsBadge} ${
                              pointsGained === 3 ? styles.exactPoints :
                              pointsGained === 1 ? styles.outcomePoints : styles.zeroPoints
                            }`}>
                              +{pointsGained} PTS
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Knockout Simulator Bracket */}
      {activeTab === 'knockout' && (
        <div className="animate-slide-up">
          <div className={styles.bracketTitle}>
            <h3>Simulador de Eliminatorias Mundial 2026</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
              {isEditingOwn 
                ? 'Los equipos se clasifican en base a tu predicción de grupos. Los marcadores definen quién pasa (en caso de empate, haz clic en el equipo que avanza por penales).'
                : `Estás viendo la simulación de eliminación de ${activeParticipantName} (Modo Lectura).`
              }
            </p>
          </div>

          {/* Interactive Zoom Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            maxWidth: '360px',
            margin: '0 auto 1.5rem auto',
            boxShadow: 'var(--card-shadow)',
            userSelect: 'none'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>🔍 Zoom:</span>
            <button 
              onClick={() => setBracketZoom(z => Math.max(0.4, Number((z - 0.05).toFixed(2))))} 
              className={styles.buttonSecondary} 
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minWidth: '30px', border: '1px solid var(--border-color)' }}
              title="Disminuir Zoom"
            >
              ➖
            </button>
            <span style={{ fontWeight: 700, minWidth: '40px', textAlign: 'center', fontSize: '0.85rem', color: '#ffffff' }}>
              {Math.round(bracketZoom * 100)}%
            </span>
            <button 
              onClick={() => setBracketZoom(z => Math.min(1.2, Number((z + 0.05).toFixed(2))))} 
              className={styles.buttonSecondary} 
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minWidth: '30px', border: '1px solid var(--border-color)' }}
              title="Aumentar Zoom"
            >
              ➕
            </button>
            <button 
              onClick={() => setBracketZoom(0.7)} 
              className={styles.buttonSecondary} 
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}
              title="Ajustar al tamaño recomendado"
            >
              Ajustar (70%)
            </button>
            <button 
              onClick={() => setBracketZoom(1.0)} 
              className={styles.buttonSecondary} 
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}
              title="Restaurar a escala normal"
            >
              100%
            </button>
          </div>

          <div className={styles.bracketWrapper}>
            <div className={styles.splitBracket} style={{ zoom: bracketZoom }}>
              
              {/* LEFT WING (R32 -> R16 -> QF -> SF) */}
              <div className={styles.bracketWing}>
                {/* ROUND OF 32 - LEFT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>R32 (Izquierda)</div>
                  {r32Matches.slice(0, 8).map(renderKnockoutMatch)}
                </div>

                {/* ROUND OF 16 - LEFT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Octavos (Izquierda)</div>
                  {r16Matches.slice(0, 4).map(renderKnockoutMatch)}
                </div>

                {/* QUARTER FINALS - LEFT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Cuartos (Izquierda)</div>
                  {qfMatches.slice(0, 2).map(renderKnockoutMatch)}
                </div>

                {/* SEMI FINALS - LEFT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Semifinal (Izquierda)</div>
                  {sfMatches.slice(0, 1).map(renderKnockoutMatch)}
                </div>
              </div>

              {/* CENTER COLUMN (FINAL / CHAMPION) */}
              <div className={styles.centerColumn}>
                <div className={styles.round} style={{ justifyContent: 'center', gap: '2rem' }}>
                  <div className={styles.roundName}>Gran Final (F)</div>
                  {renderKnockoutMatch(finalMatch)}
                </div>
              </div>

              {/* RIGHT WING (SF -> QF -> R16 -> R32) */}
              <div className={styles.bracketWing}>
                {/* SEMI FINALS - RIGHT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Semifinal (Derecha)</div>
                  {sfMatches.slice(1, 2).map(renderKnockoutMatch)}
                </div>

                {/* QUARTER FINALS - RIGHT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Cuartos (Derecha)</div>
                  {qfMatches.slice(2, 4).map(renderKnockoutMatch)}
                </div>

                {/* ROUND OF 16 - RIGHT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>Octavos (Derecha)</div>
                  {r16Matches.slice(4, 8).map(renderKnockoutMatch)}
                </div>

                {/* ROUND OF 32 - RIGHT */}
                <div className={styles.round}>
                  <div className={styles.roundName}>R32 (Derecha)</div>
                  {r32Matches.slice(8, 16).map(renderKnockoutMatch)}
                </div>
              </div>

            </div>
          </div>

          {/* Champion Display */}
          {champion && (
            <div className={styles.championCard}>
              <h4>Campeón Predicho por {activeParticipantName}</h4>
              <div className={styles.championName}>
                {(TEAMS[champion] || {}).flag} {champion}
              </div>
              <div className={styles.championSub}>
                {isEditingOwn 
                  ? '¡Felicitaciones! Has completado tu simulación del Mundial 2026. Recuerda guardar tus cambios.'
                  : `Esta es la predicción del campeón de ${activeParticipantName}.`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Leaderboard Table */}
      {activeTab === 'leaderboard' && (
        <div className="animate-slide-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#ffffff' }}>Tabla de Participantes (Top 20)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Aquí puedes ver a los 20 mejores participantes de la quiniela ordenados por su puntaje acumulado.
              Se otorgan <strong>+3 puntos</strong> por acertar el marcador exacto y <strong>+1 punto</strong> por acertar el ganador o empate.
              Haz clic en cualquier fila para inspeccionar la quiniela de ese participante en detalle.
            </p>
          </div>

          {leaderboardLoading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Cargando tabla de posiciones...</p>
          ) : (
            <div className={styles.groupTableWrapper} style={{ boxShadow: 'var(--card-shadow)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.pos} style={{ width: '60px' }}>Puesto</th>
                    <th>Participante</th>
                    <th className={styles.numCol}>Puntos</th>
                    <th className={styles.numCol}>Marcador Exacto (+3)</th>
                    <th className={styles.numCol}>Resultado (+1)</th>
                    <th className={styles.numCol}>Errados</th>
                    <th className={styles.numCol}>Predicciones Guardadas</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => {
                    const isCurrentUser = currentUser && row.participantId === currentUser.id;
                    const isTop3 = index < 3;
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    
                    return (
                      <tr 
                        key={row.participantId}
                        style={{ 
                          background: isCurrentUser ? 'rgba(16, 185, 129, 0.1)' : 'inherit',
                          borderLeft: isCurrentUser ? '4px solid var(--primary)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedParticipantId(row.participantId);
                          setActiveTab('groups');
                        }}
                        title="Hacer clic para ver predicciones detalladas de este usuario"
                      >
                        <td className={styles.pos} style={{ fontWeight: 700, color: isTop3 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                          {medal ? medal : index + 1}
                        </td>
                        <td style={{ fontWeight: isCurrentUser ? 700 : 500 }}>
                          👤 {row.name} {isCurrentUser ? ' (Tú)' : ''} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👁️ Ver</span>
                        </td>
                        <td className={styles.numCol} style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>
                          {row.points} PTS
                        </td>
                        <td className={styles.numCol}>{row.exactCount}</td>
                        <td className={styles.numCol}>{row.outcomeCount}</td>
                        <td className={styles.numCol}>{row.wrongCount}</td>
                        <td className={styles.numCol}>{row.totalPredictions} / 72</td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No hay participantes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Admin Results Board */}
      {activeTab === 'admin' && (
        <div className="animate-slide-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#ffffff' }}>Panel de Marcadores Oficiales</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Como administrador, puedes actualizar los marcadores reales de los partidos jugados.
              Al hacer clic en <strong>"Actualizar"</strong>, el marcador se almacenará en la base de datos de Railway y los puntos de todos los participantes se recalcularán automáticamente en tiempo real.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>¿Horarios desactualizados? Sincroniza con la API oficial del Mundial.</span>
              <button 
                onClick={handleSyncSchedule} 
                className={styles.buttonSecondary}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                🔄 Sincronizar Horarios y Resultados
              </button>
            </div>
          </div>

          {/* Admin sub-tab toggler */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setAdminSubTab('groups')}
              style={{
                background: adminSubTab === 'groups' ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Fase de Grupos
            </button>
            <button 
              onClick={() => setAdminSubTab('knockout')}
              style={{
                background: adminSubTab === 'knockout' ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Fase de Eliminatorias
            </button>
          </div>

          {adminSubTab === 'groups' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matches.map(match => {
                const homeTeamData = TEAMS[match.homeTeam] || { flag: '' };
                const awayTeamData = TEAMS[match.awayTeam] || { flag: '' };

                return (
                  <AdminMatchRow 
                    key={match.id}
                    match={match}
                    homeTeamData={homeTeamData}
                    awayTeamData={awayTeamData}
                    onUpdateScore={handleAdminScoreChange}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {koMatchIdsOrder.map(matchId => {
                const match = actualKoMatches[matchId];
                if (!match) return null;
                const savedResult = knockoutResults[matchId];

                return (
                  <AdminKnockoutRow 
                    key={matchId}
                    matchId={matchId}
                    match={match}
                    savedResult={savedResult}
                    onUpdateResult={handleAdminKnockoutScoreUpdate}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Rules View */}
      {activeTab === 'rules' && (
        <div className={`${styles.rulesContainer} animate-slide-up`}>
          <div className={styles.rulesCard}>
            <h3>Reglas de Puntuación</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Los participantes ingresan sus predicciones para todos los partidos de la fase de grupos. A medida que los partidos se juegan y se actualiza el marcador oficial, el sistema calcula automáticamente el puntaje acumulado siguiendo este criterio:
            </p>

            <ul className={styles.rulesList}>
              <li className={styles.ruleItem}>
                <div className={styles.ruleBadge}>+3</div>
                <div className={styles.ruleText}>
                  <h4>Marcador Exacto</h4>
                  <p>Acertar el resultado y la cantidad exacta de goles de ambos equipos. Ejemplo: Predicción 2-0, Resultado Oficial 2-0.</p>
                </div>
              </li>
              <li className={styles.ruleItem}>
                <div className={`${styles.ruleBadge} ${styles.ruleBadgeAccent}`}>+1</div>
                <div className={styles.ruleText}>
                  <h4>Diferencia o Ganador (Resultado Parcial)</h4>
                  <p>Acertar el equipo ganador (o el empate) pero no la cantidad exacta de goles. Ejemplo: Predicción 3-1, Resultado Oficial 1-0 (acertó que ganaba el local).</p>
                </div>
              </li>
              <li className={styles.ruleItem}>
                <div className={`${styles.ruleBadge} ${styles.ruleBadgeDanger}`}>0</div>
                <div className={styles.ruleText}>
                  <h4>Predicción Errada</h4>
                  <p>No acertar el ganador ni el empate. Ejemplo: Predicción 1-1, Resultado Oficial 0-2 (el visitante ganó y habías predicho empate).</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Soccer News Section */}
      <section style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }} className="animate-slide-up">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff 40%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📰 Noticias del Mundial 2026
        </h2>
        {newsLoading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Cargando noticias...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {news.map((item, idx) => (
              <div 
                key={idx} 
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--card-shadow)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => window.open(item.link, '_blank')}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ width: '100%', height: '180px', overflow: 'hidden', position: 'relative' }}>
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300' viewBox='0 0 600 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23112d45'/%3E%3Cstop offset='100%25' stop-color='%23060b13'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='300' fill='url(%23grad)'/%3E%3Crect x='20' y='20' width='560' height='260' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3Cline x1='300' y1='20' x2='300' y2='280' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3Ccircle cx='300' cy='150' r='50' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3Ccircle cx='300' cy='150' r='5' fill='rgba(255,255,255,0.4)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%2310b981' font-family='system-ui, sans-serif' font-size='24' font-weight='800' letter-spacing='2px'%3E⚽ FIFA WORLD CUP 2026%3C/text%3E%3Ctext x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' fill='rgba(255,255,255,0.4)' font-family='system-ui, sans-serif' font-size='12' font-weight='600'%3ERESEÑA Y PREVIA%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {(() => {
                      try {
                        return new Date(item.pubDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                      } catch (e) {}
                      return item.pubDate;
                    })()}
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineBreak: 'loose', lineHeight: 1.3 }}>{item.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineBreak: 'loose', lineHeight: 1.4 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
}

// Inner helper component for admin matches list
interface AdminMatchRowProps {
  match: Match;
  homeTeamData: any;
  awayTeamData: any;
  onUpdateScore: (matchId: number, homeVal: string, awayVal: string, status: 'PLAYED' | 'UPCOMING') => Promise<void>;
}

function AdminMatchRow({ match, homeTeamData, awayTeamData, onUpdateScore }: AdminMatchRowProps) {
  const [homeInput, setHomeInput] = useState<string>(match.homeScore !== null ? match.homeScore.toString() : '');
  const [awayInput, setAwayInput] = useState<string>(match.awayScore !== null ? match.awayScore.toString() : '');
  const [isPlayed, setIsPlayed] = useState<boolean>(match.status === 'PLAYED');
  const [saving, setSaving] = useState<boolean>(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateScore(
      match.id,
      homeInput,
      awayInput,
      isPlayed ? 'PLAYED' : 'UPCOMING'
    );
    setSaving(false);
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'stretch'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Grupo {match.groupName} - Partido ID {match.id} - 📅 {match.matchDate}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={isPlayed}
            onChange={(e) => setIsPlayed(e.target.checked)}
            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
          />
          ¿Partido ya Jugado?
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: '100px' }}>
          <span style={{ fontSize: '1.2rem' }}>{homeTeamData.flag}</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{match.homeTeam}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min="0"
            value={homeInput}
            onChange={(e) => setHomeInput(e.target.value)}
            disabled={!isPlayed}
            style={{
              width: '45px',
              height: '35px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>-</span>
          <input
            type="number"
            min="0"
            value={awayInput}
            onChange={(e) => setAwayInput(e.target.value)}
            disabled={!isPlayed}
            style={{
              width: '45px',
              height: '35px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, justifyContent: 'flex-end', minWidth: '100px' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{match.awayTeam}</span>
          <span style={{ fontSize: '1.2rem' }}>{awayTeamData.flag}</span>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {saving ? '...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
}

// Inner helper component for admin knockout matches list
interface AdminKnockoutRowProps {
  matchId: string;
  match: KnockoutMatch;
  savedResult?: { winnerTeam: string; homeScore: number | ''; awayScore: number | '' };
  onUpdateResult: (matchId: string, homeVal: string, awayVal: string, winnerTeam: string) => Promise<void>;
}

function AdminKnockoutRow({ matchId, match, savedResult, onUpdateResult }: AdminKnockoutRowProps) {
  const [homeInput, setHomeInput] = useState<string>(savedResult && savedResult.homeScore !== null && savedResult.homeScore !== undefined ? savedResult.homeScore.toString() : '');
  const [awayInput, setAwayInput] = useState<string>(savedResult && savedResult.awayScore !== null && savedResult.awayScore !== undefined ? savedResult.awayScore.toString() : '');
  const [winnerTeam, setWinnerTeam] = useState<string>(savedResult ? savedResult.winnerTeam : '');
  const [saving, setSaving] = useState<boolean>(false);

  // Sync inputs if savedResult changes
  useEffect(() => {
    if (savedResult) {
      setHomeInput(savedResult.homeScore !== null && savedResult.homeScore !== undefined ? savedResult.homeScore.toString() : '');
      setAwayInput(savedResult.awayScore !== null && savedResult.awayScore !== undefined ? savedResult.awayScore.toString() : '');
      setWinnerTeam(savedResult.winnerTeam || '');
    } else {
      setHomeInput('');
      setAwayInput('');
      setWinnerTeam('');
    }
  }, [savedResult]);

  // Auto set winner if score changes
  const handleScoreChange = (isHome: boolean, val: string) => {
    const parsedVal = val === '' ? '' : parseInt(val, 10);
    if (parsedVal !== '' && isNaN(parsedVal)) return;

    const newHome = isHome ? val : homeInput;
    const newAway = isHome ? homeInput : val;

    if (isHome) setHomeInput(val);
    else setAwayInput(val);

    if (newHome !== '' && newAway !== '') {
      const hInt = parseInt(newHome, 10);
      const aInt = parseInt(newAway, 10);
      if (hInt > aInt) {
        setWinnerTeam(match.team1);
      } else if (aInt > hInt) {
        setWinnerTeam(match.team2);
      }
    } else {
      setWinnerTeam('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdateResult(matchId, homeInput, awayInput, winnerTeam);
    setSaving(false);
  };

  const t1Exists = !match.team1.startsWith('Ganador') && !match.team1.startsWith('2do') && !match.team1.startsWith('3ro') && !match.team1.startsWith('Finalista');
  const t2Exists = !match.team2.startsWith('Ganador') && !match.team2.startsWith('2do') && !match.team2.startsWith('3ro') && !match.team2.startsWith('Finalista');

  const roundNamesMap: Record<string, string> = {
    'R32': 'Dieciseisavos de Final',
    'R16': 'Octavos de Final',
    'QF': 'Cuartos de Final',
    'SF': 'Semifinal',
    'F': 'Gran Final'
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'stretch'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {roundNamesMap[match.roundName] || match.roundName} - Partido {matchId}
        </span>
        {winnerTeam && (
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
            👑 Avanza: {winnerTeam}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div 
          onClick={() => t1Exists && t2Exists && setWinnerTeam(match.team1)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            flexGrow: 1, 
            minWidth: '150px',
            cursor: (t1Exists && t2Exists) ? 'pointer' : 'default',
            padding: '0.4rem',
            borderRadius: '6px',
            background: winnerTeam === match.team1 ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            border: winnerTeam === match.team1 ? '1px solid var(--primary)' : '1px solid transparent'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{(TEAMS[match.team1] || {}).flag}</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: t1Exists ? '#ffffff' : 'var(--text-muted)' }}>
            {match.team1}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min="0"
            value={homeInput}
            onChange={(e) => handleScoreChange(true, e.target.value)}
            disabled={!t1Exists || !t2Exists}
            style={{
              width: '45px',
              height: '35px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>-</span>
          <input
            type="number"
            min="0"
            value={awayInput}
            onChange={(e) => handleScoreChange(false, e.target.value)}
            disabled={!t1Exists || !t2Exists}
            style={{
              width: '45px',
              height: '35px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          />
        </div>

        <div 
          onClick={() => t1Exists && t2Exists && setWinnerTeam(match.team2)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            flexGrow: 1, 
            justifyContent: 'flex-end',
            minWidth: '150px',
            cursor: (t1Exists && t2Exists) ? 'pointer' : 'default',
            padding: '0.4rem',
            borderRadius: '6px',
            background: winnerTeam === match.team2 ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            border: winnerTeam === match.team2 ? '1px solid var(--primary)' : '1px solid transparent'
          }}
        >
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: t2Exists ? '#ffffff' : 'var(--text-muted)', textAlign: 'right' }}>
            {match.team2}
          </span>
          <span style={{ fontSize: '1.2rem' }}>{(TEAMS[match.team2] || {}).flag}</span>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || !t1Exists || !t2Exists || !winnerTeam}
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: (!t1Exists || !t2Exists || !winnerTeam) ? 0.5 : 1
          }}
        >
          {saving ? '...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
}
