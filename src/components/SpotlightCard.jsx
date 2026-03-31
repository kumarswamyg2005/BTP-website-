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

  return (
    <motion.div
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover="hover"
      initial="initial"
      variants={{
        initial: { scale: 1, y: 0 },
        hover: { scale: 1.02, y: -4 }
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        position: 'relative',
        ...style
      }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(79, 142, 247, 0.15),
              transparent 80%
            )
          `,
          zIndex: 1,
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none'
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />
      <div style={{
        position: 'relative',
        zIndex: 2,
        height: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'inherit',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </motion.div>
  );
}
