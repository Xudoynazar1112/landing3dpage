import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  DEFAULT_CRM_SETTINGS,
  addDaysToDateStr,
  formatDailyCalendarMessage,
  formatNextOperationMessage,
  formatPreOpReminderMessage,
  formatWeeklyCalendarMessage,
  generateOperationsIcs,
  getTashkentNow,
  parseTimeToMinutes,
  type CrmSettingsData,
  type OperationRecord,
} from './src/lib/calendarUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ADMIN_EMAIL = 'saparovxudoynazar@gmail.com';

// Read projectId from firebase-applet-config.json for cryptographic ID token audience check
let FIREBASE_PROJECT_ID = '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { projectId?: string };
    FIREBASE_PROJECT_ID = parsed.projectId ?? '';
  }
} catch {
  FIREBASE_PROJECT_ID = '';
}

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// ---------------------------------------------------------------------------
// Server-Side In-Memory Schedule Cache (Synced by authenticated Doctor CRM)
// Secrets stay strictly in process.env — never exposed to browser clients
// ---------------------------------------------------------------------------
interface ReminderLogEntry {
  id: string;
  sentAt: string;
  type: 'daily_briefing' | 'evening_preview' | 'pre_op' | 'weekly_digest' | 'manual_push' | 'booking_alert';
  summary: string;
  deliveredToTelegram: boolean;
}

let syncedOperations: OperationRecord[] = [];
let syncedSettings: CrmSettingsData = { ...DEFAULT_CRM_SETTINGS };
const sentReminderKeys = new Set<string>();
const reminderLogs: ReminderLogEntry[] = [];
let botInfoCache: { username: string; firstName: string } | null = null;
let lastPollOffset = 0;

function pushReminderLog(
  type: ReminderLogEntry['type'],
  summary: string,
  deliveredToTelegram: boolean
) {
  reminderLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sentAt: new Date().toISOString(),
    type,
    summary,
    deliveredToTelegram,
  });
  if (reminderLogs.length > 40) {
    reminderLogs.length = 40;
  }
}

// ---------------------------------------------------------------------------
// Telegram Bot API Helpers (Pure fetch, zero vulnerable third-party bot deps)
// ---------------------------------------------------------------------------
function getBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function getDoctorChatId(): string {
  return (process.env.TELEGRAM_DOCTOR_CHAT_ID || '').trim();
}

const TELEGRAM_ONE_CLICK_KEYBOARD = {
  keyboard: [
    [{ text: '📅 Bugungi kalendar' }, { text: '📆 Haftalik kalendar' }],
    [{ text: '🏥 Keyingi operatsiya' }, { text: '📥 Kalendar (.ics)' }],
    [{ text: '🔔 Eslatma holati' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const TELEGRAM_INLINE_CALENDAR_BUTTONS = {
  inline_keyboard: [
    [
      { text: '📅 Bugun', callback_data: 'cal_today' },
      { text: '📆 Haftalik', callback_data: 'cal_week' },
    ],
    [
      { text: '🏥 Keyingi operatsiya', callback_data: 'cal_next' },
      { text: '📥 .ICS yuklash', callback_data: 'cal_ics' },
    ],
  ],
};

async function telegramApi(method: string, payload: Record<string, unknown>) {
  const token = getBotToken();
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return (await res.json()) as { ok?: boolean; result?: unknown };
}

async function sendTelegramText(
  chatId: string,
  text: string,
  withInlineButtons = true
): Promise<boolean> {
  const token = getBotToken();
  if (!token || !chatId) return false;
  try {
    const res = await telegramApi('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: withInlineButtons
        ? TELEGRAM_INLINE_CALENDAR_BUTTONS
        : TELEGRAM_ONE_CLICK_KEYBOARD,
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

async function sendTelegramIcsDocument(chatId: string): Promise<boolean> {
  const token = getBotToken();
  if (!token || !chatId) return false;
  try {
    const icsText = generateOperationsIcs(syncedOperations);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append(
      'caption',
      '📥 Dr. Zokhidjon — Operatsiyalar Kalendari (.ics)\nBir bosish bilan telefoningiz kalendariga (iPhone / Android / Google Calendar) qo‘shing.'
    );
    form.append(
      'document',
      new Blob([icsText], { type: 'text/calendar;charset=utf-8' }),
      `doctorzi-calendar-${getTashkentNow().dateStr}.ics`
    );

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

function formatReminderStatusText(): string {
  const s = syncedSettings;
  const offsets = s.preOpOffsets.map((m) => `${m} daq`).join(', ');
  return [
    `🔔 AVTOMATIK ESLATMALAR HOLATI`,
    `━━━━━━━━━━━━━━━━━━`,
    `Holat: ${s.dailyRemindersEnabled ? '✅ Yoqilgan' : '⏸ Pauza qilingan'}`,
    `🌅 Ertalabki kunlik reja: ${s.dailyBriefingTime} (${s.timezone})`,
    `🌙 Kechki ertangi reja: ${s.eveningPreviewTime}`,
    `⏱ Operatsiyadan oldin: ${offsets || '60 daq, 15 daq'}`,
    `📋 Sinxronlangan operatsiyalar: ${syncedOperations.filter((o) => o.status !== 'cancelled').length} ta`,
  ].join('\n');
}

async function handleIncomingTelegramUpdate(update: {
  message?: { chat?: { id?: number | string }; text?: string };
  callback_query?: { id?: string; message?: { chat?: { id?: number | string } }; data?: string };
}) {
  const configuredChatId = getDoctorChatId();

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat?.id ?? '');
    if (cb.id) {
      await telegramApi('answerCallbackQuery', { callback_query_id: cb.id });
    }
    if (!chatId || !configuredChatId || chatId !== configuredChatId) return;

    const now = getTashkentNow();
    if (cb.data === 'cal_today') {
      await sendTelegramText(chatId, formatDailyCalendarMessage(syncedOperations, now.dateStr));
    } else if (cb.data === 'cal_week') {
      await sendTelegramText(chatId, formatWeeklyCalendarMessage(syncedOperations, now.dateStr));
    } else if (cb.data === 'cal_next') {
      await sendTelegramText(chatId, formatNextOperationMessage(syncedOperations, now));
    } else if (cb.data === 'cal_ics') {
      await sendTelegramIcsDocument(chatId);
    }
    return;
  }

  const msg = update.message;
  if (!msg?.chat?.id || !msg.text) return;
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  // If doctor chat ID is not configured yet, safely show chat ID on /start without leaking clinical data
  if (!configuredChatId) {
    if (text.startsWith('/start')) {
      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: `👋 Assalomu alaykum! DoctorZi CRM Bot ishga tayyor.\n\nSizning Chat ID raqamingiz: ${chatId}\n\nUshbu raqamni AI Studio Settings → Secrets bo‘limida TELEGRAM_DOCTOR_CHAT_ID sifatida saqlang — shundan so‘ng kalendar va kunlik eslatmalar faollashadi.`,
      });
    }
    return;
  }

  // Strictly confine clinical operations data to the authorized Doctor Chat ID
  if (chatId !== configuredChatId) {
    return;
  }

  const now = getTashkentNow();

  if (text.startsWith('/start')) {
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: `👨‍⚕️ Dr. Zokhidjon Ismailov — Operatsiyalar Kalendari va CRM Bot\n\nQuyidagi tugmalardan birini bosing — kalendar bir click bilan chiqadi:`,
      reply_markup: TELEGRAM_ONE_CLICK_KEYBOARD,
    });
    await sendTelegramText(chatId, formatDailyCalendarMessage(syncedOperations, now.dateStr));
    return;
  }

  if (text === '📅 Bugungi kalendar' || text.startsWith('/today') || text.startsWith('/calendar')) {
    await sendTelegramText(chatId, formatDailyCalendarMessage(syncedOperations, now.dateStr));
    return;
  }

  if (text === '📆 Haftalik kalendar' || text.startsWith('/week')) {
    await sendTelegramText(chatId, formatWeeklyCalendarMessage(syncedOperations, now.dateStr));
    return;
  }

  if (text === '🏥 Keyingi operatsiya' || text.startsWith('/next')) {
    await sendTelegramText(chatId, formatNextOperationMessage(syncedOperations, now));
    return;
  }

  if (text === '📥 Kalendar (.ics)' || text.startsWith('/ics')) {
    await sendTelegramIcsDocument(chatId);
    return;
  }

  if (text === '🔔 Eslatma holati' || text.startsWith('/status')) {
    await sendTelegramText(chatId, formatReminderStatusText());
  }
}

// ---------------------------------------------------------------------------
// Automated Daily Briefing & Daytime Pre-Operation Reminder Scheduler
// Runs every 30s in Asia/Tashkent (UTC+5)
// ---------------------------------------------------------------------------
async function runReminderSchedulerTick() {
  if (!syncedSettings.dailyRemindersEnabled) return;
  const chatId = getDoctorChatId();
  const now = getTashkentNow();

  // 1. Daily Morning Briefing
  if (now.timeStr === syncedSettings.dailyBriefingTime) {
    const key = `morning:${now.dateStr}`;
    if (!sentReminderKeys.has(key)) {
      sentReminderKeys.add(key);
      const msg = formatDailyCalendarMessage(
        syncedOperations,
        now.dateStr,
        '🌅 XAYRLI TONG! BUGUNGI OPERATSIYALAR REJASI'
      );
      const ok = await sendTelegramText(chatId, msg, true);
      pushReminderLog('daily_briefing', `Ertalabki kunlik reja (${now.dateStr})`, ok);

      // Weekly digest on configured weekday
      if (now.dayOfWeek === syncedSettings.weeklyDigestDay) {
        const weekKey = `weekly:${now.dateStr}`;
        if (!sentReminderKeys.has(weekKey)) {
          sentReminderKeys.add(weekKey);
          const weekMsg = formatWeeklyCalendarMessage(syncedOperations, now.dateStr);
          const weekOk = await sendTelegramText(chatId, weekMsg, true);
          await sendTelegramIcsDocument(chatId);
          pushReminderLog('weekly_digest', `Haftalik kalendar + .ics (${now.dateStr})`, weekOk);
        }
      }
    }
  }

  // 2. Evening Next-Day Operations Preview
  if (now.timeStr === syncedSettings.eveningPreviewTime) {
    const tomorrow = addDaysToDateStr(now.dateStr, 1);
    const key = `evening:${tomorrow}`;
    if (!sentReminderKeys.has(key)) {
      sentReminderKeys.add(key);
      const msg = formatDailyCalendarMessage(
        syncedOperations,
        tomorrow,
        '🌙 ERTANGI KUN OPERATSIYALARI REJASI'
      );
      const ok = await sendTelegramText(chatId, msg, true);
      pushReminderLog('evening_preview', `Ertangi kun rejasi (${tomorrow})`, ok);
    }
  }

  // 3. Daytime Pre-Operation Alerts (e.g. 60 min & 15 min before EVERY operation today)
  const todaysActive = syncedOperations.filter(
    (o) => o.date === now.dateStr && (o.status === 'scheduled' || o.status === 'preparing')
  );

  for (const op of todaysActive) {
    const opMins = parseTimeToMinutes(op.startTime);
    const diffMins = opMins - now.totalMinutes;
    const offsets =
      op.remindBeforeMinutes.length > 0
        ? op.remindBeforeMinutes
        : syncedSettings.preOpOffsets;

    for (const offset of offsets) {
      if (diffMins === offset) {
        const key = `preop:${op.id}:${op.date}:${offset}`;
        if (!sentReminderKeys.has(key)) {
          sentReminderKeys.add(key);
          const msg = formatPreOpReminderMessage(op, offset);
          const ok = await sendTelegramText(chatId, msg, true);
          pushReminderLog(
            'pre_op',
            `${op.patientName} — ${op.procedureTitle} (${offset} daq oldin)`,
            ok
          );
        }
      }
    }
  }
}

// Optional long-polling loop when TELEGRAM_BOT_TOKEN is configured and webhook isn't active
async function pollTelegramUpdates() {
  const token = getBotToken();
  if (!token) return;
  try {
    if (!botInfoCache) {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (meRes.ok) {
        const meJson = (await meRes.json()) as {
          ok?: boolean;
          result?: { username?: string; first_name?: string };
        };
        if (meJson.ok && meJson.result) {
          botInfoCache = {
            username: meJson.result.username || '',
            firstName: meJson.result.first_name || 'DoctorZi Bot',
          };
        }
      }
    }

    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${lastPollOffset}&timeout=0&limit=20`
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      ok?: boolean;
      result?: Array<{
        update_id: number;
        message?: { chat?: { id?: number | string }; text?: string };
        callback_query?: { id?: string; message?: { chat?: { id?: number | string } }; data?: string };
      }>;
    };
    if (!data.ok || !Array.isArray(data.result)) return;
    for (const upd of data.result) {
      lastPollOffset = Math.max(lastPollOffset, upd.update_id + 1);
      await handleIncomingTelegramUpdate(upd);
    }
  } catch {
    // Silent retry on transient network error
  }
}

// ---------------------------------------------------------------------------
// Express Auth Middleware (Cryptographic Firebase ID Token verification via JWKS)
// ---------------------------------------------------------------------------
async function verifyDoctorAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!FIREBASE_PROJECT_ID) {
    res.status(500).json({ error: 'Firebase project configuration missing on server.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const emailVerified = payload.email_verified === true;
    if (!emailVerified || email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Verified doctor admin access required.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

// Simple per-IP rate limiter for public booking Telegram ping route
const publicAlertTimestamps = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (publicAlertTimestamps.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 6) return true;
  recent.push(now);
  publicAlertTimestamps.set(ip, recent);
  return false;
}

// ---------------------------------------------------------------------------
// Input Sanitization Helpers for Synced Operations
// ---------------------------------------------------------------------------
function sanitizeOperationsInput(raw: unknown): OperationRecord[] {
  if (!Array.isArray(raw)) return [];
  const validCategories = new Set(['operation', 'video_eeg', 'rehabilitation', 'consultation']);
  const validPriorities = new Set(['routine', 'urgent', 'critical']);
  const validStatuses = new Set(['scheduled', 'preparing', 'completed', 'cancelled']);
  const validSpecs = new Set(['epilepsy', 'autism', 'sleep', 'developmental', 'migraine', 'adhd']);

  return raw
    .slice(0, 400)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const offsets = Array.isArray(item.remindBeforeMinutes)
        ? item.remindBeforeMinutes
            .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 5 && n <= 1440)
            .slice(0, 4)
        : [60, 15];

      return {
        id: String(item.id || '').slice(0, 128),
        patientName: String(item.patientName || '').slice(0, 120),
        parentPhone: String(item.parentPhone || '').slice(0, 32),
        childAge: String(item.childAge || '').slice(0, 40),
        procedureTitle: String(item.procedureTitle || '').slice(0, 160),
        category: validCategories.has(String(item.category))
          ? (String(item.category) as OperationRecord['category'])
          : 'operation',
        specialtyId: validSpecs.has(String(item.specialtyId))
          ? (String(item.specialtyId) as OperationRecord['specialtyId'])
          : 'epilepsy',
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date)) ? String(item.date) : getTashkentNow().dateStr,
        startTime: /^[0-2]\d:[0-5]\d$/.test(String(item.startTime)) ? String(item.startTime) : '09:00',
        durationMinutes: Math.max(10, Math.min(480, Math.round(Number(item.durationMinutes) || 45))),
        room: String(item.room || 'Operatsiya xonasi №1').slice(0, 60),
        priority: validPriorities.has(String(item.priority))
          ? (String(item.priority) as OperationRecord['priority'])
          : 'routine',
        status: validStatuses.has(String(item.status))
          ? (String(item.status) as OperationRecord['status'])
          : 'scheduled',
        notes: String(item.notes || '').slice(0, 1000),
        remindBeforeMinutes: offsets,
      };
    })
    .filter((o) => o.id.length > 0 && o.patientName.length >= 2);
}

// ---------------------------------------------------------------------------
// Express App Bootstrap + Vite Dev/Static Middleware
// ---------------------------------------------------------------------------
async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  // 1. Telegram Webhook Endpoint (fail-closed: requires TELEGRAM_WEBHOOK_SECRET)
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    if (!expectedSecret) {
      res.status(503).json({ error: 'Telegram webhook secret is not configured.' });
      return;
    }
    const provided = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    const a = Buffer.from(provided);
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({ error: 'Invalid webhook secret.' });
      return;
    }
    try {
      await handleIncomingTelegramUpdate(req.body ?? {});
    } catch {
      // Acknowledge cleanly so Telegram does not retry endlessly
    }
    res.json({ ok: true });
  });

  // 2. Public Booking Instant Alert -> Pushes new website booking notification to Doctor's Telegram
  app.post('/api/public/booking-alert', async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many requests.' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const code = String(body.code || '').trim();
    const parentName = String(body.parentName || '').trim().slice(0, 120);
    const phone = String(body.phone || '').trim().slice(0, 32);
    const childAge = String(body.childAge || '').trim().slice(0, 40);
    const date = String(body.date || '').trim();
    const timeSlot = String(body.timeSlot || '').trim().slice(0, 24);
    const format = body.format === 'online' ? 'Online' : 'Klinikada';
    const notes = String(body.notes || '').trim().slice(0, 500);

    if (!/^DZ-\d{6}$/.test(code) || parentName.length < 2 || phone.length < 7) {
      res.status(400).json({ error: 'Invalid booking payload.' });
      return;
    }

    const alertText = [
      `🆕 YANGI QABUL ARIZASI (${code})`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 Ota-ona: ${parentName}`,
      `👶 Bola yoshi: ${childAge}`,
      `📞 Telefon: ${phone}`,
      `🗓 Sana va vaqt: ${date} · ${timeSlot} (${format})`,
      notes ? `📝 Izoh: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const delivered = await sendTelegramText(getDoctorChatId(), alertText, true);
    pushReminderLog('booking_alert', `Yangi qabul: ${parentName} (${code})`, delivered);
    res.json({ ok: true, delivered });
  });

  // 3. Authenticated Doctor CRM -> Sync Firestore Operations & Reminder Settings to Bot Engine
  app.post('/api/crm/sync', verifyDoctorAuth, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (Array.isArray(body.operations)) {
      syncedOperations = sanitizeOperationsInput(body.operations);
    }
    if (body.settings && typeof body.settings === 'object') {
      const s = body.settings as Record<string, unknown>;
      const dailyBriefingTime = /^[0-2]\d:[0-5]\d$/.test(String(s.dailyBriefingTime))
        ? String(s.dailyBriefingTime)
        : DEFAULT_CRM_SETTINGS.dailyBriefingTime;
      const eveningPreviewTime = /^[0-2]\d:[0-5]\d$/.test(String(s.eveningPreviewTime))
        ? String(s.eveningPreviewTime)
        : DEFAULT_CRM_SETTINGS.eveningPreviewTime;
      const preOpOffsets = Array.isArray(s.preOpOffsets)
        ? s.preOpOffsets
            .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 5 && n <= 1440)
            .slice(0, 4)
        : DEFAULT_CRM_SETTINGS.preOpOffsets;

      syncedSettings = {
        dailyBriefingTime,
        eveningPreviewTime,
        weeklyDigestDay: Math.max(0, Math.min(6, Math.round(Number(s.weeklyDigestDay) || 0))),
        dailyRemindersEnabled: Boolean(s.dailyRemindersEnabled),
        preOpOffsets: preOpOffsets.length > 0 ? preOpOffsets : [60, 15],
        timezone: 'Asia/Tashkent',
      };
    }

    res.json({
      ok: true,
      syncedCount: syncedOperations.length,
      tashkentNow: getTashkentNow(),
    });
  });

  // 4. Authenticated Doctor CRM -> Bot Connection Status & Reminder Log
  app.get('/api/crm/bot-status', verifyDoctorAuth, (_req: Request, res: Response) => {
    res.json({
      botConfigured: Boolean(getBotToken()),
      chatConfigured: Boolean(getDoctorChatId()),
      botUsername: botInfoCache?.username || null,
      botName: botInfoCache?.firstName || null,
      syncedCount: syncedOperations.length,
      tashkentNow: getTashkentNow(),
      settings: syncedSettings,
      logs: reminderLogs.slice(0, 15),
    });
  });

  // 5. Authenticated Doctor CRM -> 1-Click Send Calendar / Reminder to Telegram Bot
  app.post('/api/crm/telegram/send', verifyDoctorAuth, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = String(body.action || 'today');
    const chatId = getDoctorChatId();
    const now = getTashkentNow();

    let preview = '';
    let delivered = false;

    if (action === 'today') {
      preview = formatDailyCalendarMessage(syncedOperations, now.dateStr);
      delivered = await sendTelegramText(chatId, preview, true);
      pushReminderLog('manual_push', `1-click Bugungi kalendar (${now.dateStr})`, delivered);
    } else if (action === 'week') {
      preview = formatWeeklyCalendarMessage(syncedOperations, now.dateStr);
      delivered = await sendTelegramText(chatId, preview, true);
      pushReminderLog('manual_push', `1-click Haftalik kalendar (${now.dateStr})`, delivered);
    } else if (action === 'next') {
      preview = formatNextOperationMessage(syncedOperations, now);
      delivered = await sendTelegramText(chatId, preview, true);
      pushReminderLog('manual_push', '1-click Keyingi operatsiya', delivered);
    } else if (action === 'ics') {
      preview = '📥 .ICS operatsiyalar kalendari fayli (iPhone / Android / Google Calendar)';
      delivered = await sendTelegramIcsDocument(chatId);
      pushReminderLog('manual_push', '1-click .ICS kalendar fayli yuborildi', delivered);
    } else {
      res.status(400).json({ error: 'Unsupported action.' });
      return;
    }

    res.json({
      ok: true,
      delivered,
      botConfigured: Boolean(getBotToken() && chatId),
      preview,
    });
  });

  // 6. Authenticated Doctor CRM -> Direct .ICS Calendar File Download
  app.get('/api/crm/calendar.ics', verifyDoctorAuth, (_req: Request, res: Response) => {
    const ics = generateOperationsIcs(syncedOperations);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="doctorzi-calendar-${getTashkentNow().dateStr}.ics"`
    );
    res.send(ics);
  });

  // Mount Vite middleware in development or static dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Start automated daily/pre-op reminder scheduler (every 30s) & Telegram bot poller (every 4s if token set)
  setInterval(() => {
    void runReminderSchedulerTick();
  }, 30_000);

  if (getBotToken() && !process.env.TELEGRAM_WEBHOOK_URL) {
    setInterval(() => {
      void pollTelegramUpdates();
    }, 4_000);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DoctorZi Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

void createServer();
