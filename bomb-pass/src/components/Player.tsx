import React from 'react';
import { motion } from 'framer-motion';
import type { Player } from '@/app/types/players';
import {CONFIG} from '@/utils/config';

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
        fontSize: '20px',
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

export default Player;