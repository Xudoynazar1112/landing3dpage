import type { SpecialtyId } from '../data/neurologyData';

export function BrandBrainMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17.5 8.5C15.2 6.8 11.4 7.3 9.7 9.9C7.3 10.6 5.8 13.1 6.5 15.6C5.4 17.5 5.9 20.1 7.8 21.4C8.1 24 10.4 25.9 13 25.8C14.2 27.1 16.2 27.4 17.5 26.4V8.5Z"
        stroke="url(#goldMark)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 8.5C20.8 6.8 24.6 7.3 26.3 9.9C28.7 10.6 30.2 13.1 29.5 15.6C30.6 17.5 30.1 20.1 28.2 21.4C27.9 24 25.6 25.9 23 25.8C21.8 27.1 19.8 27.4 18.5 26.4V8.5Z"
        stroke="url(#goldMark)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 13.5C13.8 13.5 14.8 14.5 14.8 15.8M11.2 18.8C12.8 18.4 14.3 19.3 14.8 20.8M23.5 13.5C22.2 13.5 21.2 14.5 21.2 15.8M24.8 18.8C23.2 18.4 21.7 19.3 21.2 20.8M18 26.5V30.5"
        stroke="url(#goldMark)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="goldMark" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCE19A" />
          <stop offset="0.55" stopColor="#EAB34B" />
          <stop offset="1" stopColor="#C4821D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SpecialtyIcon({
  id,
  active,
}: {
  id: SpecialtyId;
  active?: boolean;
}) {
  const strokeMain = active ? '#FDE6A8' : '#7BC4FF';
  const accent = active ? '#EAB34B' : '#38BDF8';

  switch (id) {
    case 'epilepsy':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path
            d="M4 21H10L13 14L16.5 29L20.5 9L24 27L27.5 16L30.5 21H36"
            stroke={active ? '#F6C86E' : '#F3B85A'}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20.5" cy="9" r="2" fill={accent} />
        </svg>
      );
    case 'autism':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path
            d="M12 11H17.5C17.5 9.2 18.9 7.8 20.7 7.8C22.5 7.8 23.9 9.2 23.9 11H28V16.5C29.8 16.5 31.2 17.9 31.2 19.7C31.2 21.5 29.8 22.9 28 22.9V28.5H22.8C22.8 26.8 21.4 25.4 19.7 25.4C18 25.4 16.6 26.8 16.6 28.5H12V22.9C13.7 22.9 15.1 21.5 15.1 19.7C15.1 17.9 13.7 16.5 12 16.5V11Z"
            stroke={strokeMain}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'sleep':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path
            d="M27.8 24.8C25.9 27.6 22.7 29.5 19 29.5C13.2 29.5 8.5 24.8 8.5 19C8.5 14.3 11.6 10.3 15.9 9C14.7 10.9 14 13.2 14 15.6C14 21.8 19 26.8 25.2 26.8C26.1 26.8 27 26.7 27.8 24.8Z"
            stroke={strokeMain}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M23 11H27.5L23 16H27.5M29 17.5H32.5L29 21H32.5"
            stroke={accent}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'developmental':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path
            d="M19.5 11C16.2 11 13.8 13.1 13.5 16C11.1 16.6 9.5 18.8 10 21.3C10.4 23.6 12.4 25.3 14.8 25.3H25.2C28 25.3 30.2 23.1 30.2 20.3C30.2 17.9 28.5 15.9 26.2 15.4C25.5 12.8 22.8 11 19.5 11Z"
            stroke={strokeMain}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M20 29.5V19.5M20 19.5L16.5 16.5M20 22.5L23.5 19.5"
            stroke={accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'migraine':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path
            d="M14.5 29V25.5C11.8 23.7 10.2 20.6 10.2 17.2C10.2 11.9 14.5 7.8 19.9 7.8C25.2 7.8 29.2 11.7 29.2 16.8L31.2 20.5L28.8 21.5V25.2C28.8 27.1 27.3 28.5 25.4 28.5H23.2V31"
            stroke={strokeMain}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.2 12.2L17.4 18.1H21L18.8 23.5L23.5 16.9H19.9L21.2 12.2Z"
            fill={accent}
          />
        </svg>
      );
    case 'adhd':
      return (
        <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
          <circle cx="20" cy="20" r="10.5" stroke={strokeMain} strokeWidth="1.8" strokeDasharray="4 3" />
          <circle cx="20" cy="20" r="5.5" stroke={accent} strokeWidth="1.8" />
          <circle cx="20" cy="20" r="2" fill={strokeMain} />
          <path
            d="M20 6V10M20 30V34M6 20H10M30 20H34"
            stroke={strokeMain}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
