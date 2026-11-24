import type { SpecialtyId } from '../data/neurologyData';

export type OperationCategory = 'operation' | 'video_eeg' | 'rehabilitation' | 'consultation';
export type OperationPriority = 'routine' | 'urgent' | 'critical';
export type OperationStatus = 'scheduled' | 'preparing' | 'completed' | 'cancelled';
export type BookingStatus = 'new' | 'contacted' | 'confirmed' | 'converted' | 'cancelled';

export interface OperationRecord {
  id: string;
  patientName: string;
  parentPhone: string;
  childAge: string;
  procedureTitle: string;
  category: OperationCategory;
  specialtyId: SpecialtyId;
  date: string; // YYYY-MM-DD (Asia/Tashkent)
  startTime: string; // HH:MM
  durationMinutes: number;
  room: string;
  priority: OperationPriority;
  status: OperationStatus;
  notes: string;
  remindBeforeMinutes: number[];
  ownerId?: string;
}

export interface BookingCrmRecord {
  id: string;
  code: string;
  parentName: string;
  phone: string;
  childAge: string;
  specialtyId: SpecialtyId;
  format: 'clinic' | 'online';
  date: string;
  timeSlot: string;
  notes: string;
  status: BookingStatus;
  createdAtMs?: number;
}

export interface CrmSettingsData {
  dailyBriefingTime: string; // HH:MM
  eveningPreviewTime: string; // HH:MM
  weeklyDigestDay: number; // 0..6
  dailyRemindersEnabled: boolean;
  preOpOffsets: number[]; // e.g. [60, 15]
  timezone: string; // Asia/Tashkent
}

export const DEFAULT_CRM_SETTINGS: CrmSettingsData = {
  dailyBriefingTime: '08:00',
  eveningPreviewTime: '20:00',
  weeklyDigestDay: 0,
  dailyRemindersEnabled: true,
  preOpOffsets: [60, 15],
  timezone: 'Asia/Tashkent',
};

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Returns current date/time components in Asia/Tashkent (UTC+5).
 */
export function getTashkentNow(baseDate = new Date()): {
  dateStr: string;
  timeStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  totalMinutes: number;
} {
  const shifted = new Date(baseDate.getTime() + TASHKENT_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
    dayOfWeek: shifted.getUTCDay(),
    totalMinutes: hour * 60 + minute,
  };
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function getStartOfWeekMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addDaysToDateStr(dateStr, diffToMonday);
}

export function getWeekDateStrings(anchorDateStr: string): string[] {
  const monday = getStartOfWeekMonday(anchorDateStr);
  return Array.from({ length: 7 }, (_, i) => addDaysToDateStr(monday, i));
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function sortOperationsChronologically(ops: OperationRecord[]): OperationRecord[] {
  return [...ops].sort((a, b) => {
    const cmpDate = a.date.localeCompare(b.date);
    if (cmpDate !== 0) return cmpDate;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function getDayLabelUz(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const months = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
    'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
  ];
  return `${days[dt.getUTCDay()]}, ${d} ${months[dt.getUTCMonth()]}`;
}

const PRIORITY_ICON: Record<OperationPriority, string> = {
  routine: '🟢',
  urgent: '🟡',
  critical: '🔴',
};

const STATUS_LABEL_UZ: Record<OperationStatus, string> = {
  scheduled: 'Rejalashtirilgan',
  preparing: 'Tayyorlanmoqda',
  completed: 'Bajarildi',
  cancelled: 'Bekor qilindi',
};

const CATEGORY_LABEL_UZ: Record<OperationCategory, string> = {
  operation: 'Operatsiya',
  video_eeg: 'Video-EEG',
  rehabilitation: 'Reabilitatsiya',
  consultation: 'Konsultatsiya',
};

/**
 * Formats a clean, high-readability daily schedule message for Telegram Bot.
 */
export function formatDailyCalendarMessage(
  ops: OperationRecord[],
  targetDateStr: string,
  titlePrefix = '📅 KUNLIK OPERATSIYALAR KALENDARI'
): string {
  const dayOps = sortOperationsChronologically(
    ops.filter((o) => o.date === targetDateStr && o.status !== 'cancelled')
  );
  const header = `${titlePrefix}\n🗓 ${getDayLabelUz(targetDateStr)} (${targetDateStr})\n━━━━━━━━━━━━━━━━━━`;

  if (dayOps.length === 0) {
    return `${header}\n\n✅ Ushbu kunga rejalashtirilgan operatsiya yoki muolajalar yo‘q.`;
  }

  const lines = dayOps.map((op, idx) => {
    const endMins = parseTimeToMinutes(op.startTime) + op.durationMinutes;
    const endH = String(Math.floor(endMins / 60) % 24).padStart(2, '0');
    const endM = String(endMins % 60).padStart(2, '0');
    return [
      `${idx + 1}. ${PRIORITY_ICON[op.priority]} ⏰ ${op.startTime}–${endH}:${endM} · ${CATEGORY_LABEL_UZ[op.category]}`,
      `   👤 Bemor: ${op.patientName} (${op.childAge})`,
      `   🏥 Amaliyot: ${op.procedureTitle}`,
      `   🚪 Xona: ${op.room} | Holat: ${STATUS_LABEL_UZ[op.status]}`,
      `   📞 Tel: ${op.parentPhone}`,
      op.notes ? `   📝 Izoh: ${op.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return `${header}\nJami: ${dayOps.length} ta rejalashtirilgan amaliyot\n\n${lines.join('\n\n')}`;
}

/**
 * Formats a 7-day weekly operations overview message for Telegram Bot.
 */
export function formatWeeklyCalendarMessage(
  ops: OperationRecord[],
  startDateStr: string
): string {
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(startDateStr, i));
  const endDateStr = days[days.length - 1];
  const activeOps = sortOperationsChronologically(
    ops.filter((o) => o.date >= startDateStr && o.date <= endDateStr && o.status !== 'cancelled')
  );

  const header = `📆 HAFTALIK OPERATSIYALAR KALENDARI\n🗓 ${startDateStr} — ${endDateStr}\n━━━━━━━━━━━━━━━━━━\nJami haftalik reja: ${activeOps.length} ta`;

  if (activeOps.length === 0) {
    return `${header}\n\n✅ Kelgusi 7 kun ichida rejalashtirilgan operatsiyalar kiritilmagan.`;
  }

  const sections = days.map((d) => {
    const list = activeOps.filter((o) => o.date === d);
    if (list.length === 0) return null;
    const items = list.map(
      (o) =>
        `  • ${PRIORITY_ICON[o.priority]} ${o.startTime} — ${o.patientName} (${o.childAge})\n    ${o.procedureTitle} [${o.room}]`
    );
    return `📌 ${getDayLabelUz(d)} (${list.length} ta)\n${items.join('\n')}`;
  }).filter(Boolean);

  return `${header}\n\n${sections.join('\n\n')}`;
}

/**
 * Formats the immediate next upcoming operation card for Telegram Bot.
 */
export function formatNextOperationMessage(
  ops: OperationRecord[],
  now = getTashkentNow()
): string {
  const upcoming = sortOperationsChronologically(
    ops.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'completed') return false;
      if (o.date > now.dateStr) return true;
      if (o.date === now.dateStr) {
        return parseTimeToMinutes(o.startTime) >= now.totalMinutes;
      }
      return false;
    })
  );

  const next = upcoming[0];
  if (!next) {
    return `🏥 KEYINGI OPERATSIYA\n━━━━━━━━━━━━━━━━━━\n✅ Hozircha navbatdagi rejalashtirilgan operatsiya yo‘q.`;
  }

  const countdown =
    next.date === now.dateStr
      ? (() => {
          const diff = parseTimeToMinutes(next.startTime) - now.totalMinutes;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          return h > 0 ? `${h} soat ${m} daqiqadan so‘ng` : `${m} daqiqadan so‘ng`;
        })()
      : `${getDayLabelUz(next.date)}`;

  return [
    `🏥 KEYINGI OPERATSIYA (${countdown})`,
    `━━━━━━━━━━━━━━━━━━`,
    `${PRIORITY_ICON[next.priority]} Amaliyot: ${next.procedureTitle}`,
    `🗓 Sana va vaqt: ${next.date} · ⏰ ${next.startTime} (${next.durationMinutes} daq)`,
    `👤 Bemor: ${next.patientName} (${next.childAge})`,
    `🚪 Xona: ${next.room}`,
    `📞 Ota-ona telefoni: ${next.parentPhone}`,
    next.notes ? `📝 Tayyorgarlik izohi: ${next.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Formats an automated pre-operation Telegram reminder fired X minutes before start.
 */
export function formatPreOpReminderMessage(op: OperationRecord, minutesBefore: number): string {
  return [
    `🔔 OPERATSIYA ESLATMASI — ${minutesBefore} DAQIQA QOLDI!`,
    `━━━━━━━━━━━━━━━━━━`,
    `${PRIORITY_ICON[op.priority]} ${op.procedureTitle}`,
    `⏰ Boshlanish vaqti: ${op.startTime} (${op.durationMinutes} daq)`,
    `👤 Bemor: ${op.patientName} (${op.childAge})`,
    `🚪 Xona: ${op.room}`,
    `📞 Aloqa: ${op.parentPhone}`,
    op.notes ? `📝 Izoh: ${op.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeIcsText(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generates an RFC-5545 .ics calendar file with native VALARM reminders so
 * the doctor can import all operations into iOS / Android / Google Calendar in 1 tap.
 */
export function generateOperationsIcs(ops: OperationRecord[]): string {
  const active = sortOperationsChronologically(
    ops.filter((o) => o.status !== 'cancelled')
  );
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = active.map((op) => {
    const [y, m, d] = op.date.split('-').map(Number);
    const [hh, mm] = op.startTime.split(':').map(Number);
    // Convert Asia/Tashkent (UTC+5) wall clock to UTC for universal calendar accuracy
    const startUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1, (hh || 9) - 5, mm || 0));
    const endUtc = new Date(startUtc.getTime() + op.durationMinutes * 60 * 1000);
    const fmt = (dt: Date) =>
      dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const alarms = (op.remindBeforeMinutes.length > 0 ? op.remindBeforeMinutes : [60, 15])
      .slice(0, 4)
      .map(
        (mins) =>
          [
            'BEGIN:VALARM',
            `TRIGGER:-PT${mins}M`,
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeIcsText(`${op.procedureTitle} — ${op.patientName} (${mins} daqiqa qoldi)`)}`,
            'END:VALARM',
          ].join('\r\n')
      )
      .join('\r\n');

    const desc = [
      `Bemor: ${op.patientName} (${op.childAge})`,
      `Telefon: ${op.parentPhone}`,
      `Xona: ${op.room}`,
      `Holat: ${STATUS_LABEL_UZ[op.status]}`,
      op.notes ? `Izoh: ${op.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return [
      'BEGIN:VEVENT',
      `UID:${op.id}@drzokhidjon.uz`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(startUtc)}`,
      `DTEND:${fmt(endUtc)}`,
      `SUMMARY:${escapeIcsText(`${op.procedureTitle} — ${op.patientName}`)}`,
      `LOCATION:${escapeIcsText(`${op.room}, Farobiy 415, Toshkent`)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      alarms,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DoctorZi Pediatric Neurology CRM//Operations Calendar//UZ',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Dr. Zokhidjon — Operatsiyalar Kalendari',
    'X-WR-TIMEZONE:Asia/Tashkent',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
