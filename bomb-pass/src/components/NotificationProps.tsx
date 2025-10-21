import React from 'react';
import { motion } from 'framer-motion';

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

export default Notification;