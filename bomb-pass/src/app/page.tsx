'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

// Types
interface Position {
  x: number;
  y: number;
}

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

// Game Configuration
const CONFIG = {
  ARENA_WIDTH: 800,
  ARENA_HEIGHT: 600,
  PLAYER_SIZE: 40,
  MOVE_SPEED: 8,
  SERVER_URL: 'http://localhost:8000',
} as const;

// Player Component
interface PlayerProps {
  player: Player;
  hasBomb: boolean;
  isMe: boolean;
}

function Player({ player, hasBomb, isMe }: PlayerProps) {
  return (
    <motion.div
      animate={{ x: player.x, y: player.y }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute',
        width: CONFIG.PLAYER_SIZE,
        height: CONFIG.PLAYER_SIZE,
        borderRadius: '50%',
        backgroundColor: isMe ? '#3b82f6' : player.color,
        border: hasBomb ? '4px solid #ef4444' : '2px solid #fff',
        boxShadow: hasBomb ? '0 0 20px #ef4444' : '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#fff',
        zIndex: hasBomb ? 10 : 1,
      }}
    >
      {player.name}
      {hasBomb && (
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.6,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: -15,
            right: -15,
            fontSize: '30px',
          }}
        >
          💣
        </motion.div>
      )}
    </motion.div>
  );
}

// Bomb Timer Display
interface BombTimerProps {
  timeRemaining: number;
  bombHolderName: string;
}

function BombTimer({ timeRemaining, bombHolderName }: BombTimerProps) {
  const isUrgent = timeRemaining < 5;
  
  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.5 }}
      style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isUrgent ? '#ef4444' : '#3b82f6',
        color: '#fff',
        padding: '15px 30px',
        borderRadius: '12px',
        fontSize: '24px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 100,
      }}
    >
      💣 {timeRemaining.toFixed(1)}s - {bombHolderName}
    </motion.div>
  );
}

// Notification Component
interface NotificationProps {
  message: string;
  type: 'info' | 'danger' | 'success';
}

function Notification({ message, type }: NotificationProps) {
  const bgColor = type === 'danger' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 101,
      }}
    >
      {message}
    </motion.div>
  );
}

// Explosion Component
interface ExplosionProps {
  x: number;
  y: number;
}

function Explosion({ x, y }: ExplosionProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 3, opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'absolute',
        left: x + CONFIG.PLAYER_SIZE / 2,
        top: y + CONFIG.PLAYER_SIZE / 2,
        fontSize: '60px',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      💥
    </motion.div>
  );
}

// Matching Screen
interface MatchingScreenProps {
  timer: number;
  playerCount: number;
  players: Player[];
}

function MatchingScreen({ timer, playerCount, players }: MatchingScreenProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '48px', color: '#fff', marginBottom: '20px' }}>
          🔄 Matching Players...
        </h1>
        
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{
            fontSize: '72px',
            color: '#3b82f6',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}
        >
          {Math.ceil(timer)}
        </motion.div>
        
        <p style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '30px' }}>
          Game starts in {Math.ceil(timer)} seconds
        </p>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: player.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                border: '3px solid #fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              {player.name}
            </motion.div>
          ))}
        </div>

        <p style={{ fontSize: '18px', color: '#10b981' }}>
          👥 {playerCount} {playerCount === 1 ? 'player' : 'players'} ready
        </p>
      </motion.div>
    </div>
  );
}

// Game Over Screen
interface GameOverScreenProps {
  winner: Player | null;
  restartTimer: number;
}

function GameOverScreen({ winner, restartTimer }: GameOverScreenProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        style={{ textAlign: 'center' }}
      >
        <motion.h1
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ fontSize: '96px', marginBottom: '20px' }}
        >
          🏆
        </motion.h1>
        
        {winner ? (
          <>
            <h2 style={{ fontSize: '48px', color: '#fff', marginBottom: '10px' }}>
              {winner.name} Wins!
            </h2>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: winner.color,
              margin: '20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#fff',
              border: '4px solid #fbbf24',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)'
            }}>
              {winner.name}
            </div>
          </>
        ) : (
          <h2 style={{ fontSize: '48px', color: '#fff', marginBottom: '20px' }}>
            Game Over!
          </h2>
        )}

        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ fontSize: '24px', color: '#9ca3af', marginTop: '30px' }}
        >
          Restarting in {Math.ceil(restartTimer)}s...
        </motion.p>
      </motion.div>
    </div>
  );
}

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
            💀 You've been eliminated!<br/>
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
          <Player 
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