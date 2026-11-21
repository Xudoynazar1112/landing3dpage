import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  X,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import {
  ASSETS,
  CAREER_MILESTONES,
  PUBLICATIONS,
  UI_COPY,
  type Locale,
} from '../data/neurologyData';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  onBookClick: () => void;
}

const VIDEO_LABELS: Record<
  Locale,
  { startHighlight: string; startBeginning: string; watchOnYoutube: string }
> = {
  uz: {
    startHighlight: '1:35 dan boshlash',
    startBeginning: 'Boshidan (0:00)',
    watchOnYoutube: 'YouTube’da ochish',
  },
  ru: {
    startHighlight: 'С 1:35',
    startBeginning: 'С начала (0:00)',
    watchOnYoutube: 'Открыть в YouTube',
  },
  en: {
    startHighlight: 'Start at 1:35',
    startBeginning: 'From start (0:00)',
    watchOnYoutube: 'Watch on YouTube',
  },
};

export function AboutDoctorModal({
  open,
  onClose,
  locale,
  onBookClick,
}: AboutModalProps) {
  const copy = UI_COPY[locale].aboutModal;
  const videoLabels = VIDEO_LABELS[locale];
  const [startSec, setStartSec] = useState<number>(ASSETS.introVideoStartSec);

  useEffect(() => {
    if (!open) return;
    setStartSec(ASSETS.introVideoStartSec);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const embedUrl = `https://www.youtube.com/embed/${ASSETS.introVideoId}?start=${startSec}&autoplay=1&rel=0&modestbranding=1`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/85 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onClose}
    >
      <div
        className="neuro-panel relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl p-5 pb-8 sm:rounded-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sky-300/25 sm:hidden" aria-hidden="true" />
        <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
          <h3 className="text-lg font-bold text-white sm:text-2xl">{copy.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 text-slate-300 transition-colors hover:border-[#EAB34B]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#EAB34B]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Embedded YouTube Video Player */}
        <div className="relative mb-6 overflow-hidden rounded-xl border border-sky-400/25 bg-[#050C1C] shadow-[0_18px_45px_-16px_rgba(2,8,22,0.9)]">
          <div className="relative aspect-video w-full overflow-hidden bg-[#030812]">
            <iframe
              key={startSec}
              src={embedUrl}
              title={copy.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>

          {/* Clean video timestamp & external YouTube bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-sky-400/15 bg-[#071329]/90 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStartSec(ASSETS.introVideoStartSec)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors ${
                  startSec === ASSETS.introVideoStartSec
                    ? 'bg-[#EAB34B] text-[#081020]'
                    : 'border border-sky-400/20 bg-[#08152E] text-slate-300 hover:border-sky-400/50 hover:text-white'
                }`}
              >
                {videoLabels.startHighlight}
              </button>
              <button
                type="button"
                onClick={() => setStartSec(0)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors ${
                  startSec === 0
                    ? 'bg-[#EAB34B] text-[#081020]'
                    : 'border border-sky-400/20 bg-[#08152E] text-slate-300 hover:border-sky-400/50 hover:text-white'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>{videoLabels.startBeginning}</span>
              </button>
            </div>

            <a
              href={ASSETS.introVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAB34B]/40 bg-[#EAB34B]/10 px-3 py-1.5 text-xs font-semibold text-[#FCE19A] transition-colors hover:bg-[#EAB34B] hover:text-[#081020]"
            >
              <span>{videoLabels.watchOnYoutube}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Philosophy & Milestones */}
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <h4 className="mb-2 text-base font-semibold text-[#F6C86E]">{copy.philosophyTitle}</h4>
            <p className="text-sm leading-relaxed text-slate-300">{copy.philosophyBody}</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBookClick();
              }}
              className="gold-cta mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform active:scale-95"
            >
              {UI_COPY[locale].nav.bookCta}
            </button>
          </div>

          <div className="md:col-span-3">
            <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <GraduationCap className="h-4 w-4 text-[#F6C86E]" />
              <span>{copy.timelineTitle}</span>
            </h4>
            <div className="space-y-4">
              {CAREER_MILESTONES.map((item) => (
                <div
                  key={item.period}
                  className="border-b border-sky-400/10 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="font-mono text-xs tabular-nums text-sky-300">{item.period}</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">
                    {item.title[locale]}
                  </div>
                  <div className="text-xs text-slate-400">{item.institution[locale]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScienceModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}

export function ScientificActivityModal({ open, onClose, locale }: ScienceModalProps) {
  const copy = UI_COPY[locale].scienceModal;
  const [filter, setFilter] = useState<'all' | 'epilepsy' | 'neurodevelopment' | 'international'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered =
    filter === 'all'
      ? PUBLICATIONS
      : PUBLICATIONS.filter((p) => p.category === filter);

  const handleCopyDoi = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/85 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onClose}
    >
      <div
        className="neuro-panel relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl p-5 pb-8 sm:rounded-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sky-300/25 sm:hidden" aria-hidden="true" />
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div>
            <h3 className="text-lg font-bold text-white sm:text-2xl">{copy.title}</h3>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 text-slate-300 transition-colors hover:border-[#EAB34B]/50 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Interactive segmented filter bar */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-sky-400/15 pb-4">
          {(
            ['all', 'epilepsy', 'neurodevelopment', 'international'] as const
          ).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key
                  ? 'bg-[#EAB34B] text-[#081020]'
                  : 'bg-[#0C1B3A] text-slate-300 hover:bg-[#132852] hover:text-white'
              }`}
            >
              {copy.filters[key]}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map((pub) => (
            <article
              key={pub.id}
              className="rounded-xl border border-sky-400/15 bg-[#071226]/90 p-5 transition-colors hover:border-sky-400/35"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-[#F6C86E]" />
                  <span className="font-medium text-sky-300">{pub.journal}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{pub.year}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pub.coAuthors}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyDoi(pub.id, `${pub.coAuthors} (${pub.year}). ${pub.title[locale]}. ${pub.journal}. DOI: ${pub.doi}`)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-[#F6C86E]"
                >
                  {copiedId === pub.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">DOI</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="font-mono">{pub.doi}</span>
                    </>
                  )}
                </button>
              </div>
              <h4 className="mt-2.5 text-base font-semibold text-white">
                {pub.title[locale]}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {pub.summary[locale]}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
