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
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CERTIFICATES,
  UI_COPY,
  type Locale,
} from '../data/neurologyData';

interface Certificates3DShowcaseProps {
  locale: Locale;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Futuristic Virtualized 3D Curved Coverflow Conveyor for official certificates.
 * Architected to scale seamlessly from 4 to 100+ certificates at 60fps by only
 * mounting the visible panoramic arc slots around the continuous flow offset.
 * Clicking ANY certificate opens the zoomable full-screen Lightbox with PDF access.
 */
export function Certificates3DShowcase({ locale }: Certificates3DShowcaseProps) {
  const copy = UI_COPY[locale].statsSection;
  const count = CERTIFICATES.length;

  // Continuous virtual position in certificate units (advances smoothly 0 -> 1 -> 2 -> ...)
  const [flowPos, setFlowPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [stageWidth, setStageWidth] = useState(960);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const flowPosRef = useRef(0);
  const targetPosRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const pointerRef = useRef<{
    active: boolean;
    captured: boolean;
    startX: number;
    lastX: number;
    lastTime: number;
    startPos: number;
    moved: boolean;
  }>({
    active: false,
    captured: false,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    startPos: 0,
    moved: false,
  });

  // Responsive geometry measured cleanly via ResizeObserver (zero mobile overflow)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isCompact = stageWidth < 640;
  const isTablet = stageWidth >= 640 && stageWidth < 1024;
  const isWideDesktop = stageWidth >= 1360;
  const cardWidth = isCompact
    ? Math.min(244, Math.max(198, stageWidth - 92))
    : isTablet
      ? 268
      : isWideDesktop
        ? 316
        : 294;
  const cardHeight = isCompact ? 268 : isTablet ? 296 : isWideDesktop ? 344 : 324;
  const stride = Math.round(cardWidth * (isCompact ? 0.86 : 0.85));
  const depthZ = isCompact ? 110 : isWideDesktop ? 210 : 175;
  // Dynamically fill even 1800px+ full-screen viewports edge-to-edge while staying virtualized
  const visibleHalf = Math.max(2, Math.min(7, Math.ceil(stageWidth / (2 * stride)) + 1));

  // Continuous 60fps virtualized 3D stream loop with smooth inertia & step snapping
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!pointerRef.current.active) {
        if (targetPosRef.current !== null) {
          const diff = targetPosRef.current - flowPosRef.current;
          if (Math.abs(diff) < 0.004) {
            flowPosRef.current = targetPosRef.current;
            targetPosRef.current = null;
          } else {
            flowPosRef.current += diff * Math.min(1, dt * 8.5);
          }
          setFlowPos(flowPosRef.current);
        } else if (Math.abs(velocityRef.current) > 0.02) {
          flowPosRef.current += velocityRef.current * dt;
          velocityRef.current *= Math.pow(0.08, dt);
          if (Math.abs(velocityRef.current) <= 0.02) {
            velocityRef.current = 0;
          }
          setFlowPos(flowPosRef.current);
        } else if (isPlaying && lightboxIndex === null && !reducedMotion) {
          // Energetic smooth continuous conveyor stream; slows gracefully on hover for easy clicking
          const speedItemsPerSec = isHovered ? 0.16 : 1.08;
          flowPosRef.current += speedItemsPerSec * dt;
          setFlowPos(flowPosRef.current);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isHovered, lightboxIndex]);

  // Keyboard navigation inside the full-screen Lightbox viewer
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setIsZoomed(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev === null ? null : mod(prev + 1, count)));
        setIsZoomed(false);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev === null ? null : mod(prev - 1, count)));
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, count]);

  const centerSlot = Math.round(flowPos);
  const activeIndex = mod(centerSlot, count);
  const activeCert = CERTIFICATES[activeIndex] ?? CERTIFICATES[0];
  const lightboxCert = lightboxIndex !== null ? CERTIFICATES[lightboxIndex] : null;

  // Virtualized visible window (always renders only ~5-9 nodes even with 100+ certificates)
  const slots: number[] = [];
  for (let offset = -visibleHalf; offset <= visibleHalf; offset++) {
    slots.push(centerSlot + offset);
  }

  const stepFlow = (dir: -1 | 1) => {
    velocityRef.current = 0;
    const base = targetPosRef.current !== null ? Math.round(targetPosRef.current) : Math.round(flowPosRef.current);
    targetPosRef.current = base + dir;
  };

  const openCertificateAt = (certIdx: number) => {
    setIsZoomed(false);
    setLightboxIndex(certIdx);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    targetPosRef.current = null;
    velocityRef.current = 0;
    pointerRef.current = {
      active: true,
      captured: false,
      startX: e.clientX,
      lastX: e.clientX,
      lastTime: performance.now(),
      startPos: flowPosRef.current,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current.active) return;
    const dxTotal = e.clientX - pointerRef.current.startX;
    if (!pointerRef.current.moved && Math.abs(dxTotal) > 8) {
      pointerRef.current.moved = true;
      pointerRef.current.captured = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic events
      }
    }
    if (!pointerRef.current.moved) return;

    const now = performance.now();
    const dt = Math.max(0.008, (now - pointerRef.current.lastTime) / 1000);
    const dxStep = e.clientX - pointerRef.current.lastX;
    velocityRef.current = Math.max(-6, Math.min(6, (-dxStep / stride) / dt));

    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastTime = now;

    flowPosRef.current = pointerRef.current.startPos - dxTotal / stride;
    setFlowPos(flowPosRef.current);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current.active) return;
    pointerRef.current.active = false;
    if (pointerRef.current.captured) {
      pointerRef.current.captured = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore already released capture
      }
    }
  };

  const formatCounter = (index: number, total: number) => {
    const pad = total >= 100 ? 3 : 2;
    return `${String(index + 1).padStart(pad, '0')} / ${String(total).padStart(pad, '0')}`;
  };

  const progressPct = ((activeIndex + 1) / count) * 100;

  return (
    <div className="mt-12 w-full min-w-0 sm:mt-16">
      {/* Section Header + Flow Controls */}
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

        <div className="flex items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={() => stepFlow(-1)}
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
            onClick={() => stepFlow(1)}
            aria-label="Next certificate"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 transition-colors hover:border-[#EAB34B]/60 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Futuristic Panoramic 3D Curved Conveyor Stage (Virtualized for 100+ Certificates) */}
      <div
        ref={stageRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="neuro-panel relative w-full overflow-hidden rounded-3xl pb-6 pt-7 sm:pb-8 sm:pt-10"
      >
        {/* Top holographic horizon beam */}
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-[1px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.4) 30%, rgba(246, 200, 110, 0.72) 50%, rgba(56, 189, 248, 0.4) 70%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* Ambient central focal halo beneath active certificate */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 blur-3xl sm:w-[460px]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(234, 179, 75, 0.24) 0%, rgba(56, 189, 248, 0.22) 48%, transparent 74%)',
          }}
          aria-hidden="true"
        />

        {/* Subtle luminous curved rail beneath the flowing cards */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[168px] mx-auto h-14 w-[92%] max-w-4xl rounded-[100%] border-b border-sky-400/25 sm:bottom-[152px]"
          style={{
            boxShadow: '0 14px 36px -14px rgba(56, 189, 248, 0.35)',
          }}
          aria-hidden="true"
        />

        {/* Interactive 3D Panoramic Conveyor Viewport */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            height: `${cardHeight + 54}px`,
            perspective: isCompact ? '980px' : '1420px',
            touchAction: 'pan-y',
          }}
          className="relative mx-auto flex w-full cursor-grab items-center justify-center overflow-hidden select-none active:cursor-grabbing"
        >
          {/* Smooth holographic edge masks so incoming/outgoing cards dissolve into depth */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-30 w-10 sm:w-28"
            style={{
              background: 'linear-gradient(to right, rgba(7, 17, 36, 0.96) 0%, transparent 100%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-30 w-10 sm:w-28"
            style={{
              background: 'linear-gradient(to left, rgba(7, 17, 36, 0.96) 0%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          {/* Virtualized 3D Cards Flowing Sequentially Across Curved Perspective Arc */}
          <div
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {slots.map((slotIdx) => {
              const certIdx = mod(slotIdx, count);
              const cert = CERTIFICATES[certIdx];
              const delta = slotIdx - flowPos; // 0 = dead center, -1 = left, +1 = right
              const x = delta * stride;
              const norm = x / Math.max(240, stageWidth * 0.5);
              const absNorm = Math.abs(norm);
              const isCenter = Math.abs(delta) < 0.45;

              const rotateY = Math.max(-42, Math.min(42, -norm * 32));
              const translateZ = -Math.pow(absNorm, 1.55) * depthZ + (isCenter ? 28 : 0);
              const translateY = Math.pow(absNorm, 1.9) * 16 - (isCenter ? 6 : 0);
              const scale = Math.max(0.76, 1.03 - absNorm * 0.2);
              const opacity = Math.max(0.14, 1 - Math.pow(absNorm, 2.2) * 0.72);
              const zIndex = Math.round(100 - Math.abs(delta) * 18);

              return (
                <div
                  key={slotIdx}
                  onClick={() => {
                    if (pointerRef.current.moved) return;
                    openCertificateAt(certIdx);
                  }}
                  role="button"
                  tabIndex={isCenter ? 0 : -1}
                  aria-label={`${cert.title[locale]} — ${copy.openCertificate}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openCertificateAt(certIdx);
                    }
                  }}
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    left: '50%',
                    top: '50%',
                    marginLeft: `${-cardWidth / 2}px`,
                    marginTop: `${-cardHeight / 2}px`,
                    transform: `translate3d(${x.toFixed(1)}px, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
                    opacity,
                    zIndex,
                    willChange: 'transform, opacity',
                  }}
                  className={`group absolute flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#071329]/95 p-2.5 transition-[border-color,box-shadow] duration-200 sm:p-3 ${
                    isCenter
                      ? 'border-[#EAB34B]/80 shadow-[0_0_42px_-10px_rgba(234,179,75,0.48),0_26px_54px_-16px_rgba(2,8,22,0.96)]'
                      : 'border-sky-400/25 shadow-[0_18px_40px_-16px_rgba(2,8,22,0.88)] hover:border-[#EAB34B]/70'
                  }`}
                >
                  {/* Luminous top hairline accent */}
                  <div
                    className={`pointer-events-none absolute inset-x-4 top-0 h-[1.5px] transition-opacity ${
                      isCenter
                        ? 'bg-gradient-to-r from-transparent via-[#F6C86E] to-transparent opacity-100'
                        : 'bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-60 group-hover:via-[#F6C86E] group-hover:opacity-100'
                    }`}
                    aria-hidden="true"
                  />

                  {/* Certificate Document Image */}
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#040A17] p-1.5">
                    <img
                      src={cert.imageUrl}
                      alt={cert.title[locale]}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full rounded-lg object-contain shadow-md transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

                    {/* Click-to-open zoom cue */}
                    <span
                      className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#050B18]/85 text-[#FCE19A] ring-1 ring-[#EAB34B]/45 transition-opacity duration-200 ${
                        isCenter ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Clean Metadata Strip */}
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

        {/* Scalable Active Certificate Bar (Works cleanly for 4 or 100+ certificates) */}
        <div className="relative z-20 mx-3 mt-4 flex flex-col gap-4 border-t border-sky-400/15 pt-5 sm:mx-6 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            {/* Compact scalable counter & luminous progress rail */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold tabular-nums text-[#FCE19A]">
                {formatCounter(activeIndex, count)}
              </span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sky-950/90 ring-1 ring-sky-400/20 sm:w-36">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] to-[#F6C86E] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCertificateAt(activeIndex)}
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

        <p className="mt-3 px-4 text-center text-[11px] text-slate-500">{copy.dragHint}</p>
      </div>

      {/* Full-Screen Zoomable Certificate Viewer Modal (Prev/Next + Zoom + Original PDF) */}
      {lightboxCert && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/92 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxCert.title[locale]}
          onClick={() => {
            setLightboxIndex(null);
            setIsZoomed(false);
          }}
        >
          <div
            className="neuro-panel relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl p-4 pb-6 sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sky-300/25 sm:hidden"
              aria-hidden="true"
            />

            {/* Top Bar */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-[#F6C86E]">
                  <span>{formatCounter(lightboxIndex, count)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lightboxCert.code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-300">{lightboxCert.date}</span>
                </div>
                <h4 className="mt-0.5 text-base font-bold text-white sm:text-xl">
                  {lightboxCert.title[locale]}
                </h4>
                <p className="text-xs text-slate-400">{lightboxCert.issuer[locale]}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsZoomed((z) => !z)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 transition-colors hover:border-[#EAB34B]/50 hover:text-white"
                  aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                >
                  {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(null);
                    setIsZoomed(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 text-slate-300 transition-colors hover:border-[#EAB34B]/50 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* High-Resolution Document Canvas with Prev/Next Switchers */}
            <div className="relative overflow-hidden rounded-xl border border-sky-400/20 bg-[#030812]">
              <div
                onClick={() => setIsZoomed((z) => !z)}
                className={`flex max-h-[62vh] min-h-[260px] items-center justify-center overflow-auto p-2 sm:p-4 ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
              >
                <img
                  src={lightboxCert.imageUrl}
                  alt={lightboxCert.title[locale]}
                  referrerPolicy="no-referrer"
                  className={`rounded-lg object-contain transition-transform duration-300 ${
                    isZoomed ? 'max-h-none w-[165%] max-w-none sm:w-[140%]' : 'max-h-[58vh] w-auto max-w-full'
                  }`}
                />
              </div>

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxIndex(mod(lightboxIndex - 1, count));
                      setIsZoomed(false);
                    }}
                    aria-label="Previous certificate"
                    className="absolute left-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-sky-400/30 bg-[#050B18]/85 text-white transition-colors hover:border-[#EAB34B]/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxIndex(mod(lightboxIndex + 1, count));
                      setIsZoomed(false);
                    }}
                    aria-label="Next certificate"
                    className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-sky-400/30 bg-[#050B18]/85 text-white transition-colors hover:border-[#EAB34B]/70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Footer Details & PDF Link */}
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
