import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  /** Duration of the smooth count-up animation in milliseconds */
  durationMs?: number;
}

function formatWithSpaces(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function AnimatedCounter({
  value,
  suffix = '',
  durationMs = 3000,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    startedRef.current = false;
    cancelAnimationFrame(rafRef.current);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setDisplay(value);
      startedRef.current = true;
      return;
    }

    const startAnimation = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setDisplay(0);
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        // Smooth ease-out curve across the full 3-second duration
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(value * eased);
        setDisplay(current);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setDisplay(value);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {formatWithSpaces(display)}
      {suffix}
    </span>
  );
}
