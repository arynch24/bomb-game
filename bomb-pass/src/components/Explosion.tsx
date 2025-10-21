import React from 'react';
import { motion } from 'framer-motion';
import { CONFIG } from '@/utils/config';

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

export default Explosion;