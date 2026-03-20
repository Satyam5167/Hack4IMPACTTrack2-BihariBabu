import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Smooth spring physics for the trailing circle
  const springConfig = { damping: 20, stiffness: 800, mass: 0.1 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };
    
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', moveCursor);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY, isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Small dot that perfectly tracks cursor */}
      <motion.div
        style={{
          position: 'fixed', left: 0, top: 0,
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: 'var(--green)',
          x: cursorX, y: cursorY,
          translateX: '-50%', translateY: '-50%',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 0 10px var(--green)'
        }}
      />
      
      {/* Larger trailing circle */}
      <motion.div
        style={{
          position: 'fixed', left: 0, top: 0,
          width: '32px', height: '32px', borderRadius: '50%',
          border: '1px solid rgba(0, 255, 135, 0.5)',
          backgroundColor: 'rgba(0, 255, 135, 0.05)',
          x: cursorXSpring, y: cursorYSpring,
          translateX: '-50%', translateY: '-50%',
          pointerEvents: 'none', zIndex: 9998,
        }}
      />
      
      {/* Add a subtle glow behind it */}
      <motion.div
        style={{
          position: 'fixed', left: 0, top: 0,
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'rgba(0, 255, 135, 0.1)',
          filter: 'blur(10px)',
          x: cursorXSpring, y: cursorYSpring,
          translateX: '-50%', translateY: '-50%',
          pointerEvents: 'none', zIndex: 9997,
        }}
      />
    </>
  );
}
