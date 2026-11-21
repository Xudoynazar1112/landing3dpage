import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface Tilt3DCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
}

/**
 * Reusable spring-damped 3D perspective card that tilts smoothly toward cursor
 * on pointer devices and provides tactile scale feedback on mobile touch.
 */
export function Tilt3DCard({
  children,
  className = '',
  maxTilt = 6,
  glowColor = 'rgba(116, 194, 255, 0.16)',
}: Tilt3DCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [spot, setSpot] = useState({ x: 50, y: 50, visible: false });

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 220,
    damping: 22,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 220,
    damping: 22,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mx.set(nx - 0.5);
    my.set(ny - 0.5);
    setSpot({ x: nx * 100, y: ny * 100, visible: true });
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
    setSpot((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div style={{ perspective: '950px' }} className={className}>
      <motion.div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative h-full w-full"
      >
        {children}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
          style={{
            opacity: spot.visible ? 1 : 0,
            background: `radial-gradient(circle 220px at ${spot.x}% ${spot.y}%, ${glowColor}, transparent 72%)`,
          }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  );
}
