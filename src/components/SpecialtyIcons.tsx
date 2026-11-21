import { ASSETS, type SpecialtyId } from '../data/neurologyData';

/**
 * Official drzokhidjon.uz circular emblem rendered crisply on a luminous medallion
 * for optimal contrast on the midnight sapphire navbar and footer.
 */
export function BrandBrainMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F4F8FC] p-[2px] ring-1 ring-[#EAB34B]/60 shadow-[0_0_16px_rgba(56,189,248,0.28)] ${className}`}
    >
      <img
        src={ASSETS.logo}
        alt="Dr. Zokhidjon Ismailov logo"
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-full object-contain"
      />
    </span>
  );
}

/**
 * Larger, richly layered 3D holographic neurology emblem artworks for the 6
 * pediatric neurology specialty cards flanking the 3D brain chamber.
 */
export function SpecialtyIcon({
  id,
  active,
  sizeClass = 'h-12 w-12 sm:h-14 sm:w-14 xl:h-[60px] xl:w-[60px]',
}: {
  id: SpecialtyId;
  active?: boolean;
  sizeClass?: string;
}) {
  const uid = `${id}-${active ? 'a' : 'i'}`;
  const ringTop = active ? '#FDE6A8' : '#7DD3FC';
  const ringBot = active ? '#C9851E' : '#1E5EB8';
  const coreGlow = active ? 'rgba(234,179,75,0.42)' : 'rgba(56,189,248,0.34)';
  const strokePrimary = active ? '#FFF3CE' : '#CBE9FF';
  const strokeAccent = active ? '#F6C86E' : '#38BDF8';
  const strokeWarm = active ? '#FFB443' : '#F6C86E';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${sizeClass}`}
      style={{
        background: active
          ? 'radial-gradient(circle at 30% 24%, rgba(250, 210, 120, 0.28) 0%, rgba(18, 37, 74, 0.96) 62%, rgba(7, 15, 34, 1) 100%)'
          : 'radial-gradient(circle at 30% 24%, rgba(56, 189, 248, 0.24) 0%, rgba(12, 28, 60, 0.95) 62%, rgba(6, 14, 30, 1) 100%)',
        boxShadow: active
          ? 'inset 0 1px 1px rgba(255,244,210,0.45), 0 0 22px -4px rgba(234,179,75,0.45)'
          : 'inset 0 1px 1px rgba(173,222,255,0.3), 0 10px 22px -8px rgba(2,10,28,0.85)',
        border: active
          ? '1px solid rgba(246, 200, 110, 0.65)'
          : '1px solid rgba(94, 174, 255, 0.34)',
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" fill="none" className="h-[88%] w-[88%]">
        <defs>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreGlow} />
            <stop offset="100%" stopColor="rgba(5,11,24,0)" />
          </radialGradient>
          <linearGradient id={`ring-${uid}`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor={ringTop} />
            <stop offset="1" stopColor={ringBot} />
          </linearGradient>
          <linearGradient id={`fill-${uid}`} x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor={active ? '#FFE8A6' : '#80D8FF'} stopOpacity="0.95" />
            <stop offset="1" stopColor={active ? '#D98A1C' : '#1D6FE2'} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Ambient holographic core halo */}
        <circle cx="32" cy="32" r="26" fill={`url(#glow-${uid})`} />
        <circle
          cx="32"
          cy="32"
          r="25"
          stroke={`url(#ring-${uid})`}
          strokeWidth="1.2"
          strokeOpacity="0.45"
          strokeDasharray="3 3"
        />

        {id === 'epilepsy' && (
          <>
            {/* Neural EEG holographic disc + golden firing spike */}
            <path
              d="M11 33H18.5L22.5 23L27.5 45L33 15L38 41L42.5 27L46 33H53"
              stroke={`url(#fill-${uid})`}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="33" cy="15" r="3.6" fill={strokeWarm} />
            <circle cx="33" cy="15" r="7" stroke={strokeWarm} strokeOpacity="0.4" strokeWidth="1.4" />
            <circle cx="27.5" cy="45" r="2.6" fill={strokeAccent} />
            <circle cx="42.5" cy="27" r="2.4" fill={strokePrimary} />
          </>
        )}

        {id === 'autism' && (
          <>
            {/* Illuminated 3D neural puzzle core with glowing synaptic bridges */}
            <path
              d="M18 19H26.5C26.5 15.8 29 13.5 32 13.5C35 13.5 37.5 15.8 37.5 19H45V27.5C48 27.5 50.5 29.8 50.5 32.8C50.5 35.8 48 38.2 45 38.2V46H36.8C36.8 43 34.4 40.6 31.4 40.6C28.4 40.6 26 43 26 46H18V38C21 38 23.4 35.6 23.4 32.6C23.4 29.6 21 27.2 18 27.2V19Z"
              fill={`url(#fill-${uid})`}
              fillOpacity="0.22"
              stroke={`url(#fill-${uid})`}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="31" r="4.2" fill={strokeWarm} />
            <path
              d="M32 23V26.5M32 35.5V39M24.5 31H27.8M36.2 31H39.5"
              stroke={strokePrimary}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {id === 'sleep' && (
          <>
            {/* Sculpted glowing crescent moon + melatonin wave & star cluster */}
            <path
              d="M42.8 39.2C39.6 43.8 34.2 46.8 28.2 46.8C18.8 46.8 11.2 39.2 11.2 29.8C11.2 22.1 16.3 15.7 23.3 13.6C21.3 16.6 20.1 20.3 20.1 24.3C20.1 34.3 28.2 42.4 38.2 42.4C39.8 42.4 41.3 41.2 42.8 39.2Z"
              fill={`url(#fill-${uid})`}
              fillOpacity="0.28"
              stroke={`url(#fill-${uid})`}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path
              d="M36 16H43L36 23.5H43.5M45 26.5H50.5L45 32H50.5"
              stroke={strokeWarm}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="31" cy="18" r="2" fill={strokePrimary} />
            <circle cx="48" cy="16" r="1.7" fill={strokeAccent} />
          </>
        )}

        {id === 'developmental' && (
          <>
            {/* Glowing blossoming brain silhouette with rising neural growth tree */}
            <path
              d="M31.5 15.5C25.8 15.5 21.6 19.1 21 24C16.8 25 14 28.7 14.8 33C15.5 37.1 19 40 23.2 40H40.8C45.6 40 49.4 36.2 49.4 31.4C49.4 27.3 46.5 23.8 42.5 23C41.3 18.6 37 15.5 31.5 15.5Z"
              fill={`url(#fill-${uid})`}
              fillOpacity="0.22"
              stroke={`url(#fill-${uid})`}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M32 48.5V28M32 34L25 27.5M32 31.5L39 25.5"
              stroke={strokeWarm}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="24" r="3" fill={strokeWarm} />
            <circle cx="24" cy="27" r="2.4" fill={strokePrimary} />
            <circle cx="40" cy="25" r="2.4" fill={strokePrimary} />
          </>
        )}

        {id === 'migraine' && (
          <>
            {/* Neuro-cranial profile with concentric pulse waves & electric-gold lightning */}
            <path
              d="M22.5 47V41.5C18 38.6 15.2 33.6 15.2 28C15.2 19.5 22.1 12.8 30.8 12.8C39.2 12.8 45.6 19.1 45.6 27.2L49 33.2L45 34.8V40.8C45 43.9 42.6 46.2 39.5 46.2H36V50"
              fill={`url(#fill-${uid})`}
              fillOpacity="0.18"
              stroke={`url(#fill-${uid})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M33.2 18.2L26.8 28.4H32.6L29.2 38.2L37.8 26.2H31.8L33.2 18.2Z"
              fill={strokeWarm}
            />
            <circle cx="32" cy="28" r="10" stroke={strokeWarm} strokeOpacity="0.38" strokeWidth="1.4" />
          </>
        )}

        {id === 'adhd' && (
          <>
            {/* Precision 3D gyroscopic neuro-focus orbits + golden focal core */}
            <ellipse
              cx="32"
              cy="32"
              rx="19"
              ry="8.5"
              transform="rotate(-32 32 32)"
              stroke={`url(#fill-${uid})`}
              strokeWidth="2.2"
            />
            <ellipse
              cx="32"
              cy="32"
              rx="19"
              ry="8.5"
              transform="rotate(32 32 32)"
              stroke={strokeAccent}
              strokeOpacity="0.8"
              strokeWidth="2.2"
            />
            <circle cx="32" cy="32" r="6" fill={strokeWarm} />
            <circle cx="32" cy="32" r="10.5" stroke={strokePrimary} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="3 3" />
            <circle cx="46" cy="23" r="2.6" fill={strokePrimary} />
            <circle cx="18" cy="41" r="2.6" fill={strokeAccent} />
          </>
        )}
      </svg>
    </span>
  );
}
