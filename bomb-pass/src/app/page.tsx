'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import GameOverScreen from '@/components/GameOverScreen';
import Players from '@/components/Player';
import BombTimer from '@/components/BombTimer';
import MatchingScreen from '@/components/MatchingScreen';
import Notification from '@/components/NotificationProps';
import Explosion from '@/components/Explosion';
import { CONFIG } from '@/utils/config';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  isAlive: boolean;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
}

interface BombState {
  holderId: string | null;
  timeRemaining: number;
}


interface KeysPressed {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
}

type GamePhase = 'WAITING' | 'MATCHING' | 'PLAYING' | 'GAME_OVER';

// Main Game Component
export default function BombGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [gamePhase, setGamePhase] = useState<GamePhase>('WAITING');
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [bombState, setBombState] = useState<BombState>({
    holderId: null,
    timeRemaining: 15,
  });
  const [matchingTimer, setMatchingTimer] = useState<number>(30);
  const [gameOverTimer, setGameOverTimer] = useState<number>(10);
  const [winner, setWinner] = useState<Player | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'danger' | 'success' } | null>(null);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  const [keysPressed, setKeysPressed] = useState<KeysPressed>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  const myPlayerRef = useRef<Player | null>(null);

  // Show notification helper
  const showNotification = (message: string, type: 'info' | 'danger' | 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Connect to Socket.IO server
  useEffect(() => {
    const newSocket = io(CONFIG.SERVER_URL);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server!', newSocket.id);
      setIsConnected(true);
      setMyPlayerId(newSocket.id || '');

      // Join the game
      const playerName = `P${Math.floor(Math.random() * 1000)}`;
      newSocket.emit('joinGame', playerName);
      showNotification(`Connected as ${playerName}`, 'success');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
      showNotification('Disconnected from server', 'danger');
    });

    // Receive initial game state
    newSocket.on('initialState', (data: {
      myId: string;
      players: Player[];
      bomb: BombState;
      phase: GamePhase;
      matchingTimer: number;
      gameOverTimer: number;
    }) => {
      console.log('📥 Received initial state:', data);

      const playersMap = new Map<string, Player>();
      data.players.forEach(p => playersMap.set(p.id, p));
      setPlayers(playersMap);
      setBombState(data.bomb);
      setGamePhase(data.phase);
      setMatchingTimer(data.matchingTimer);
      setGameOverTimer(data.gameOverTimer);

      const me = playersMap.get(data.myId);
      if (me) myPlayerRef.current = me;
    });

    // Phase changes
    newSocket.on('phaseChange', (data: { phase: GamePhase; timer?: number }) => {
      console.log('🔄 Phase changed:', data.phase);
      setGamePhase(data.phase);

      if (data.phase === 'MATCHING' && data.timer) {
        setMatchingTimer(data.timer);
        showNotification('Game starting soon!', 'info');
      } else if (data.phase === 'PLAYING') {
        showNotification('Game started! 💣', 'success');
      }
    });

    // Matching updates
    newSocket.on('matchingUpdate', (data: { timer: number; playerCount: number }) => {
      setMatchingTimer(data.timer);
    });

    // Game state updates
    newSocket.on('gameState', (data: { players: Player[]; bomb: BombState }) => {
      const playersMap = new Map<string, Player>();
      data.players.forEach(p => playersMap.set(p.id, p));
      setPlayers(playersMap);
      setBombState(data.bomb);

      const me = playersMap.get(newSocket.id || '');
      if (me) myPlayerRef.current = me;
    });

    // New players joining
    newSocket.on('playerJoined', (newPlayer: Player) => {
      console.log('👋 New player joined:', newPlayer.name);
      showNotification(`${newPlayer.name} joined!`, 'info');
      setPlayers(prev => new Map(prev).set(newPlayer.id, newPlayer));
    });

    // Players leaving
    newSocket.on('playerLeft', (playerId: string) => {
      setPlayers(prev => {
        const updated = new Map(prev);
        const player = updated.get(playerId);
        if (player) {
          console.log('👋 Player left:', player.name);
          showNotification(`${player.name} left`, 'info');
        }
        updated.delete(playerId);
        return updated;
      });
    });

    // Player movements
    newSocket.on('playerMoved', (data: { id: string; x: number; y: number }) => {
      setPlayers(prev => {
        const updated = new Map(prev);
        const player = updated.get(data.id);
        if (player) {
          player.x = data.x;
          player.y = data.y;
        }
        return new Map(updated);
      });
    });

    // Bomb transfers
    newSocket.on('bombTransferred', (data: { from: string; to: string; fromName: string; toName: string }) => {
      console.log(`💣 Bomb: ${data.fromName} → ${data.toName}`);
      showNotification(`💣 ${data.fromName} → ${data.toName}`, 'danger');
    });

    // Explosions
    newSocket.on('bombExploded', (data: { victimId: string; victimName: string }) => {
      console.log(`💥 ${data.victimName} eliminated!`);
      showNotification(`💥 ${data.victimName} eliminated!`, 'danger');

      // Add explosion animation at victim's position
      const victim = players.get(data.victimId);
      if (victim) {
        const explosionId = `${data.victimId}-${Date.now()}`;
        setExplosions(prev => [...prev, { id: explosionId, x: victim.x, y: victim.y }]);

        // Remove explosion after animation
        setTimeout(() => {
          setExplosions(prev => prev.filter(e => e.id !== explosionId));
        }, 600);
      }
    });

    // Game over
    newSocket.on('gameOver', (data: { winner: Player | null; restartIn: number }) => {
      console.log(`🏆 Game Over!`, data.winner);
      setGamePhase('GAME_OVER');
      setWinner(data.winner);
      setGameOverTimer(data.restartIn);
    });

    // Game over updates
    newSocket.on('gameOverUpdate', (data: { timer: number }) => {
      setGameOverTimer(data.timer);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setKeysPressed(prev => ({ ...prev, [e.key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setKeysPressed(prev => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Send movement to server (only during PLAYING phase)
  useEffect(() => {
    if (!socket || !myPlayerRef.current || !isConnected || gamePhase !== 'PLAYING') return;

    const interval = setInterval(() => {
      const me = myPlayerRef.current;
      if (!me || !me.isAlive) return;

      let newX = me.x;
      let newY = me.y;
      let moved = false;

      if (keysPressed.ArrowUp) {
        newY -= CONFIG.MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.ArrowDown) {
        newY += CONFIG.MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.ArrowLeft) {
        newX -= CONFIG.MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.ArrowRight) {
        newX += CONFIG.MOVE_SPEED;
        moved = true;
      }

      if (moved) {
        // Update locally for instant feedback
        me.x = newX;
        me.y = newY;
        setPlayers(prev => new Map(prev).set(me.id, { ...me }));

        // Send to server
        socket.emit('playerMove', { x: newX, y: newY });
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [socket, keysPressed, isConnected, gamePhase]);

  const allPlayers = Array.from(players.values());
  const myPlayer = players.get(myPlayerId);
  const bombHolder = bombState.holderId ? players.get(bombState.holderId) : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1f2937',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px', fontSize: '32px' }}>
        💣 Bomb Passing Game
      </h1>

      <div style={{
        position: 'relative',
        width: CONFIG.ARENA_WIDTH,
        height: CONFIG.ARENA_HEIGHT,
        backgroundColor: '#374151',
        border: '4px solid #4b5563',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <Notification message={notification.message} type={notification.type} />
          )}
        </AnimatePresence>

        {/* Matching Screen */}
        {gamePhase === 'MATCHING' && (
          <MatchingScreen
            timer={matchingTimer}
            playerCount={allPlayers.length}
            players={allPlayers}
          />
        )}

        {/* Game Over Screen */}
        {gamePhase === 'GAME_OVER' && (
          <GameOverScreen
            winner={winner}
            restartTimer={gameOverTimer}
          />
        )}

        {/* Spectator Mode Indicator */}
        {gamePhase === 'PLAYING' && myPlayer && !myPlayer.isAlive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#ef4444',
              padding: '20px 40px',
              borderRadius: '12px',
              fontSize: '28px',
              fontWeight: 'bold',
              border: '3px solid #ef4444',
              zIndex: 50,
              textAlign: 'center'
            }}
          >
            💀 You've been eliminated!<br />
            <span style={{ fontSize: '18px', color: '#9ca3af' }}>
              Spectating...
            </span>
          </motion.div>
        )}

        {/* Bomb Timer (only during playing) */}
        {gamePhase === 'PLAYING' && bombHolder && (
          <BombTimer
            timeRemaining={bombState.timeRemaining}
            bombHolderName={bombHolder.name}
          />
        )}

        {/* Render only alive players */}
        {allPlayers.filter(p => p.isAlive).map(player => (
          <Players
            key={player.id}
            player={player}
            hasBomb={bombState.holderId === player.id}
            isMe={player.id === myPlayerId}
          />
        ))}

        {/* Render explosions */}
        <AnimatePresence>
          {explosions.map(explosion => (
            <Explosion key={explosion.id} x={explosion.x} y={explosion.y} />
          ))}
        </AnimatePresence>
      </div>

      <div style={{
        marginTop: '20px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '16px', marginBottom: '10px' }}>
          {gamePhase === 'PLAYING'
            ? '🎮 Use Arrow Keys to Move | Get close to pass the bomb!'
            : gamePhase === 'MATCHING'
              ? '⏳ Waiting for game to start...'
              : '🔄 Waiting for players...'}
        </p>
        <p style={{ fontSize: '14px' }}>
          Connected: {isConnected ? '✅' : '❌'} |
          Phase: <strong>{gamePhase}</strong> |
          Players: {allPlayers.length} |
          Alive: <strong style={{ color: '#10b981' }}>{allPlayers.filter(p => p.isAlive).length}</strong> |
          Eliminated: <strong style={{ color: '#ef4444' }}>{allPlayers.filter(p => !p.isAlive).length}</strong> |
          You: <strong style={{ color: myPlayer?.isAlive ? '#3b82f6' : '#ef4444' }}>
            {myPlayer?.name || 'Loading...'} {!myPlayer?.isAlive && '💀'}
          </strong>
        </p>
      </div>
    </div>
  );
}