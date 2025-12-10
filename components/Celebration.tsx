import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  velocity: { x: number; y: number };
}

// Global event bus for confetti
export const triggerConfetti = (x: number, y: number) => {
  const event = new CustomEvent('mindflow-confetti', { detail: { x, y } });
  window.dispatchEvent(event);
};

const COLORS = ['#ef4444', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];

export const Celebration = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawn = useCallback((x: number, y: number) => {
    const count = 20; // Particles per click
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 100; // random speed
      newParticles.push({
        id: Math.random().toString(36),
        x,
        y,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        }
      });
    }

    setParticles(prev => [...prev, ...newParticles]);

    // Cleanup logic handled by the animation duration, but we can purge state occasionally
    setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, []);

  useEffect(() => {
    const handler = (e: any) => spawn(e.detail.x, e.detail.y);
    window.addEventListener('mindflow-confetti', handler);
    return () => window.removeEventListener('mindflow-confetti', handler);
  }, [spawn]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
            animate={{
              x: p.x + p.velocity.x * 0.5, // 0.5s duration distance
              y: p.y + p.velocity.y * 0.5 + 100, // Add gravity (y + 100)
              scale: 0,
              rotate: Math.random() * 360
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ backgroundColor: p.color }}
            className="absolute w-3 h-3 rounded-full"
          />
        ))}
      </AnimatePresence>
    </div>
  );
};