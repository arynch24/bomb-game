
import { motion } from 'framer-motion';

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

export default BombTimer;