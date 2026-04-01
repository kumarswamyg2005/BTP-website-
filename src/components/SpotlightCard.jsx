import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

export default function SpotlightCard({ children, className = '', onClick, style = {} }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const spotlightBg = useMotionTemplate`radial-gradient(
    500px circle at ${mouseX}px ${mouseY}px,
    rgba(79, 142, 247, 0.13),
    transparent 70%
  )`;

  return (
    <motion.div
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
      style={{ position: 'relative', ...style }}
    >
      {/* Spotlight overlay — on top so it shows through card content */}
      <motion.div
        style={{
          background: spotlightBg,
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 3,
          mixBlendMode: 'screen',
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
      />
      {/* Content — no background here; background comes from className CSS */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </motion.div>
  );
}
