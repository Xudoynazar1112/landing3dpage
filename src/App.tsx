import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  ASSETS,
  CLINIC_CONTACTS,
  SPECIALTIES,
  STATS,
  UI_COPY,
  type Locale,
  type SpecialtyId,
} from './data/neurologyData';
import { HolographicBrain3D } from './components/HolographicBrain3D';
import { AmbientNeuralField3D } from './components/AmbientNeuralField3D';
import { HeroFuturisticPortrait } from './components/HeroFuturisticPortrait';
import { Certificates3DShowcase } from './components/Certificates3DShowcase';
import { DoctorCrmDashboard } from './components/DoctorCrmDashboard';
import { Tilt3DCard } from './components/Tilt3DCard';
import { BrandBrainMark, SpecialtyIcon } from './components/SpecialtyIcons';
import { AnimatedCounter } from './components/AnimatedCounter';
import { AboutDoctorModal, ScientificActivityModal } from './components/Modals';
import { BookingSection } from './components/BookingSection';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'uz', label: 'UZ' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
];

export default function App() {
  const [locale, setLocale] = useState<Locale>('uz');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<SpecialtyId>('epilepsy');
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [scienceModalOpen, setScienceModalOpen] = useState(false);
  const [showCrm, setShowCrm] = useState(false);

  // Smooth scroll progress bar & ref piped directly to 3D Three.js cameras
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      scrollProgressRef.current = latest;
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const copy = UI_COPY[locale];
  const activeSpecialty =
    SPECIALTIES.find((s) => s.id === selectedSpecialtyId) ?? SPECIALTIES[0];
  const leftSpecialties = SPECIALTIES.filter((s) => s.side === 'left');
  const rightSpecialties = SPECIALTIES.filter((s) => s.side === 'right');

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const statIcons = [Award, Users, BookOpen, Trophy];

  if (showCrm) {
    return (
      <DoctorCrmDashboard
        locale={locale}
        onBack={() => setShowCrm(false)}
      />
    );
  }

  return (
    <div className="neural-grid-bg relative min-h-screen w-full overflow-x-clip bg-[#050B18] text-slate-100">
      {/* Scroll-reactive 3D deep neural constellation background */}
      <AmbientNeuralField3D scrollProgressRef={scrollProgressRef} />

      {/* Scroll progress golden hairline */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-[#38BDF8] via-[#F6C86E] to-[#EAB34B]"
        aria-hidden="true"
      />

      {/* TOP BAR CONTRACT: Strictly 3 zones separated by gap-8.
          Relative on mobile (so bottom thumb bar stays strictly under 15% mobile sticky cap), sticky on desktop. */}
      <header className="relative z-40 border-b border-sky-400/12 bg-[#050B18]/88 md:sticky md:top-0">
        <div className="mx-auto flex h-14 w-full max-w-[1840px] items-center justify-between gap-2.5 px-3.5 sm:h-[70px] sm:gap-8 sm:px-6 lg:px-10 xl:px-14">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#top"
            className="flex min-w-0 items-center gap-2 text-[13px] font-bold tracking-tight text-white whitespace-nowrap sm:gap-3 sm:text-lg"
          >
            <BrandBrainMark className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="truncate">Dr. Zokhidjon Ismailov</span>
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex"
            aria-label="Primary navigation"
          >
            <button
              type="button"
              onClick={() => scrollToSection('specialties')}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#F6C86E]"
            >
              {copy.nav.specialties}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('results')}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#F6C86E]"
            >
              {copy.nav.results}
            </button>
            <button
              type="button"
              onClick={() => setAboutModalOpen(true)}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#F6C86E]"
            >
              {copy.nav.about}
            </button>
            <button
              type="button"
              onClick={() => setScienceModalOpen(true)}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#F6C86E]"
            >
              {copy.nav.science}
            </button>
          </nav>

          {/* Zone 3: Language switcher + Primary CTA (+ mobile menu trigger) */}
          <div className="flex items-center gap-2 shrink-0 sm:gap-3">
            <div
              className="inline-flex items-center gap-0.5 rounded-xl border border-sky-400/20 bg-[#07142C] p-0.5 sm:p-1"
              role="group"
              aria-label="Language selector"
            >
              {LOCALES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLocale(item.code)}
                  className={`min-h-8 rounded-lg px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                    locale === item.code
                      ? 'bg-[#EAB34B] text-[#081020]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCrm(true)}
              className="hidden min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#08152E] px-3 py-2 text-xs font-semibold text-sky-200 whitespace-nowrap shrink-0 transition-colors hover:border-[#EAB34B]/60 hover:text-[#FCE19A] md:inline-flex"
              title="Doctor CRM & Operatsiyalar Kalendari"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[#F6C86E]" />
              <span>CRM</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('booking')}
              className="gold-cta hidden min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-0.5 md:inline-flex"
            >
              <span>{copy.nav.bookCta}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 text-slate-200 transition-colors hover:border-[#EAB34B]/50 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down drawer */}
        {mobileNavOpen && (
          <div className="border-t border-sky-400/15 bg-[#061024] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => scrollToSection('specialties')}
                className="min-h-11 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-sky-500/10"
              >
                {copy.nav.specialties}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('results')}
                className="min-h-11 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-sky-500/10"
              >
                {copy.nav.results}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setAboutModalOpen(true);
                }}
                className="min-h-11 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-sky-500/10"
              >
                {copy.nav.about}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setScienceModalOpen(true);
                }}
                className="min-h-11 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-sky-500/10"
              >
                {copy.nav.science}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setShowCrm(true);
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-[#FCE19A] hover:bg-sky-500/10"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Doctor CRM · Kalendar & Bot</span>
              </button>
              <div className="mt-2 border-t border-sky-400/15 pt-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('booking')}
                  className="gold-cta flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap"
                >
                  <span>{copy.nav.bookCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="relative z-10 w-full">
        {/* ============================================================
            SECTION 1: CARDLESS FULL-BLEED 3D LIVING BACKGROUND HERO
        ============================================================ */}
        <section className="relative flex min-h-[640px] items-end overflow-hidden pb-12 pt-[290px] sm:min-h-[700px] sm:pb-20 sm:pt-[350px] lg:min-h-[690px] lg:items-center lg:pb-24 lg:pt-16">
          {/* Cardless, gradient-melted 3D animated doctor backdrop */}
          <HeroFuturisticPortrait />

          <div className="relative z-10 mx-auto w-full max-w-[1840px] px-4 sm:px-6 lg:px-10 xl:px-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl lg:max-w-[640px] xl:max-w-[720px]"
            >
              {/* Clean Eyebrow Metadata (language switcher moved to navbar) */}
              <div className="mb-4 sm:mb-6">
                <p className="text-xs font-medium tracking-wide text-sky-300/95 sm:text-sm">
                  {copy.hero.eyebrow}
                </p>
              </div>

              {/* Display H1 */}
              <h1
                className="font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_6px_28px_rgba(5,11,24,0.85)]"
                style={{ fontSize: 'clamp(2.25rem, 4.7vw, 4.5rem)' }}
              >
                <span className="block">{copy.hero.title.split(' ')[0]}</span>
                <span className="bg-gradient-to-r from-[#FCE19A] via-[#EAB34B] to-[#D4952B] bg-clip-text text-transparent">
                  {copy.hero.title.split(' ').slice(1).join(' ')}
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:mt-5 sm:text-lg">
                {copy.hero.subtitle}
              </p>

              {/* Authentic drzokhidjon.uz credentials strip */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-y border-sky-400/20 py-4 sm:mt-7 sm:gap-5 sm:py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAB34B]/35 bg-[#0A1733]/85 text-[#F6C86E] sm:h-11 sm:w-11">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold tabular-nums text-white sm:text-base">
                      19+
                    </div>
                    <div className="truncate text-[11px] text-slate-300 sm:text-xs">
                      {copy.hero.expLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/35 bg-[#0A1733]/85 text-sky-300 sm:h-11 sm:w-11">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white sm:text-base">
                      MD, PhD, DSc
                    </div>
                    <div className="truncate text-[11px] text-slate-300 sm:text-xs">
                      {copy.hero.degreeLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* International Associations unboxed inline trust line */}
              <p className="mt-4 font-mono text-[11px] tracking-wide text-sky-300/85 sm:text-xs">
                {CLINIC_CONTACTS.memberships}
              </p>

              {/* Single dominant primary CTA + quiet secondary video trigger */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-7 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection('booking')}
                  className="gold-cta inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-bold whitespace-nowrap transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:text-base"
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{copy.hero.primaryCta}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setAboutModalOpen(true)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-sky-400/30 bg-[#08152E]/85 px-5 py-3.5 text-sm font-medium text-slate-100 whitespace-nowrap transition-colors hover:border-[#EAB34B]/55 hover:text-white active:scale-[0.98] sm:w-auto"
                >
                  <Play className="h-4 w-4 fill-[#F6C86E] text-[#F6C86E]" />
                  <span>{copy.hero.secondaryCta}</span>
                </button>
              </div>

              {/* Subtle scroll cue on desktop */}
              <button
                type="button"
                onClick={() => scrollToSection('specialties')}
                className="mt-10 hidden items-center gap-2 text-xs text-slate-400 transition-colors hover:text-[#F6C86E] lg:inline-flex"
              >
                <span>{copy.hero.scrollHint}</span>
                <ChevronRight className="h-3.5 w-3.5 rotate-90" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            SECTION 2: 3D HOLOGRAPHIC BRAIN CHAMBER + 6 SPECIALTIES
            (Focus-mode mobile hardened: zero overflow on 320px–430px)
        ============================================================ */}
        <section id="specialties" className="relative overflow-x-clip py-10 sm:py-24">
          <div className="mx-auto w-full min-w-0 max-w-[1840px] px-3.5 sm:px-6 lg:px-10 xl:px-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-4xl text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {copy.brainSection.heading}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:mt-3 sm:text-base">
                {copy.brainSection.subheading}
              </p>
            </motion.div>

            {/* Mobile & Tablet (< lg): 3D Brain on top + responsive 2-col 3D touch cards below
                Desktop (lg+): Iconic 3-left — 3D Brain — 3-right futuristic arrangement */}
            <div className="mt-7 grid w-full min-w-0 grid-cols-1 items-center gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-12 xl:gap-7">
              {/* Desktop Left 3 Specialties */}
              <div className="hidden min-w-0 lg:col-span-3 lg:grid lg:grid-cols-1 lg:gap-3.5">
                {leftSpecialties.map((item, idx) => {
                  const isActive = item.id === activeSpecialty.id;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: idx * 0.08 }}
                    >
                      <Tilt3DCard
                        maxTilt={7}
                        glowColor={
                          isActive
                            ? 'rgba(234, 179, 75, 0.24)'
                            : 'rgba(88, 196, 255, 0.16)'
                        }
                        className="rounded-2xl"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialtyId(item.id)}
                          className={`group flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#EAB34B] ${
                            isActive
                              ? 'neuro-panel-active'
                              : 'neuro-panel hover:border-sky-400/45'
                          }`}
                        >
                          <SpecialtyIcon id={item.id} active={isActive} />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-semibold leading-snug sm:text-base ${
                                isActive ? 'text-[#FCE19A]' : 'text-white'
                              }`}
                            >
                              {item.title[locale]}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-400">
                              {item.subtitle[locale]}
                            </div>
                          </div>
                        </button>
                      </Tilt3DCard>
                    </motion.div>
                  );
                })}
              </div>

              {/* Center Interactive Three.js 3D Holographic Brain Chamber (Focus Selector 3) */}
              <div className="w-full min-w-0 max-w-full lg:col-span-6">
                <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-sky-400/24 bg-[radial-gradient(ellipse_at_center,rgba(20,76,178,0.24)_0%,rgba(5,11,24,0.92)_72%)] shadow-[0_24px_70px_-24px_rgba(14,88,210,0.45)] sm:rounded-3xl">
                  {/* Live Three.js WebGL Viewport (zero backdrop-blur over WebGL) */}
                  <HolographicBrain3D
                    activeSpecialty={activeSpecialty}
                    autoOrbit={autoOrbit}
                    exploded={exploded}
                    resetSignal={resetSignal}
                    scrollProgressRef={scrollProgressRef}
                  />

                  {/* Mobile-first clean bottom viewport control dock */}
                  <div className="flex w-full min-w-0 flex-col gap-2.5 border-t border-sky-400/15 bg-[#060E20]/95 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0 truncate text-xs text-slate-400">
                      <span className="text-[#F6C86E]">{copy.brainSection.regionPrefix}:</span>{' '}
                      <span className="font-medium text-slate-200">
                        {activeSpecialty.brainRegionLabel[locale]}
                      </span>
                    </div>

                    <div className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-1.5 sm:flex sm:w-auto sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => setAutoOrbit((v) => !v)}
                        className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:min-h-8 ${
                          autoOrbit
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-[#0C1B38] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {copy.brainSection.controls.autoOrbit}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExploded((v) => !v)}
                        className={`min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:min-h-8 ${
                          exploded
                            ? 'bg-[#EAB34B]/25 text-[#FCE19A]'
                            : 'bg-[#0C1B38] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {copy.brainSection.controls.neuralLayers}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExploded(false);
                          setAutoOrbit(true);
                          setResetSignal((n) => n + 1);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C1B38] text-slate-300 transition-colors hover:text-white sm:h-8 sm:w-8"
                        title={copy.brainSection.controls.resetView}
                        aria-label={copy.brainSection.controls.resetView}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">
                  {copy.brainSection.interactiveHint}
                </p>
              </div>

              {/* Mobile & Tablet (< lg): Touch-optimized 2-column grid (Focus Selector 2) */}
              <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:hidden">
                {SPECIALTIES.map((item) => {
                  const isActive = item.id === activeSpecialty.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSpecialtyId(item.id)}
                      className={`flex min-h-[96px] w-full min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl p-3.5 text-left transition-all duration-150 active:scale-[0.97] ${
                        isActive
                          ? 'neuro-panel-active'
                          : 'neuro-panel hover:border-sky-400/45'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <SpecialtyIcon id={item.id} active={isActive} />
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            isActive ? 'translate-x-0.5 text-[#F6C86E]' : 'text-slate-500'
                          }`}
                        />
                      </div>
                      <span
                        className={`w-full break-words text-[13px] font-semibold leading-snug sm:text-sm ${
                          isActive ? 'text-[#FCE19A]' : 'text-white'
                        }`}
                      >
                        {item.title[locale]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop Right 3 Specialties */}
              <div className="hidden min-w-0 lg:col-span-3 lg:grid lg:grid-cols-1 lg:gap-3.5">
                {rightSpecialties.map((item, idx) => {
                  const isActive = item.id === activeSpecialty.id;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: idx * 0.08 }}
                    >
                      <Tilt3DCard
                        maxTilt={7}
                        glowColor={
                          isActive
                            ? 'rgba(234, 179, 75, 0.24)'
                            : 'rgba(88, 196, 255, 0.16)'
                        }
                        className="rounded-2xl"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialtyId(item.id)}
                          className={`group flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#EAB34B] ${
                            isActive
                              ? 'neuro-panel-active'
                              : 'neuro-panel hover:border-sky-400/45'
                          }`}
                        >
                          <SpecialtyIcon id={item.id} active={isActive} />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-semibold leading-snug sm:text-base ${
                                isActive ? 'text-[#FCE19A]' : 'text-white'
                              }`}
                            >
                              {item.title[locale]}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-400">
                              {item.subtitle[locale]}
                            </div>
                          </div>
                        </button>
                      </Tilt3DCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Active Specialty Clinical Deep-Dive Panel */}
            <motion.div
              key={activeSpecialty.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="neuro-panel mt-5 w-full min-w-0 overflow-hidden rounded-2xl p-4 sm:mt-8 sm:rounded-3xl sm:p-8"
            >
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-5">
                  <div className="flex items-center gap-3">
                    <SpecialtyIcon id={activeSpecialty.id} active />
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white sm:text-2xl">
                        {activeSpecialty.title[locale]}
                      </h3>
                      <p className="truncate text-xs text-[#F6C86E]">
                        {activeSpecialty.brainRegionLabel[locale]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3.5 text-sm leading-relaxed text-slate-300 sm:mt-4">
                    {activeSpecialty.overview[locale]}
                  </p>
                  <div className="mt-4 border-t border-sky-400/15 pt-4 sm:mt-5">
                    <div className="text-xs font-semibold text-sky-300">
                      {copy.brainSection.approachTitle}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                      {activeSpecialty.approach[locale]}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 lg:col-span-4">
                  <h4 className="text-xs font-semibold tracking-wide text-slate-400">
                    {copy.brainSection.symptomsTitle}
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-sm text-slate-200">
                    {activeSpecialty.symptoms[locale].map((symptom) => (
                      <li key={symptom} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EAB34B]" />
                        <span className="leading-relaxed">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex min-w-0 flex-col justify-between lg:col-span-3">
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-slate-400">
                      {copy.brainSection.diagnosticsTitle}
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {activeSpecialty.diagnostics[locale].map((diag) => (
                        <li
                          key={diag}
                          className="border-b border-sky-400/12 pb-2 last:border-b-0"
                        >
                          {diag}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToSection('booking')}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#EAB34B]/60 bg-[#EAB34B]/12 px-4 py-2.5 text-xs font-semibold text-[#FCE19A] transition-colors hover:bg-[#EAB34B] hover:text-[#081020] active:scale-[0.98] sm:mt-6 sm:text-sm"
                  >
                    <span className="truncate">{copy.brainSection.bookForSpecialty}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            SECTION 3: 4-COLUMN QUANTITATIVE IMPACT STRIP + 3D TESTIMONIALS
        ============================================================ */}
        <section id="results" className="relative overflow-x-clip py-12 sm:py-24">
          <div className="mx-auto w-full max-w-[1840px] px-4 sm:px-6 lg:px-10 xl:px-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="mb-8 max-w-3xl sm:mb-10"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {copy.statsSection.heading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:mt-2.5 sm:text-base">
                {copy.statsSection.subheading}
              </p>
            </motion.div>

            {/* Full-width 4-column glowing KPI strip */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55 }}
              className="neuro-panel grid grid-cols-2 divide-x divide-y divide-sky-400/15 overflow-hidden rounded-3xl lg:grid-cols-4 lg:divide-y-0"
            >
              {STATS.map((stat, idx) => {
                const Icon = statIcons[idx] ?? Layers;
                return (
                  <div
                    key={stat.id}
                    className="group flex flex-col items-center px-3.5 py-7 text-center sm:px-6 sm:py-10"
                  >
                    <div
                      className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EAB34B]/45 bg-[#0A1835] text-[#F6C86E] shadow-[inset_0_1px_1px_rgba(255,244,210,0.35),0_0_28px_-6px_rgba(234,179,75,0.42)] transition-transform duration-300 group-hover:scale-105 sm:mb-4 sm:h-20 sm:w-20 sm:rounded-3xl"
                    >
                      <Icon className="h-8 w-8 sm:h-11 sm:w-11" strokeWidth={1.65} />
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-white sm:text-4xl xl:text-[42px]">
                      <AnimatedCounter
                        value={stat.value}
                        suffix={stat.suffix}
                        durationMs={3000}
                      />
                    </div>
                    <div className="mt-1.5 text-xs font-medium text-slate-200 sm:mt-2 sm:text-sm">
                      {stat.label[locale]}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                      {stat.context[locale]}
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Continuously Revolving 3D Official Certificates Showcase */}
            <Certificates3DShowcase locale={locale} />
          </div>
        </section>

        {/* ============================================================
            SECTION 4: DUAL 3D EDITORIAL MEDIA CARDS
        ============================================================ */}
        <section id="media" className="relative overflow-x-clip py-8 sm:py-16">
          <div className="mx-auto w-full max-w-[1840px] px-4 sm:px-6 lg:px-10 xl:px-14">
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:gap-8">
              {/* Left Card: Doktor haqida (YouTube video introduction) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
              >
                <Tilt3DCard
                  maxTilt={5}
                  glowColor="rgba(234, 179, 75, 0.2)"
                  className="rounded-3xl"
                >
                  <button
                    type="button"
                    onClick={() => setAboutModalOpen(true)}
                    className="group relative flex min-h-[240px] w-full items-end overflow-hidden rounded-3xl border border-[#EAB34B]/35 bg-[#071226] text-left transition-all duration-200 hover:border-[#EAB34B]/75 active:scale-[0.99] sm:min-h-[300px] xl:min-h-[340px]"
                  >
                    <img
                      src={ASSETS.aboutVideoCover}
                      alt={copy.mediaSection.aboutTitle}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover object-[center_14%] transition-transform duration-500 group-hover:scale-105 sm:left-[18%] sm:w-[82%] sm:object-[center_18%]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(95deg, #050B18 0%, rgba(5,11,24,0.95) 36%, rgba(5,11,24,0.58) 58%, rgba(5,11,24,0.12) 86%, rgba(5,11,24,0.34) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(5,11,24,0.22) 0%, transparent 40%, rgba(5,11,24,0.88) 100%)',
                      }}
                    />
                    <div className="relative z-10 flex w-full items-center gap-4 p-5 sm:gap-5 sm:p-8">
                      <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-[#F6C86E] bg-[#050B18]/80 text-[#F6C86E] shadow-[0_0_24px_rgba(234,179,75,0.42)] transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
                        <Play className="h-5 w-5 translate-x-0.5 fill-[#F6C86E] sm:h-7 sm:w-7" />
                      </div>
                      <div className="min-w-0 max-w-sm">
                        <h3 className="text-xl font-bold text-white drop-shadow-[0_2px_12px_rgba(5,11,24,0.8)] sm:text-3xl">
                          {copy.mediaSection.aboutTitle}
                        </h3>
                        <p className="mt-1 text-xs text-slate-200 sm:text-sm">
                          {copy.mediaSection.aboutSubtitle}
                        </p>
                        <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F6C86E] sm:mt-3">
                          <span>{copy.mediaSection.aboutAction}</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </button>
                </Tilt3DCard>
              </motion.div>

              {/* Right Card: Ilmiy faoliyat (Synapse artwork + research archive) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.08 }}
              >
                <Tilt3DCard
                  maxTilt={5}
                  glowColor="rgba(56, 189, 248, 0.2)"
                  className="rounded-3xl"
                >
                  <button
                    type="button"
                    onClick={() => setScienceModalOpen(true)}
                    className="group relative flex min-h-[220px] w-full items-end overflow-hidden rounded-3xl border border-sky-400/25 bg-[#071226] text-left transition-all duration-200 hover:border-[#EAB34B]/70 active:scale-[0.99] sm:min-h-[300px] xl:min-h-[340px]"
                  >
                    <img
                      src={ASSETS.scientificSynapse}
                      alt={copy.mediaSection.scienceTitle}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050B18] via-[#050B18]/78 to-transparent" />
                    <div className="relative z-10 flex w-full items-end justify-between gap-4 p-5 sm:gap-5 sm:p-8">
                      <div className="min-w-0 max-w-md">
                        <div className="mb-1.5 font-mono text-xs tabular-nums text-sky-300 sm:mb-2">
                          30+ · EPNS · EAN · WSO
                        </div>
                        <h3 className="text-xl font-bold text-white sm:text-3xl">
                          {copy.mediaSection.scienceTitle}
                        </h3>
                        <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                          {copy.mediaSection.scienceSubtitle}
                        </p>
                        <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F6C86E] sm:mt-3">
                          <span>{copy.mediaSection.scienceAction}</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EAB34B]/50 bg-[#050B18]/70 text-[#F6C86E] transition-transform duration-200 group-hover:translate-x-1 sm:h-12 sm:w-12">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                </Tilt3DCard>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION 5: ONLINE APPOINTMENT BOOKING & DIRECT CONTACT
        ============================================================ */}
        <BookingSection
          locale={locale}
          selectedSpecialty={selectedSpecialtyId}
          onSelectSpecialty={setSelectedSpecialtyId}
        />
      </main>

      {/* QUIET FOOTER (extra bottom padding on mobile to clear thumb bar) */}
      <footer className="relative z-10 border-t border-sky-400/12 bg-[#040914] pb-24 pt-10 md:pb-10">
        <div className="mx-auto flex w-full max-w-[1840px] flex-col items-center justify-between gap-5 px-4 sm:flex-row sm:px-6 lg:px-10 xl:px-14">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
            <BrandBrainMark className="h-8 w-8" />
            <span>Dr. Zokhidjon Ismailov · DoctorZi</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-400">
            <span>{copy.footer.location}</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 {copy.footer.rights}</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-sky-400/15 bg-[#071124] p-1">
            {LOCALES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLocale(item.code)}
                className={`min-h-8 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  locale === item.code
                    ? 'bg-[#EAB34B] text-[#081020]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ERGONOMIC MOBILE THUMB-ZONE ACTION BAR (< 10% viewport height) */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#EAB34B]/20 bg-[#050B18]/95 px-3 pt-2.5 md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2.5">
          <a
            href={CLINIC_CONTACTS.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.booking.whatsapp}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EAB34B]/45 bg-[#0A1733] text-[#F6C86E] active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
          </a>

          <button
            type="button"
            onClick={() => scrollToSection('booking')}
            className="gold-cta flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold whitespace-nowrap active:scale-[0.98]"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{copy.nav.bookCta}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>

          <a
            href={CLINIC_CONTACTS.telegramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.booking.telegram}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EAB34B]/45 bg-[#0A1733] text-[#F6C86E] active:scale-95"
          >
            <Send className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Interactive Modals (Bottom Sheets on Mobile) */}
      <AboutDoctorModal
        open={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        locale={locale}
        onBookClick={() => scrollToSection('booking')}
      />
      <ScientificActivityModal
        open={scienceModalOpen}
        onClose={() => setScienceModalOpen(false)}
        locale={locale}
      />
    </div>
  );
}
