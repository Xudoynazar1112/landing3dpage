import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ASSETS } from '../data/neurologyData';

const FLOATING_SYNAPSES = [
  { id: 's1', left: '54%', top: '18%', size: 6, delay: 0.2, dur: 5.4, gold: true },
  { id: 's2', left: '88%', top: '24%', size: 5, delay: 1.4, dur: 6.1, gold: false },
  { id: 's3', left: '46%', top: '52%', size: 5, delay: 0.8, dur: 5.0, gold: false },
  { id: 's4', left: '92%', top: '58%', size: 6, delay: 2.1, dur: 6.4, gold: true },
  { id: 's5', left: '66%', top: '76%', size: 4, delay: 1.0, dur: 4.9, gold: false },
  { id: 's6', left: '78%', top: '14%', size: 5, delay: 2.7, dur: 5.8, gold: true },
  { id: 's7', left: '38%', top: '34%', size: 4, delay: 1.9, dur: 5.6, gold: false },
];

/**
 * Full-bleed, cardless 3D living background hero portrait stage.
 * Uses multi-directional alpha & gradient masking so Dr. Zokhidjon's portrait
 * melts seamlessly into the #050B18 midnight canvas with 3D perspective parallax,
 * breathing motion, rotating 3D holographic orbital rings, and volumetric glow.
 */
export function HeroFuturisticPortrait() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const { scrollY } = useScroll();

  // Scroll-driven 3D depth parallax
  const scrollShiftY = useTransform(scrollY, [0, 700], [0, 72]);
  const scrollScale = useTransform(scrollY, [0, 700], [1, 1.07]);

  // Smooth spring-damped 3D tilt & layered spatial parallax
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6.5, 6.5]), {
    stiffness: 140,
    damping: 22,
  });
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5.5, -5.5]), {
    stiffness: 140,
    damping: 22,
  });
  const bgX = useSpring(useTransform(mouseX, [-0.5, 0.5], [16, -16]), {
    stiffness: 110,
    damping: 24,
  });
  const bgY = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), {
    stiffness: 110,
    damping: 24,
  });
  const ringX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-22, 22]), {
    stiffness: 120,
    damping: 24,
  });
  const ringY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-14, 14]), {
    stiffness: 120,
    damping: 24,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const nx = e.clientX / Math.max(1, window.innerWidth) - 0.5;
      const ny = e.clientY / Math.max(1, window.innerHeight) - 0.5;
      mouseX.set(nx);
      mouseY.set(ny);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mouseX, mouseY]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: '1400px' }}
      aria-hidden="true"
    >
      {/* Volumetric sapphire & brushed-gold gradient aura behind the doctor */}
      <div
        className="hero-aura-pulse absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 58% at 72% 40%, rgba(36, 126, 255, 0.28), transparent 68%), radial-gradient(ellipse 46% 42% at 62% 22%, rgba(234, 179, 75, 0.18), transparent 64%)',
        }}
      />

      {/* 3D Tilting Full-Bleed Portrait Plane (zero card borders, seamless gradient melt) */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          x: bgX,
          y: scrollShiftY,
          scale: scrollScale,
          transformStyle: 'preserve-3d',
        }}
        className="absolute inset-x-0 top-0 h-[470px] sm:h-[560px] lg:inset-y-0 lg:left-[26%] lg:right-0 lg:h-full"
      >
        <motion.div
          style={{ y: bgY }}
          className="hero-portrait-mask relative h-full w-full"
        >
          <img
            src={ASSETS.heroDoctor}
            alt=""
            referrerPolicy="no-referrer"
            className="hero-portrait-breathe h-full w-full object-cover object-[center_14%] lg:object-[62%_16%]"
          />

          {/* Futuristic luminous diagonal holographic sweep across the living portrait */}
          <div className="hero-scan-beam absolute inset-x-0 top-0 h-40 opacity-75" />
        </motion.div>
      </motion.div>

      {/* Tilted 3D Holographic Orbital Rings floating in foreground/midground depth */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="absolute right-[-18%] top-[6%] h-[340px] w-[340px] opacity-45 sm:right-[-6%] sm:h-[460px] sm:w-[460px] lg:right-[2%] lg:top-[8%] lg:h-[560px] lg:w-[560px]"
      >
        <div
          className="h-full w-full"
          style={{ transform: 'rotateX(68deg) rotateY(-14deg)' }}
        >
          <div className="hero-ring-spin h-full w-full rounded-full border border-sky-400/35 shadow-[0_0_40px_rgba(56,189,248,0.28)]" />
        </div>
        <div
          className="absolute inset-8"
          style={{ transform: 'rotateX(64deg) rotateY(18deg)' }}
        >
          <div className="hero-ring-spin-reverse h-full w-full rounded-full border border-dashed border-[#F6C86E]/45 shadow-[0_0_32px_rgba(234,179,75,0.22)]" />
        </div>
      </motion.div>

      {/* Rising 3D synaptic light particles */}
      <div className="absolute inset-0">
        {FLOATING_SYNAPSES.map((node) => (
          <span
            key={node.id}
            className="hero-float-spark absolute rounded-full"
            style={{
              left: node.left,
              top: node.top,
              width: node.size,
              height: node.size,
              animationDelay: `${node.delay}s`,
              animationDuration: `${node.dur}s`,
              background: node.gold
                ? 'radial-gradient(circle, #FFF0C2 0%, #EAB34B 72%, transparent 100%)'
                : 'radial-gradient(circle, #C7F2FF 0%, #38BDF8 72%, transparent 100%)',
              boxShadow: node.gold
                ? '0 0 12px rgba(234,179,75,0.85)'
                : '0 0 12px rgba(56,189,248,0.85)',
            }}
          />
        ))}
      </div>

      {/* Measured multi-directional midnight gradients blending portrait seamlessly into background & ensuring 4.5:1 text legibility */}
      {/* Mobile vertical bottom-up fade so text below portrait sits cleanly on #050B18 */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,11,24,0.38) 0%, rgba(5,11,24,0.12) 26%, rgba(5,11,24,0.72) 52%, rgba(5,11,24,0.97) 72%, #050B18 100%)',
        }}
      />

      {/* Desktop left-to-right & bottom-up cinematic melt */}
      <div
        className="hidden lg:block lg:absolute lg:inset-0"
        style={{
          background:
            'linear-gradient(90deg, #050B18 0%, rgba(5,11,24,0.96) 36%, rgba(5,11,24,0.62) 56%, rgba(5,11,24,0.16) 78%, rgba(5,11,24,0.52) 100%)',
        }}
      />
      <div
        className="hidden lg:block lg:absolute lg:inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,11,24,0.55) 0%, transparent 18%, transparent 74%, #050B18 100%)',
        }}
      />
    </div>
  );
}
