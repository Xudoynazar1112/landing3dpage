import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CERTIFICATES,
  UI_COPY,
  type CertificateItem,
  type Locale,
} from '../data/neurologyData';

interface Certificates3DShowcaseProps {
  locale: Locale;
}

/**
 * Futuristic continuously-revolving 3D orbital carousel for official medical
 * certificates and state copyright credentials. Supports smooth auto-rotation,
 * touch/mouse horizontal drag spin, hover slowdown, direct selection, and a
 * full-screen document lightbox with original PDF download/view.
 */
export function Certificates3DShowcase({ locale }: Certificates3DShowcaseProps) {
  const copy = UI_COPY[locale].statsSection;
  const count = CERTIFICATES.length;
  const stepDeg = 360 / count;

  const [angle, setAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [stageWidth, setStageWidth] = useState(960);
  const [lightboxCert, setLightboxCert] = useState<CertificateItem | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);
  const targetAngleRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startAngle: number; moved: boolean }>({
    active: false,
    startX: 0,
    startAngle: 0,
    moved: false,
  });

  // Measure container width so 3D radius scales cleanly across mobile (320px+) and desktop
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Continuous smooth 60fps 3D orbital rotation loop
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!dragRef.current.active) {
        if (targetAngleRef.current !== null) {
          const diff = targetAngleRef.current - angleRef.current;
          if (Math.abs(diff) < 0.15) {
            angleRef.current = targetAngleRef.current;
            targetAngleRef.current = null;
          } else {
            angleRef.current += diff * Math.min(1, dt * 7.5);
          }
          setAngle(angleRef.current);
        } else if (isPlaying && !lightboxCert && !reducedMotion) {
          // Gentle continuous rotation; slows smoothly while hovering so user can read
          const speedDegPerSec = isHovered ? 3.5 : 14.5;
          angleRef.current -= speedDegPerSec * dt;
          setAngle(angleRef.current);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isHovered, lightboxCert]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxCert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxCert(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxCert]);

  // Compute front-most active certificate index from current angle
  const normalized = (((-angle % 360) + 360) % 360);
  const activeIndex = Math.round(normalized / stepDeg) % count;
  const activeCert = CERTIFICATES[activeIndex] ?? CERTIFICATES[0];

  // Responsive 3D orbital geometry (zero overflow on mobile)
  const isCompact = stageWidth < 640;
  const cardWidth = isCompact ? Math.min(248, Math.max(204, stageWidth - 88)) : 330;
  const cardHeight = isCompact ? 268 : 340;
  const radiusZ = isCompact ? Math.round(cardWidth * 0.78) : 300;

  const snapToIndex = (idx: number) => {
    const desiredMod = ((-idx * stepDeg) % 360 + 360) % 360;
    const currentMod = ((angleRef.current % 360) + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    targetAngleRef.current = angleRef.current + delta;
  };

  const stepRotate = (dir: -1 | 1) => {
    const nextIdx = (activeIndex + dir + count) % count;
    snapToIndex(nextIdx);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    targetAngleRef.current = null;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startAngle: angleRef.current,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) {
      dragRef.current.moved = true;
    }
    angleRef.current = dragRef.current.startAngle + dx * 0.38;
    setAngle(angleRef.current);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore already released capture
    }
  };

  return (
    <div className="mt-12 w-full min-w-0 sm:mt-16">
      {/* Header row */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-1.5 inline-flex items-center gap-2 text-xs font-medium text-[#F6C86E]">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>EPNS · Ministry of Health · Intellectual Property Center</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white sm:text-3xl">
            {copy.certificatesHeading}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
            {copy.certificatesSubheading}
          </p>
        </div>

        {/* Play / Pause & Prev / Next Controls */}
        <div className="flex items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={() => stepRotate(-1)}
            aria-label="Previous certificate"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 transition-colors hover:border-[#EAB34B]/60 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#EAB34B]/35 bg-[#0A1733] px-3.5 text-xs font-semibold text-[#FCE19A] whitespace-nowrap transition-colors hover:border-[#EAB34B]"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? copy.pauseRotation : copy.resumeRotation}</span>
          </button>
          <button
            type="button"
            onClick={() => stepRotate(1)}
            aria-label="Next certificate"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 transition-colors hover:border-[#EAB34B]/60 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Futuristic 3D Revolving Orbital Stage */}
      <div
        ref={stageRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'pan-y' }}
        className="neuro-panel relative w-full overflow-hidden rounded-3xl px-3 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-12"
      >
        {/* Ambient 3D holographic pedestal glow beneath orbiting certificates */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-14 mx-auto h-36 max-w-2xl rounded-full opacity-55 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.32) 0%, rgba(234, 179, 75, 0.22) 48%, transparent 74%)',
          }}
          aria-hidden="true"
        />

        {/* Subtle elliptical floor orbit track */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-20 mx-auto h-20 w-[84%] max-w-2xl rounded-[100%] border border-sky-400/20"
          style={{
            boxShadow: 'inset 0 0 36px rgba(56, 189, 248, 0.14), 0 0 28px rgba(234, 179, 75, 0.12)',
          }}
          aria-hidden="true"
        />

        {/* 3D Perspective Viewport */}
        <div
          className="relative mx-auto flex w-full cursor-grab items-center justify-center active:cursor-grabbing"
          style={{
            height: `${cardHeight + 48}px`,
            perspective: isCompact ? '950px' : '1450px',
          }}
        >
          <div
            className="relative"
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${-radiusZ * 0.42}px) rotateX(-3deg) rotateY(${angle}deg)`,
            }}
          >
            {CERTIFICATES.map((cert, idx) => {
              const itemDeg = idx * stepDeg;
              // Calculate front-ness (1 = directly facing viewer, -1 = directly behind)
              const relRad = ((itemDeg + angle) * Math.PI) / 180;
              const frontness = Math.cos(relRad);
              const isFront = idx === activeIndex;
              const opacity = 0.4 + Math.max(0, (frontness + 1) / 2) * 0.6;

              return (
                <div
                  key={cert.id}
                  onClick={() => {
                    if (dragRef.current.moved) return;
                    if (isFront) {
                      setLightboxCert(cert);
                    } else {
                      snapToIndex(idx);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isFront) setLightboxCert(cert);
                      else snapToIndex(idx);
                    }
                  }}
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    transform: `rotateY(${itemDeg}deg) translateZ(${radiusZ}px)`,
                    opacity,
                  }}
                  className={`group absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#071329]/95 p-2.5 transition-shadow duration-300 select-none sm:p-3 ${
                    isFront
                      ? 'border-[#EAB34B]/75 shadow-[0_0_40px_-8px_rgba(234,179,75,0.45),0_22px_50px_-14px_rgba(2,8,22,0.95)]'
                      : 'border-sky-400/25 shadow-[0_18px_40px_-16px_rgba(2,8,22,0.85)]'
                  }`}
                >
                  {/* Real scanned certificate document preview */}
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#040A17] p-1.5">
                    <img
                      src={cert.imageUrl}
                      alt={cert.title[locale]}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full rounded-lg object-contain shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                    {isFront && (
                      <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#050B18]/80 text-[#FCE19A] ring-1 ring-[#EAB34B]/45">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Clean footer caption inside card */}
                  <div className="mt-2.5 px-1">
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-[#F6C86E] sm:text-[11px]">
                      <span className="truncate">{cert.code}</span>
                      <span className="shrink-0 text-sky-300">{cert.date}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-white sm:text-sm">
                      {cert.title[locale]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Certificate Detail Bar + Direct Selectors */}
        <div className="relative z-10 mt-4 flex flex-col gap-4 border-t border-sky-400/15 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-300">
              <span className="font-mono font-semibold tabular-nums text-[#F6C86E]">
                {activeCert.code}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{activeCert.issuer[locale]}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-400">{activeCert.date}</span>
            </div>
            <h4 className="mt-1 text-base font-bold text-white sm:text-lg">
              {activeCert.title[locale]}
            </h4>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {activeCert.details[locale]}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end">
            {/* Numbered orbital selector buttons */}
            <div className="flex items-center gap-1.5">
              {CERTIFICATES.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => snapToIndex(idx)}
                  className={`min-h-9 min-w-9 rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors ${
                    idx === activeIndex
                      ? 'bg-[#EAB34B] text-[#081020]'
                      : 'border border-sky-400/20 bg-[#08152E] text-slate-300 hover:border-sky-400/50 hover:text-white'
                  }`}
                >
                  0{idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxCert(activeCert)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#EAB34B]/55 bg-[#EAB34B]/12 px-3.5 py-2 text-xs font-semibold text-[#FCE19A] whitespace-nowrap transition-colors hover:bg-[#EAB34B] hover:text-[#081020]"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{copy.openCertificate}</span>
              </button>
              <a
                href={activeCert.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#08152E] px-3.5 py-2 text-xs font-medium text-sky-200 whitespace-nowrap transition-colors hover:border-sky-400/60 hover:text-white"
              >
                <span>PDF</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-500">{copy.dragHint}</p>
      </div>

      {/* Full-Screen High-Resolution Certificate Lightbox Modal */}
      {lightboxCert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/90 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxCert.title[locale]}
          onClick={() => setLightboxCert(null)}
        >
          <div
            className="neuro-panel relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl p-4 pb-6 sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sky-300/25 sm:hidden"
              aria-hidden="true"
            />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-mono text-xs tabular-nums text-[#F6C86E]">
                  {lightboxCert.code} · {lightboxCert.date}
                </div>
                <h4 className="mt-0.5 text-base font-bold text-white sm:text-xl">
                  {lightboxCert.title[locale]}
                </h4>
                <p className="text-xs text-slate-400">{lightboxCert.issuer[locale]}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxCert(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 text-slate-300 transition-colors hover:border-[#EAB34B]/50 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex max-h-[62vh] items-center justify-center overflow-hidden rounded-xl border border-sky-400/20 bg-[#030812] p-2 sm:p-4">
              <img
                src={lightboxCert.imageUrl}
                alt={lightboxCert.title[locale]}
                referrerPolicy="no-referrer"
                className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                {lightboxCert.details[locale]}
              </p>
              <a
                href={lightboxCert.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="gold-cta inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap sm:text-sm"
              >
                <span>{copy.openPdf}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
