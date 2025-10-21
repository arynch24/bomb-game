import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Player, GameState, Position } from './types';

const app = express();
const httpServer = createServer(app);

// Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Configuration
const CONFIG = {
  ARENA_WIDTH: 800,
  ARENA_HEIGHT: 600,
  PLAYER_SIZE: 40,
  BOMB_INITIAL_TIME: 15,
  TRANSFER_RADIUS: 50,
  MATCHING_TIME: 30,
  GAME_OVER_TIME: 10,

};

// Game State (in-memory)
const gameState: GameState = {
  phase: 'WAITING',
  players: new Map(),
  bomb: {
    holderId: null,
    timeRemaining: CONFIG.BOMB_INITIAL_TIME
  },
  matchingTimer: 10, // 30 seconds to wait for players
  gameOverTimer: 3  // 10 seconds before restart
};

// Player colors
const PLAYER_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
let colorIndex = 0;

// Helper: Generate random spawn position
function getRandomSpawn(): Position {
  return {
    x: Math.random() * (CONFIG.ARENA_WIDTH - CONFIG.PLAYER_SIZE),
    y: Math.random() * (CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_SIZE)
  };
}

// Helper: Clamp position to boundaries
function clampPosition(x: number, y: number): Position {
  return {
    x: Math.max(0, Math.min(x, CONFIG.ARENA_WIDTH - CONFIG.PLAYER_SIZE)),
    y: Math.max(0, Math.min(y, CONFIG.ARENA_HEIGHT - CONFIG.PLAYER_SIZE))
  };
}

// ADD: Function to start matching phase
function startMatchingPhase() {
  if (gameState.phase !== 'WAITING') return;

  gameState.phase = 'MATCHING';
  gameState.matchingTimer = CONFIG.MATCHING_TIME;

  console.log('🔄 Matching phase started! Game starts in 30s...');
  io.emit('phaseChange', {
    phase: 'MATCHING',
    timer: gameState.matchingTimer
  });
}

// ADD: Function to start game
function startGame() {
  gameState.phase = 'PLAYING';

  // Give bomb to random player
  const alivePlayers = Array.from(gameState.players.values()).filter(p => p.isAlive);
  if (alivePlayers.length > 0) {
    const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    gameState.bomb.holderId = randomPlayer.id;
    gameState.bomb.timeRemaining = CONFIG.BOMB_INITIAL_TIME;

    console.log(`🎮 Game started! ${randomPlayer.name} has the bomb!`);
  }

  io.emit('phaseChange', {
    phase: 'PLAYING'
  });
}

// ADD: Function to end game
function endGame(winner: Player | null) {
  gameState.phase = 'GAME_OVER';
  gameState.gameOverTimer = CONFIG.GAME_OVER_TIME;

  console.log(`🏆 Game Over! Winner: ${winner?.name || 'None'}`);

  io.emit('gameOver', {
    winner: winner,
    restartIn: gameState.gameOverTimer
  });
}

// ADD: Function to reset game
function resetGame() {
  console.log('🔄 Resetting game...');

  // Reset all players to alive
  gameState.players.forEach(player => {
    player.isAlive = true;
    // Reset positions
    const spawn = getRandomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
  });

  gameState.phase = 'WAITING';
  gameState.bomb.holderId = null;
  gameState.bomb.timeRemaining = CONFIG.BOMB_INITIAL_TIME;

  // If players still connected, start matching again
  if (gameState.players.size > 0) {
    startMatchingPhase();
  }
}


// Helper: Calculate distance
function getDistance(p1: Position, p2: Position): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 🎮 SOCKET CONNECTION
io.on('connection', (socket) => {
  console.log('🎮 Player connected:', socket.id);

  // TASK 1: Handle player joining
  socket.on('joinGame', (playerName: string) => {
    console.log(`📥 ${playerName} wants to join (Phase: ${gameState.phase})`);

    // Create player
    const spawn = getRandomSpawn();
    const newPlayer: Player = {
      id: socket.id,
      name: playerName || `Player${gameState.players.size + 1}`,
      x: spawn.x,
      y: spawn.y,
      color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
      isAlive: true
    };
    colorIndex++;

    // Add to game state
    gameState.players.set(socket.id, newPlayer);

    // Send current game state to new player
    socket.emit('initialState', {
      myId: socket.id,
      players: Array.from(gameState.players.values()),
      bomb: gameState.bomb,
      phase: gameState.phase,
      matchingTimer: gameState.matchingTimer,
      gameOverTimer: gameState.gameOverTimer
    });

    // Tell others a new player joined
    socket.broadcast.emit('playerJoined', newPlayer);

    // Start matching if this is the first player and we're waiting
    if (gameState.players.size === 1 && gameState.phase === 'WAITING') {
      startMatchingPhase();
    }

    console.log(`✅ ${newPlayer.name} joined! Total players: ${gameState.players.size}`);
  });

  // TASK 2: Handle player movement
  socket.on('playerMove', (position: Position) => {

    // Only allow movement during PLAYING phase
    if (gameState.phase !== 'PLAYING') return;

    const player = gameState.players.get(socket.id);
    if (!player || !player.isAlive) return;

    // TODO: Validate and clamp position
    const clamped = clampPosition(position.x, position.y);
    player.x = clamped.x;
    player.y = clamped.y;

    // TODO: Check collision with other players (only if this player has bomb)
    if (gameState.bomb.holderId === socket.id) {
      for (const [otherId, otherPlayer] of gameState.players) {
        if (otherId === socket.id || !otherPlayer.isAlive) continue;

        const distance = getDistance(player, otherPlayer);

        if (distance < CONFIG.TRANSFER_RADIUS) {
          // Transfer bomb!
          gameState.bomb.holderId = otherId;
          console.log(`💣 Bomb transferred: ${player.name} → ${otherPlayer.name}`);

          // Notify all clients about transfer
          io.emit('bombTransferred', {
            from: socket.id,
            to: otherId,
            fromName: player.name,
            toName: otherPlayer.name
          });
          break;
        }
      }
    }

    // TODO: Broadcast position to others (not back to sender)
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: clamped.x,
      y: clamped.y
    });
  });

  // TASK 3: Handle disconnect
  socket.on('disconnect', () => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    console.log(`👋 ${player.name} disconnected`);

    const hadBomb = gameState.bomb.holderId === socket.id;

    // Remove player
    gameState.players.delete(socket.id);

    // If no players left, reset to WAITING
    if (gameState.players.size === 0) {
      gameState.phase = 'WAITING';
      gameState.bomb.holderId = null;
      console.log('🔄 No players left, returning to WAITING phase');
    }
    // If in PLAYING and player had bomb, transfer it
    else if (hadBomb && gameState.phase === 'PLAYING') {
      const alivePlayers = Array.from(gameState.players.values())
        .filter(p => p.isAlive);

      if (alivePlayers.length > 0) {
        const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        gameState.bomb.holderId = randomPlayer.id;
      }
    }

    io.emit('playerLeft', socket.id);
  });

});

// 🔥 MAIN GAME LOOP
setInterval(() => {

  if (gameState.phase === 'MATCHING') {
    // Countdown until game starts
    gameState.matchingTimer -= 0.1;

    if (gameState.matchingTimer <= 0) {
      startGame();
    }

    // Broadcast matching timer
    io.emit('matchingUpdate', {
      timer: Math.max(0, gameState.matchingTimer),
      playerCount: gameState.players.size
    });
  }

  else if (gameState.phase === 'PLAYING') {
    // Original bomb timer logic
    if (!gameState.bomb.holderId) return;

    gameState.bomb.timeRemaining -= 0.1;

    if (gameState.bomb.timeRemaining <= 0) {
      const victim = gameState.players.get(gameState.bomb.holderId);

      if (victim) {
        console.log(`💥 BOOM! ${victim.name} eliminated!`);
        victim.isAlive = false;

        const alivePlayers = Array.from(gameState.players.values())
          .filter(p => p.isAlive);

        io.emit('bombExploded', {
          victimId: victim.id,
          victimName: victim.name
        });

        if (alivePlayers.length === 1) {
          // We have a winner!
          endGame(alivePlayers[0]);
        } else if (alivePlayers.length > 1) {
          // Continue with new bomb holder
          const nextHolder = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          gameState.bomb.holderId = nextHolder.id;
          gameState.bomb.timeRemaining = CONFIG.BOMB_INITIAL_TIME;
        } else {
          // No players left? End game
          endGame(null);
        }
      }
    }

    // Broadcast game state
    io.emit('gameState', {
      players: Array.from(gameState.players.values()),
      bomb: gameState.bomb
    });
  }

  else if (gameState.phase === 'GAME_OVER') {
    // Countdown until restart
    gameState.gameOverTimer -= 0.1;

    if (gameState.gameOverTimer <= 0) {
      resetGame();
    }

    io.emit('gameOverUpdate', {
      timer: Math.max(0, gameState.gameOverTimer)
    });
  }

}, 100); // 10 times per second

// Start server
const PORT = 8000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});