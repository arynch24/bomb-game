import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/app/types/players';

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

export default GameOverScreen;