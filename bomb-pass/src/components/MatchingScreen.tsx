import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/app/types/players';

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

export default MatchingScreen;