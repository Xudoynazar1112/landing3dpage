import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
  isDoctorAdminEmail,
  signInDoctorWithGoogle,
  signOutDoctor,
} from '../lib/firebase';
import {
  DEFAULT_CRM_SETTINGS,
  addDaysToDateStr,
  formatDailyCalendarMessage,
  formatNextOperationMessage,
  formatWeeklyCalendarMessage,
  generateOperationsIcs,
  getDayLabelUz,
  getTashkentNow,
  getWeekDateStrings,
  sortOperationsChronologically,
  type BookingCrmRecord,
  type BookingStatus,
  type CrmSettingsData,
  type OperationCategory,
  type OperationPriority,
  type OperationRecord,
  type OperationStatus,
} from '../lib/calendarUtils';
import { SPECIALTIES, type Locale, type SpecialtyId } from '../data/neurologyData';
import { BrandBrainMark } from './SpecialtyIcons';

interface CrmErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class CrmErrorBoundary extends Component<
  { children: React.ReactNode; onBack: () => void },
  CrmErrorBoundaryState
> {
  state: CrmErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): CrmErrorBoundaryState {
    return { hasError: true, message: error.message || 'CRM yuklashda xatolik yuz berdi.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050B18] p-4 text-slate-100">
          <div className="neuro-panel max-w-lg rounded-3xl p-6 text-center sm:p-8">
            <h2 className="text-xl font-bold text-white">CRM ulanishida xatolik</h2>
            <p className="mt-2 break-words text-xs text-slate-300">{this.state.message}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="gold-cta rounded-xl px-5 py-2.5 text-xs font-bold"
              >
                Qayta urinish
              </button>
              <button
                type="button"
                onClick={this.props.onBack}
                className="rounded-xl border border-sky-400/25 px-5 py-2.5 text-xs font-medium text-slate-200"
              >
                Saytga qaytish
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BotStatusResponse {
  botConfigured: boolean;
  chatConfigured: boolean;
  botUsername: string | null;
  botName: string | null;
  syncedCount: number;
  logs: Array<{
    id: string;
    sentAt: string;
    type: string;
    summary: string;
    deliveredToTelegram: boolean;
  }>;
}

interface DoctorCrmDashboardProps {
  locale: Locale;
  onBack: () => void;
}

type CrmTab = 'calendar' | 'patients' | 'telegram';
type CalendarMode = 'day' | 'week' | 'month';

const PRIORITY_STYLES: Record<OperationPriority, { label: string; cls: string }> = {
  routine: { label: 'Rejali', cls: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300' },
  urgent: { label: 'Muhim', cls: 'border-[#EAB34B]/45 bg-[#EAB34B]/15 text-[#FCE19A]' },
  critical: { label: 'Shoshilinch', cls: 'border-rose-400/45 bg-rose-500/15 text-rose-300' },
};

const OP_STATUS_LABELS: Record<OperationStatus, { label: string; cls: string }> = {
  scheduled: { label: 'Rejalashtirilgan', cls: 'text-sky-300' },
  preparing: { label: 'Tayyorlanmoqda', cls: 'text-[#FCE19A]' },
  completed: { label: 'Bajarildi', cls: 'text-emerald-300' },
  cancelled: { label: 'Bekor qilindi', cls: 'text-slate-500' },
};

const CATEGORY_LABELS: Record<OperationCategory, string> = {
  operation: 'Operatsiya',
  video_eeg: 'Video-EEG',
  rehabilitation: 'Reabilitatsiya',
  consultation: 'Konsultatsiya',
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; cls: string }> = {
  new: { label: 'Yangi', cls: 'border-sky-400/40 bg-sky-500/15 text-sky-200' },
  contacted: { label: 'Bog‘lanildi', cls: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' },
  confirmed: { label: 'Tasdiqlandi', cls: 'border-[#EAB34B]/45 bg-[#EAB34B]/15 text-[#FCE19A]' },
  converted: { label: 'Kalendarga o‘tkazildi', cls: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' },
  cancelled: { label: 'Bekor qilindi', cls: 'border-slate-500/40 bg-slate-700/20 text-slate-400' },
};

const WEEKDAY_NAMES_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const WEEKDAY_FULL_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

interface OpFormState {
  id?: string;
  bookingIdToConvert?: string;
  patientName: string;
  parentPhone: string;
  childAge: string;
  procedureTitle: string;
  category: OperationCategory;
  specialtyId: SpecialtyId;
  date: string;
  startTime: string;
  durationMinutes: number;
  room: string;
  priority: OperationPriority;
  status: OperationStatus;
  notes: string;
  remindBeforeMinutes: number[];
}

function makeEmptyForm(defaultDate: string): OpFormState {
  return {
    patientName: '',
    parentPhone: '+998 ',
    childAge: '',
    procedureTitle: '',
    category: 'operation',
    specialtyId: 'epilepsy',
    date: defaultDate,
    startTime: '10:00',
    durationMinutes: 60,
    room: 'Operatsiya xonasi №1',
    priority: 'routine',
    status: 'scheduled',
    notes: '',
    remindBeforeMinutes: [60, 15],
  };
}

function buildMonthGrid(anchorDateStr: string): string[] {
  const [y, m] = anchorDateStr.split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(y, (m || 1) - 1, 1));
  const dow = firstOfMonth.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const start = new Date(Date.UTC(y, (m || 1) - 1, 1 + offset));
  return Array.from({ length: 35 }, (_, i) => {
    const dt = new Date(start.getTime() + i * 86_400_000);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  });
}

function DoctorCrmInner({ locale, onBack }: DoctorCrmDashboardProps) {
  const todayStr = useMemo(() => getTashkentNow().dateStr, []);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [activeTab, setActiveTab] = useState<CrmTab>('calendar');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [bookings, setBookings] = useState<BookingCrmRecord[]>([]);
  const [settings, setSettings] = useState<CrmSettingsData>(DEFAULT_CRM_SETTINGS);

  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [botPreviewText, setBotPreviewText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [pushingAction, setPushingAction] = useState<string | null>(null);

  // Patients tab filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');

  // Operation Add / Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [opForm, setOpForm] = useState<OpFormState>(() => makeEmptyForm(todayStr));
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = isDoctorAdminEmail(user?.email, user?.emailVerified);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3500);
  }, []);

  // 1. Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Real-time Firestore listeners (strictly attached only when verified Doctor Admin is signed in)
  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;

    const opsQuery = query(collection(db, 'operations'), orderBy('date', 'asc'));
    const unsubOps = onSnapshot(
      opsQuery,
      (snap) => {
        const list: OperationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            patientName: String(data.patientName || ''),
            parentPhone: String(data.parentPhone || ''),
            childAge: String(data.childAge || ''),
            procedureTitle: String(data.procedureTitle || ''),
            category: (data.category || 'operation') as OperationCategory,
            specialtyId: (data.specialtyId || 'epilepsy') as SpecialtyId,
            date: String(data.date || todayStr),
            startTime: String(data.startTime || '09:00'),
            durationMinutes: Number(data.durationMinutes || 45),
            room: String(data.room || 'Operatsiya xonasi №1'),
            priority: (data.priority || 'routine') as OperationPriority,
            status: (data.status || 'scheduled') as OperationStatus,
            notes: String(data.notes || ''),
            remindBeforeMinutes: Array.isArray(data.remindBeforeMinutes)
              ? data.remindBeforeMinutes.map(Number)
              : [60, 15],
            ownerId: String(data.ownerId || ''),
          };
        });
        setOperations(sortOperationsChronologically(list));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'operations')
    );

    const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(
      bookingsQuery,
      (snap) => {
        const list: BookingCrmRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | undefined;
          return {
            id: d.id,
            code: String(data.code || d.id),
            parentName: String(data.parentName || ''),
            phone: String(data.phone || ''),
            childAge: String(data.childAge || ''),
            specialtyId: (data.specialtyId || 'epilepsy') as SpecialtyId,
            format: data.format === 'online' ? 'online' : 'clinic',
            date: String(data.date || ''),
            timeSlot: String(data.timeSlot || ''),
            notes: String(data.notes || ''),
            status: (data.status || 'new') as BookingStatus,
            createdAtMs: ts?.toMillis ? ts.toMillis() : undefined,
          };
        });
        setBookings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const settingsRef = doc(db, 'crm_settings', 'default');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            dailyBriefingTime: String(data.dailyBriefingTime || '08:00'),
            eveningPreviewTime: String(data.eveningPreviewTime || '20:00'),
            weeklyDigestDay: Number(data.weeklyDigestDay ?? 0),
            dailyRemindersEnabled: Boolean(data.dailyRemindersEnabled ?? true),
            preOpOffsets: Array.isArray(data.preOpOffsets)
              ? data.preOpOffsets.map(Number)
              : [60, 15],
            timezone: String(data.timezone || 'Asia/Tashkent'),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'crm_settings/default')
    );

    return () => {
      unsubOps();
      unsubBookings();
      unsubSettings();
    };
  }, [authReady, user, isAdmin, todayStr]);

  // 3. Sync Firestore operations & settings to Express Telegram Bot scheduler whenever updated
  const fetchBotStatus = useCallback(async (u: User) => {
    try {
      const token = await u.getIdToken();
      const res = await fetch('/api/crm/bot-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as BotStatusResponse;
        setBotStatus(data);
      }
    } catch {
      // Ignore network hiccup during preview restart
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        await fetch('/api/crm/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ operations, settings }),
        });
        if (!cancelled) {
          await fetchBotStatus(user);
        }
      } catch {
        // Ignore transient sync error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, operations, settings, fetchBotStatus]);

  // Update default Telegram live preview whenever operations change
  useEffect(() => {
    setBotPreviewText((prev) =>
      prev ? prev : formatDailyCalendarMessage(operations, todayStr)
    );
  }, [operations, todayStr]);

  // -------------------------------------------------------------------------
  // Handlers: Auth, Operations CRUD, Demo Seed, Bookings CRM, Telegram Push
  // -------------------------------------------------------------------------
  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInDoctorWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setSigningIn(false);
    }
  };

  const openCreateModal = (presetDate?: string) => {
    setFormError(null);
    setOpForm(makeEmptyForm(presetDate || selectedDate));
    setFormOpen(true);
  };

  const openEditModal = (op: OperationRecord) => {
    setFormError(null);
    setOpForm({
      id: op.id,
      patientName: op.patientName,
      parentPhone: op.parentPhone,
      childAge: op.childAge,
      procedureTitle: op.procedureTitle,
      category: op.category,
      specialtyId: op.specialtyId,
      date: op.date,
      startTime: op.startTime,
      durationMinutes: op.durationMinutes,
      room: op.room,
      priority: op.priority,
      status: op.status,
      notes: op.notes,
      remindBeforeMinutes: op.remindBeforeMinutes.length > 0 ? op.remindBeforeMinutes : [60, 15],
    });
    setFormOpen(true);
  };

  const convertBookingToOperation = (b: BookingCrmRecord) => {
    const specName =
      SPECIALTIES.find((s) => s.id === b.specialtyId)?.title[locale] || 'Nevrologik amaliyot';
    setFormError(null);
    setOpForm({
      bookingIdToConvert: b.id,
      patientName: b.parentName,
      parentPhone: b.phone,
      childAge: b.childAge,
      procedureTitle: `${specName} — Rejali amaliyot`,
      category: 'operation',
      specialtyId: b.specialtyId,
      date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : todayStr,
      startTime: /^[0-2]\d:[0-5]\d$/.test(b.timeSlot.slice(0, 5)) ? b.timeSlot.slice(0, 5) : '14:00',
      durationMinutes: 60,
      room: 'Operatsiya xonasi №1',
      priority: 'routine',
      status: 'scheduled',
      notes: b.notes.slice(0, 1000),
      remindBeforeMinutes: [60, 15],
    });
    setFormOpen(true);
  };

  const handleSaveOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    const patientName = opForm.patientName.trim().slice(0, 120);
    const parentPhone = opForm.parentPhone.trim().slice(0, 32);
    const childAge = opForm.childAge.trim().slice(0, 40);
    const procedureTitle = opForm.procedureTitle.trim().slice(0, 160);
    const room = opForm.room.trim().slice(0, 60);
    const notes = opForm.notes.trim().slice(0, 1000);
    const durationMinutes = Math.max(10, Math.min(480, Math.round(Number(opForm.durationMinutes) || 45)));
    const remindBeforeMinutes = [...new Set(opForm.remindBeforeMinutes)]
      .filter((n) => Number.isInteger(n) && n >= 5 && n <= 1440)
      .sort((a, b) => b - a)
      .slice(0, 4);

    if (patientName.length < 2) {
      setFormError('Bemor ismini kamida 2 harf bilan kiriting.');
      return;
    }
    if (parentPhone.length < 7) {
      setFormError('Telefon raqamini to‘g‘ri kiriting.');
      return;
    }
    if (childAge.length < 1) {
      setFormError('Bola yoshini kiriting.');
      return;
    }
    if (procedureTitle.length < 2) {
      setFormError('Operatsiya yoki muolaja nomini kiriting.');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      if (opForm.id) {
        const opRef = doc(db, 'operations', opForm.id);
        await updateDoc(opRef, {
          patientName,
          parentPhone,
          childAge,
          procedureTitle,
          category: opForm.category,
          specialtyId: opForm.specialtyId,
          date: opForm.date,
          startTime: opForm.startTime,
          durationMinutes,
          room,
          priority: opForm.priority,
          status: opForm.status,
          notes,
          remindBeforeMinutes,
          updatedAt: serverTimestamp(),
        });
        showToast('Operatsiya jadvali yangilandi va Telegram botga sinxronlandi.');
      } else {
        const newId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const opRef = doc(db, 'operations', newId);
        await setDoc(opRef, {
          patientName,
          parentPhone,
          childAge,
          procedureTitle,
          category: opForm.category,
          specialtyId: opForm.specialtyId,
          date: opForm.date,
          startTime: opForm.startTime,
          durationMinutes,
          room,
          priority: opForm.priority,
          status: opForm.status,
          notes,
          remindBeforeMinutes,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (opForm.bookingIdToConvert) {
          const bRef = doc(db, 'bookings', opForm.bookingIdToConvert);
          await updateDoc(bRef, {
            status: 'converted',
            notes: notes.slice(0, 800),
            updatedAt: serverTimestamp(),
          });
        }
        showToast('Yangi operatsiya kalendarga qo‘shildi.');
      }
      setSelectedDate(opForm.date);
      setFormOpen(false);
    } catch (err) {
      handleFirestoreError(err, opForm.id ? OperationType.UPDATE : OperationType.CREATE, 'operations');
    } finally {
      setFormSaving(false);
    }
  };

  const handleQuickOpStatus = async (op: OperationRecord, nextStatus: OperationStatus) => {
    try {
      await updateDoc(doc(db, 'operations', op.id), {
        status: nextStatus,
        notes: op.notes,
        updatedAt: serverTimestamp(),
      });
      showToast(`Holat yangilandi: ${OP_STATUS_LABELS[nextStatus].label}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `operations/${op.id}`);
    }
  };

  const handleDeleteOperation = async (op: OperationRecord) => {
    try {
      await deleteDoc(doc(db, 'operations', op.id));
      showToast('Operatsiya kalendardan o‘chirildi.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `operations/${op.id}`);
    }
  };

  const handleUpdateBookingStatus = async (b: BookingCrmRecord, nextStatus: BookingStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: nextStatus,
        notes: b.notes,
        updatedAt: serverTimestamp(),
      });
      showToast(`Ariza holati: ${BOOKING_STATUS_LABELS[nextStatus].label}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${b.id}`);
    }
  };

  const handleSeedSampleSchedule = async () => {
    if (!user || !isAdmin) return;
    const samples: Array<Omit<OperationRecord, 'id' | 'ownerId'>> = [
      {
        patientName: 'Amirbek Abdullayev',
        parentPhone: '+998 90 123 45 67',
        childAge: '6 yosh',
        procedureTitle: 'Epileptologik VNS nazorati va Video-EEG baholash',
        category: 'operation',
        specialtyId: 'epilepsy',
        date: todayStr,
        startTime: '10:30',
        durationMinutes: 90,
        room: 'Operatsiya xonasi №1',
        priority: 'urgent',
        status: 'scheduled',
        notes: '3 soatlik tungi Video-EEG natijalari tayyor, anesteziolog ko‘rigi o‘tgan.',
        remindBeforeMinutes: [60, 15],
      },
      {
        patientName: 'Madina Qodirova',
        parentPhone: '+998 93 456 78 90',
        childAge: '4 yosh',
        procedureTitle: 'AKTIV+ neyroreabilitatsiya va farmakopunktura kursi',
        category: 'rehabilitation',
        specialtyId: 'developmental',
        date: todayStr,
        startTime: '14:30',
        durationMinutes: 60,
        room: 'Reabilitatsiya zali №2',
        priority: 'routine',
        status: 'scheduled',
        notes: '2-bosqich korreksion terapiya va nutq stimulyatsiyasi.',
        remindBeforeMinutes: [60, 15],
      },
      {
        patientName: 'Sardorbek Rustamov',
        parentPhone: '+998 97 712 34 56',
        childAge: '9 yosh',
        procedureTitle: 'Murakkab fokusli epilepsiya pre-jarrohlik konsilium',
        category: 'operation',
        specialtyId: 'epilepsy',
        date: addDaysToDateStr(todayStr, 1),
        startTime: '09:30',
        durationMinutes: 120,
        room: 'Operatsiya xonasi №1',
        priority: 'critical',
        status: 'scheduled',
        notes: 'MRT 3T tasvirlari va 24 soatlik Video-EEG protokoli tayyorlangan.',
        remindBeforeMinutes: [120, 60, 15],
      },
      {
        patientName: 'Yasmina Karimova',
        parentPhone: '+998 99 884 11 22',
        childAge: '7 yosh',
        procedureTitle: 'Uyqu apnoesi va polisomnografiya nevrologik tekshiruvi',
        category: 'video_eeg',
        specialtyId: 'sleep',
        date: addDaysToDateStr(todayStr, 2),
        startTime: '13:00',
        durationMinutes: 75,
        room: 'Diagnostika xonasi №3',
        priority: 'routine',
        status: 'scheduled',
        notes: 'Ota-ona bilan uyqu kundaligi tahlili.',
        remindBeforeMinutes: [60, 15],
      },
    ];

    try {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const id = `op_seed_${Date.now()}_${i}`;
        await setDoc(doc(db, 'operations', id), {
          ...s,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast('4 ta namuna operatsiya bugungi va haftalik kalendarga qo‘shildi!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'operations');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    setSavingSettings(true);
    try {
      const cleanOffsets = [...new Set(settings.preOpOffsets)]
        .filter((n) => Number.isInteger(n) && n >= 5 && n <= 1440)
        .sort((a, b) => b - a)
        .slice(0, 4);
      await setDoc(doc(db, 'crm_settings', 'default'), {
        dailyBriefingTime: settings.dailyBriefingTime,
        eveningPreviewTime: settings.eveningPreviewTime,
        weeklyDigestDay: settings.weeklyDigestDay,
        dailyRemindersEnabled: settings.dailyRemindersEnabled,
        preOpOffsets: cleanOffsets.length > 0 ? cleanOffsets : [60, 15],
        timezone: 'Asia/Tashkent',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      showToast('Kunlik va operatsiya oldi Telegram eslatma vaqtlari saqlandi!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'crm_settings/default');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadIcs = () => {
    const ics = generateOperationsIcs(operations);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctorzi-calendar-${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Kalendar (.ics) yuklab olindi — telefoningiz kalendariga 1 bosishda qo‘shing!');
  };

  const handleOneClickTelegramPush = async (action: 'today' | 'week' | 'next' | 'ics') => {
    if (!user) return;
    setPushingAction(action);

    // Always immediately update live preview so doctor sees exact bot message
    if (action === 'today') {
      setBotPreviewText(formatDailyCalendarMessage(operations, todayStr));
    } else if (action === 'week') {
      setBotPreviewText(formatWeeklyCalendarMessage(operations, todayStr));
    } else if (action === 'next') {
      setBotPreviewText(formatNextOperationMessage(operations));
    } else {
      setBotPreviewText(
        `📥 doctorzi-calendar-${todayStr}.ics\n\nBarcha ${operations.filter((o) => o.status !== 'cancelled').length} ta operatsiya va ularning 60 daq / 15 daq eslatmalari bitta .ICS faylda tayyorlandi.`
      );
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/crm/telegram/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = (await res.json()) as { delivered: boolean; botConfigured: boolean };
        if (data.delivered) {
          showToast('Telegram bot orqali doktorga muvaffaqiyatli yuborildi!');
        } else if (!data.botConfigured) {
          showToast(
            'Bot ko‘rinishi yangilandi. Real yuborish uchun Settings → Secrets da TELEGRAM_BOT_TOKEN va TELEGRAM_DOCTOR_CHAT_ID kiriting.'
          );
        } else {
          showToast('Telegram API javob bermadi — bot token va chat ID ni tekshiring.');
        }
        await fetchBotStatus(user);
      }
    } catch {
      showToast('Server bilan aloqa uzildi.');
    } finally {
      setPushingAction(null);
    }
  };

  // -------------------------------------------------------------------------
  // Derived Calendar & KPI Views
  // -------------------------------------------------------------------------
  const todaysOps = useMemo(
    () => operations.filter((o) => o.date === todayStr && o.status !== 'cancelled'),
    [operations, todayStr]
  );

  const weekDates = useMemo(() => getWeekDateStrings(selectedDate), [selectedDate]);
  const thisWeekEnd = useMemo(() => addDaysToDateStr(todayStr, 6), [todayStr]);
  const weeklyOpsCount = useMemo(
    () =>
      operations.filter(
        (o) => o.date >= todayStr && o.date <= thisWeekEnd && o.status !== 'cancelled'
      ).length,
    [operations, todayStr, thisWeekEnd]
  );

  const nextUpcomingOp = useMemo(() => {
    const now = getTashkentNow();
    return operations.find((o) => {
      if (o.status === 'cancelled' || o.status === 'completed') return false;
      if (o.date > now.dateStr) return true;
      return o.date === now.dateStr && o.startTime >= now.timeStr;
    });
  }, [operations]);

  const selectedDayOps = useMemo(
    () => operations.filter((o) => o.date === selectedDate),
    [operations, selectedDate]
  );

  const monthGrid = useMemo(() => buildMonthGrid(selectedDate), [selectedDate]);
  const currentMonthPrefix = selectedDate.slice(0, 7);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.parentName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.notes.toLowerCase().includes(q)
      );
    });
  }, [bookings, searchQuery, statusFilter]);

  const newBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'new').length,
    [bookings]
  );

  // -------------------------------------------------------------------------
  // Render Auth Gate if not signed in as Verified Doctor Admin
  // -------------------------------------------------------------------------
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B18] text-slate-300">
        <div className="text-sm font-medium">DoctorZi CRM yuklanmoqda...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="neural-grid-bg flex min-h-screen flex-col items-center justify-center bg-[#050B18] px-4 py-10 text-slate-100">
        <div className="neuro-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandBrainMark className="h-9 w-9" />
              <div>
                <div className="text-base font-bold text-white">DoctorZi CRM</div>
                <div className="text-[11px] text-sky-300">Operatsiyalar kalendari & Telegram Bot</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-400/20 px-3 text-xs font-medium text-slate-300 hover:border-[#EAB34B]/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Sayt</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#EAB34B]/25 bg-[#071329]/90 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F6C86E]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Shifokor (Admin) kirish himoyasi</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Bemorlar arizalari, kunlik/haftalik operatsiyalar kalendari va Telegram bot boshqaruvi
              faqat tasdiqlangan doktor hisobi (<span className="font-mono text-sky-300">{ADMIN_EMAIL}</span>) uchun ochiq.
            </p>
          </div>

          {user && !isAdmin && (
            <div className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-200">
              Kirilgan hisob (<span className="font-mono">{user.email}</span>) admin huquqiga ega emas.
              Iltimos, <span className="font-mono">{ADMIN_EMAIL}</span> orqali kiring.
            </div>
          )}

          {authError && (
            <div className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-200">
              {authError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={signingIn}
              onClick={handleSignIn}
              className="gold-cta inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              <span>{signingIn ? 'Kirilmoqda...' : 'Google orqali CRM’ga kirish'}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => void signOutDoctor()}
                className="min-h-11 rounded-xl border border-sky-400/20 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Boshqa hisobdan kirish (Chiqish)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main Authenticated Doctor CRM & Operations Calendar Workspace
  // -------------------------------------------------------------------------
  return (
    <div className="neural-grid-bg min-h-screen w-full overflow-x-clip bg-[#050B18] pb-16 text-slate-100">
      {/* Top CRM Header */}
      <header className="sticky top-0 z-40 border-b border-sky-400/15 bg-[#050B18]/92">
        <div className="mx-auto flex h-16 w-full max-w-[1840px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 hover:border-[#EAB34B]/60 hover:text-white"
              title="Saytga qaytish"
              aria-label="Saytga qaytish"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <BrandBrainMark className="h-8 w-8 sm:h-9 sm:w-9" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white sm:text-base">
                DoctorZi CRM · Kalendar & Telegram Bot
              </div>
              <div className="truncate font-mono text-[11px] text-sky-300">
                {user.email}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="gold-cta inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap sm:px-4 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yangi operatsiya</span>
              <span className="sm:hidden">Qo‘shish</span>
            </button>
            <button
              type="button"
              onClick={() => void signOutDoctor()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-300 hover:border-rose-400/50 hover:text-rose-200"
              title="Chiqish"
              aria-label="Chiqish"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-5 right-4 z-50 max-w-sm rounded-2xl border border-[#EAB34B]/60 bg-[#081631] px-4 py-3 text-xs font-medium text-[#FCE19A] shadow-[0_14px_40px_rgba(2,8,22,0.9)]">
          {toastMsg}
        </div>
      )}

      <div className="mx-auto w-full max-w-[1840px] px-4 pt-6 sm:px-6 lg:px-10 xl:px-14">
        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="neuro-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Bugungi operatsiyalar</span>
              <CalendarIcon className="h-4 w-4 text-[#F6C86E]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {todaysOps.length}
            </div>
            <div className="mt-1 truncate text-[11px] text-sky-300">{getDayLabelUz(todayStr)}</div>
          </div>

          <div className="neuro-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Haftalik reja (7 kun)</span>
              <Clock className="h-4 w-4 text-sky-300" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {weeklyOpsCount}
            </div>
            <div className="mt-1 truncate text-[11px] text-slate-400">
              {todayStr} — {thisWeekEnd}
            </div>
          </div>

          <div className="neuro-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Keyingi operatsiya</span>
              <Bell className="h-4 w-4 text-[#F6C86E]" />
            </div>
            {nextUpcomingOp ? (
              <>
                <div className="mt-2 truncate text-sm font-bold text-[#FCE19A] sm:text-base">
                  {nextUpcomingOp.startTime} · {nextUpcomingOp.patientName}
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-300">
                  {nextUpcomingOp.date} · {nextUpcomingOp.procedureTitle}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-slate-400">Navbatdagi yozuv yo‘q</div>
            )}
          </div>

          <div className="neuro-panel rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Yangi qabul arizalari</span>
              <Users className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {newBookingsCount}
            </div>
            <div className="mt-1 truncate text-[11px] text-slate-400">
              Jami CRM bazasida: {bookings.length} ta
            </div>
          </div>
        </div>

        {/* Navigation Tabs + 1-Click Quick Calendar Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full overflow-x-auto rounded-2xl border border-sky-400/20 bg-[#071329] p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-none sm:text-sm ${
                activeTab === 'calendar'
                  ? 'bg-[#EAB34B] text-[#081020]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Operatsiyalar kalendari</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('patients')}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-none sm:text-sm ${
                activeTab === 'patients'
                  ? 'bg-[#EAB34B] text-[#081020]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Bemorlar CRM ({bookings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telegram')}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-none sm:text-sm ${
                activeTab === 'telegram'
                  ? 'bg-[#EAB34B] text-[#081020]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Telegram Bot & Eslatmalar</span>
            </button>
          </div>

          {/* 1-Click Calendar Push & .ICS Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#08152E] px-3.5 py-2 text-xs font-semibold text-sky-200 whitespace-nowrap transition-colors hover:border-[#EAB34B]/60 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-[#F6C86E]" />
              <span>.ICS Kalendar</span>
            </button>
            <button
              type="button"
              disabled={pushingAction !== null}
              onClick={() => void handleOneClickTelegramPush('today')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#EAB34B]/45 bg-[#EAB34B]/12 px-3.5 py-2 text-xs font-semibold text-[#FCE19A] whitespace-nowrap transition-colors hover:bg-[#EAB34B] hover:text-[#081020]"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram: Bugungi reja</span>
            </button>
            <button
              type="button"
              disabled={pushingAction !== null}
              onClick={() => void handleOneClickTelegramPush('week')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#08152E] px-3.5 py-2 text-xs font-semibold text-slate-200 whitespace-nowrap transition-colors hover:border-[#EAB34B]/60 hover:text-white"
            >
              <Send className="h-3.5 w-3.5 text-sky-300" />
              <span>Telegram: Haftalik</span>
            </button>
          </div>
        </div>

        {/* =================================================================
            TAB 1: OPERATIONS CALENDAR (DAILY / WEEKLY / MONTHLY)
        ================================================================= */}
        {activeTab === 'calendar' && (
          <div className="mt-6 space-y-5">
            {/* Calendar Toolbar */}
            <div className="neuro-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      addDaysToDateStr(
                        selectedDate,
                        calendarMode === 'day' ? -1 : calendarMode === 'week' ? -7 : -30
                      )
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 hover:border-[#EAB34B]/60"
                  aria-label="Oldingi"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="min-h-9 rounded-xl border border-[#EAB34B]/35 bg-[#0A1733] px-3.5 text-xs font-semibold text-[#FCE19A] hover:border-[#EAB34B]"
                >
                  Bugun
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      addDaysToDateStr(
                        selectedDate,
                        calendarMode === 'day' ? 1 : calendarMode === 'week' ? 7 : 30
                      )
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-200 hover:border-[#EAB34B]/60"
                  aria-label="Keyingi"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="ml-1 text-sm font-bold text-white sm:text-base">
                  {getDayLabelUz(selectedDate)} ({selectedDate})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {operations.length === 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSeedSampleSchedule()}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Namuna jadval yaratish</span>
                  </button>
                )}

                <div className="inline-flex rounded-xl border border-sky-400/20 bg-[#050C1C] p-0.5">
                  {(['day', 'week', 'month'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCalendarMode(m)}
                      className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        calendarMode === m
                          ? 'bg-[#EAB34B] text-[#081020]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m === 'day' ? 'Kunlik' : m === 'week' ? 'Haftalik' : 'Oylik'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* WEEKLY 7-COLUMN GRID */}
            {calendarMode === 'week' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
                {weekDates.map((dStr, idx) => {
                  const dayItems = operations.filter((o) => o.date === dStr);
                  const isToday = dStr === todayStr;
                  const isSelected = dStr === selectedDate;
                  return (
                    <div
                      key={dStr}
                      className={`flex min-h-[220px] flex-col rounded-2xl border p-3 transition-colors ${
                        isToday
                          ? 'border-[#EAB34B]/65 bg-[#0A1936]/95'
                          : isSelected
                            ? 'border-sky-400/50 bg-[#08152E]/95'
                            : 'border-sky-400/15 bg-[#071226]/90'
                      }`}
                    >
                      <div className="mb-2.5 flex items-center justify-between border-b border-sky-400/15 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(dStr);
                            setCalendarMode('day');
                          }}
                          className="text-left"
                        >
                          <div className="text-[11px] font-medium text-sky-300">
                            {WEEKDAY_NAMES_UZ[(idx + 1) % 7]}
                            {isToday ? ' · Bugun' : ''}
                          </div>
                          <div className="font-mono text-sm font-bold tabular-nums text-white">
                            {dStr.slice(8)}/{dStr.slice(5, 7)}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreateModal(dStr)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/20 text-slate-300 hover:border-[#EAB34B] hover:text-[#FCE19A]"
                          title="Shu kunga operatsiya qo‘shish"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        {dayItems.length === 0 ? (
                          <div className="my-auto text-center text-[11px] text-slate-500">
                            Bo‘sh kun
                          </div>
                        ) : (
                          dayItems.map((op) => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => openEditModal(op)}
                              className={`w-full rounded-xl border p-2.5 text-left transition-all hover:border-[#EAB34B]/70 ${
                                op.status === 'cancelled'
                                  ? 'border-slate-700/50 bg-slate-900/40 opacity-55'
                                  : op.status === 'completed'
                                    ? 'border-emerald-400/35 bg-emerald-500/10'
                                    : 'border-sky-400/25 bg-[#050C1C]/90'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 font-mono text-[11px] tabular-nums">
                                <span className="font-bold text-[#FCE19A]">{op.startTime}</span>
                                <span className="text-[10px] text-slate-400">{op.durationMinutes}m</span>
                              </div>
                              <div className="mt-1 line-clamp-1 text-xs font-semibold text-white">
                                {op.patientName}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-300">
                                {op.procedureTitle}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                                <span className="truncate text-sky-300">{op.room}</span>
                                <span className={OP_STATUS_LABELS[op.status].cls}>●</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DAILY TIMELINE VIEW */}
            {calendarMode === 'day' && (
              <div className="neuro-panel rounded-3xl p-4 sm:p-6">
                {selectedDayOps.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-400">
                      {getDayLabelUz(selectedDate)} kuniga rejalashtirilgan operatsiya yo‘q.
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateModal(selectedDate)}
                      className="gold-cta mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Shu kunga operatsiya qo‘shish</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayOps.map((op) => (
                      <div
                        key={op.id}
                        className="flex flex-col gap-4 rounded-2xl border border-sky-400/20 bg-[#061024]/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex shrink-0 flex-col items-center rounded-xl border border-[#EAB34B]/40 bg-[#0A1835] px-3 py-2 text-center">
                            <span className="font-mono text-base font-bold tabular-nums text-[#FCE19A]">
                              {op.startTime}
                            </span>
                            <span className="font-mono text-[10px] text-sky-300">
                              {op.durationMinutes} daq
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[op.priority].cls}`}
                              >
                                {PRIORITY_STYLES[op.priority].label}
                              </span>
                              <span className="text-xs font-medium text-sky-300">
                                {CATEGORY_LABELS[op.category]}
                              </span>
                              <span className={`text-xs font-semibold ${OP_STATUS_LABELS[op.status].cls}`}>
                                · {OP_STATUS_LABELS[op.status].label}
                              </span>
                            </div>
                            <h4 className="mt-1 text-base font-bold text-white">
                              {op.procedureTitle}
                            </h4>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                              <span>
                                👤 <strong className="text-white">{op.patientName}</strong> ({op.childAge})
                              </span>
                              <span>🚪 {op.room}</span>
                              <a
                                href={`tel:${op.parentPhone.replace(/\s+/g, '')}`}
                                className="inline-flex items-center gap-1 font-mono text-sky-300 hover:text-[#FCE19A]"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{op.parentPhone}</span>
                              </a>
                            </div>
                            {op.notes && (
                              <p className="mt-1.5 text-xs text-slate-400">{op.notes}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                              <Bell className="h-3 w-3 text-[#F6C86E]" />
                              <span>Telegram eslatma:</span>
                              {(op.remindBeforeMinutes.length > 0 ? op.remindBeforeMinutes : [60, 15]).map(
                                (m) => (
                                  <span
                                    key={m}
                                    className="rounded border border-sky-400/20 bg-[#08152E] px-1.5 py-0.5 font-mono text-sky-200"
                                  >
                                    -{m}m
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {op.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={() => void handleQuickOpStatus(op, 'preparing')}
                              className="rounded-xl border border-[#EAB34B]/45 bg-[#EAB34B]/12 px-3 py-2 text-xs font-semibold text-[#FCE19A] hover:bg-[#EAB34B] hover:text-[#081020]"
                            >
                              Tayyorlanmoqda
                            </button>
                          )}
                          {op.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => void handleQuickOpStatus(op, 'completed')}
                              className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Bajarildi</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(op)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-[#08152E] text-slate-300 hover:border-[#EAB34B]/60 hover:text-white"
                            aria-label="Tahrirlash"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteOperation(op)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-[#08152E] text-rose-300 hover:border-rose-400/60"
                            aria-label="O‘chirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MONTHLY GRID VIEW */}
            {calendarMode === 'month' && (
              <div className="neuro-panel rounded-3xl p-4 sm:p-6">
                <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-sky-300">
                  {['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {monthGrid.map((dStr) => {
                    const count = operations.filter(
                      (o) => o.date === dStr && o.status !== 'cancelled'
                    ).length;
                    const inMonth = dStr.startsWith(currentMonthPrefix);
                    const isToday = dStr === todayStr;
                    return (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dStr);
                          setCalendarMode('day');
                        }}
                        className={`flex min-h-[64px] flex-col items-start justify-between rounded-xl border p-2 text-left transition-colors sm:min-h-[84px] ${
                          isToday
                            ? 'border-[#EAB34B]/70 bg-[#0C1D3F]'
                            : count > 0
                              ? 'border-sky-400/35 bg-[#081631] hover:border-[#EAB34B]/60'
                              : 'border-sky-400/12 bg-[#060E20]/70 hover:border-sky-400/35'
                        } ${inMonth ? '' : 'opacity-45'}`}
                      >
                        <span className="font-mono text-xs font-bold tabular-nums text-white">
                          {Number(dStr.slice(8))}
                        </span>
                        {count > 0 && (
                          <span className="rounded-md bg-[#EAB34B]/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#FCE19A]">
                            {count} ta
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 2: PATIENTS & WEBSITE BOOKINGS CRM PIPELINE
        ================================================================= */}
        {activeTab === 'patients' && (
          <div className="mt-6 space-y-4">
            <div className="neuro-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ism, telefon yoki DZ-kod bo‘yicha qidirish..."
                  className="min-h-10 w-full rounded-xl border border-sky-400/20 bg-[#050C1C] pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-[#EAB34B] focus:outline-none sm:text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'new', 'contacted', 'confirmed', 'converted', 'cancelled'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-[#EAB34B] text-[#081020]'
                          : 'border border-sky-400/20 bg-[#071329] text-slate-300 hover:text-white'
                      }`}
                    >
                      {st === 'all' ? 'Barchasi' : BOOKING_STATUS_LABELS[st].label}
                    </button>
                  )
                )}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="neuro-panel rounded-3xl py-12 text-center text-sm text-slate-400">
                Hozircha mos keluvchi qabul arizalari yo‘q. Saytdagi «Qabulga yozilish» formasi orqali
                kelgan arizalar avtomatik shu yerda chiqadi.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBookings.map((b) => {
                  const specTitle =
                    SPECIALTIES.find((s) => s.id === b.specialtyId)?.title[locale] || b.specialtyId;
                  return (
                    <div
                      key={b.id}
                      className="neuro-panel flex flex-col justify-between gap-4 rounded-2xl p-4 sm:p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#F6C86E]">
                            {b.code}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${BOOKING_STATUS_LABELS[b.status].cls}`}
                          >
                            {BOOKING_STATUS_LABELS[b.status].label}
                          </span>
                        </div>
                        <h4 className="mt-2 text-base font-bold text-white">{b.parentName}</h4>
                        <div className="mt-1 space-y-1 text-xs text-slate-300">
                          <div>
                            👶 Bola yoshi: <strong className="text-white">{b.childAge}</strong> ·{' '}
                            <span className="text-sky-300">{specTitle}</span>
                          </div>
                          <div>
                            🗓 {b.date} · ⏰ {b.timeSlot} ({b.format === 'online' ? 'Online' : 'Klinikada'})
                          </div>
                          <a
                            href={`tel:${b.phone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 font-mono text-sky-300 hover:text-[#FCE19A]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{b.phone}</span>
                          </a>
                          {b.notes && (
                            <p className="mt-1.5 rounded-lg bg-[#050C1C] p-2.5 text-[11px] text-slate-400">
                              {b.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-400/15 pt-3">
                        <select
                          value={b.status}
                          onChange={(e) =>
                            void handleUpdateBookingStatus(b, e.target.value as BookingStatus)
                          }
                          className="min-h-9 rounded-lg border border-sky-400/25 bg-[#050C1C] px-2.5 text-xs text-slate-200 focus:border-[#EAB34B] focus:outline-none"
                        >
                          <option value="new">Yangi</option>
                          <option value="contacted">Bog‘lanildi</option>
                          <option value="confirmed">Tasdiqlandi</option>
                          <option value="converted">Kalendarga o‘tkazildi</option>
                          <option value="cancelled">Bekor qilindi</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => convertBookingToOperation(b)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#EAB34B]/45 bg-[#EAB34B]/12 px-3 text-xs font-semibold text-[#FCE19A] hover:bg-[#EAB34B] hover:text-[#081020]"
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>Kalendarga qo‘shish</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 3: TELEGRAM BOT 1-CLICK CALENDAR & DAILY REMINDER ENGINE
        ================================================================= */}
        {activeTab === 'telegram' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {/* Left: Interactive 1-Click Telegram Bot Preview & Push Controls */}
            <div className="space-y-5 lg:col-span-7">
              <div className="neuro-panel rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Telegram Bot — 1-Click Kalendar Boshqaruvi
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Doktor Telegram botda bitta tugmani bosib kunlik/haftalik operatsiyalarini yoki .ICS kalendar faylini oladi.
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      botStatus?.botConfigured && botStatus?.chatConfigured
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-[#EAB34B]/40 bg-[#EAB34B]/12 text-[#FCE19A]'
                    }`}
                  >
                    {botStatus?.botConfigured && botStatus?.chatConfigured
                      ? `Bot faol ${botStatus.botUsername ? `(@${botStatus.botUsername})` : ''}`
                      : 'Secrets ulanishi kutilmoqda'}
                  </span>
                </div>

                {/* 1-Click Telegram Bot Action Buttons */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <button
                    type="button"
                    disabled={pushingAction !== null}
                    onClick={() => void handleOneClickTelegramPush('today')}
                    className="rounded-xl border border-[#EAB34B]/45 bg-[#0A1835] px-3 py-3 text-xs font-semibold text-[#FCE19A] transition-colors hover:bg-[#EAB34B] hover:text-[#081020]"
                  >
                    📅 Bugungi kalendar
                  </button>
                  <button
                    type="button"
                    disabled={pushingAction !== null}
                    onClick={() => void handleOneClickTelegramPush('week')}
                    className="rounded-xl border border-sky-400/30 bg-[#0A1835] px-3 py-3 text-xs font-semibold text-sky-200 transition-colors hover:border-[#EAB34B]/60 hover:text-white"
                  >
                    📆 Haftalik kalendar
                  </button>
                  <button
                    type="button"
                    disabled={pushingAction !== null}
                    onClick={() => void handleOneClickTelegramPush('next')}
                    className="rounded-xl border border-sky-400/30 bg-[#0A1835] px-3 py-3 text-xs font-semibold text-sky-200 transition-colors hover:border-[#EAB34B]/60 hover:text-white"
                  >
                    🏥 Keyingi operatsiya
                  </button>
                  <button
                    type="button"
                    disabled={pushingAction !== null}
                    onClick={() => void handleOneClickTelegramPush('ics')}
                    className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
                  >
                    📥 .ICS yuborish
                  </button>
                </div>

                {/* Live Telegram Message Bubble Preview */}
                <div className="mt-5 rounded-2xl border border-sky-400/20 bg-[#040A17] p-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-sky-300">
                    <span>🤖 DoctorZi CRM Bot — Jonli xabar ko‘rinishi</span>
                    <span className="font-mono text-slate-400">Asia/Tashkent (UTC+5)</span>
                  </div>
                  <pre className="max-h-[340px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-100">
                    {botPreviewText || formatDailyCalendarMessage(operations, todayStr)}
                  </pre>
                </div>

                {/* Setup Instructions (Strictly Server-Side Secrets, Zero API Keys in UI) */}
                {!(botStatus?.botConfigured && botStatus?.chatConfigured) && (
                  <div className="mt-5 rounded-2xl border border-sky-400/20 bg-[#071329]/85 p-4 text-xs leading-relaxed text-slate-300">
                    <div className="font-semibold text-[#F6C86E]">
                      Real Telegram Botni 2 qadamda faollashtirish (Secrets orqali):
                    </div>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                      <li>
                        Telegram’da <span className="font-mono text-sky-300">@BotFather</span> orqali bot
                        yarating va tokenni AI Studio <strong>Settings → Secrets</strong> bo‘limiga{' '}
                        <span className="font-mono text-[#FCE19A]">TELEGRAM_BOT_TOKEN</span> nomi bilan qo‘shing.
                      </li>
                      <li>
                        O‘z botingizga <span className="font-mono text-sky-300">/start</span> yuboring — bot
                        sizga <strong>Chat ID</strong> raqamingizni qaytaradi; uni{' '}
                        <span className="font-mono text-[#FCE19A]">TELEGRAM_DOCTOR_CHAT_ID</span> sifatida
                        Secrets’ga saqlang.
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Recent Dispatched Reminder Logs */}
              <div className="neuro-panel rounded-3xl p-5 sm:p-6">
                <h4 className="text-sm font-bold text-white">So‘nggi yuborilgan eslatmalar tarixi</h4>
                {!botStatus?.logs?.length ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Hozircha eslatmalar jurnali bo‘sh. Yuqoridagi tugmalardan birini bosing yoki
                    ertangi avtomatik jadvalni kuting.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {botStatus.logs.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/15 bg-[#050C1C] px-3.5 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">{entry.summary}</div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {new Date(entry.sentAt).toLocaleString()}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-[11px] font-semibold ${
                            entry.deliveredToTelegram ? 'text-emerald-300' : 'text-[#FCE19A]'
                          }`}
                        >
                          {entry.deliveredToTelegram ? 'Yuborildi' : 'Preview'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Automated Daily & Pre-Op Reminder Schedule Settings */}
            <form onSubmit={handleSaveSettings} className="neuro-panel h-fit rounded-3xl p-5 sm:p-6 lg:col-span-5">
              <div className="flex items-center justify-between gap-3 border-b border-sky-400/15 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Avtomatik eslatma jadvali</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Bot har kuni belgilangan vaqtda va har bir operatsiyadan oldin doktorga xabar yuboradi.
                  </p>
                </div>
                <Bell className="h-5 w-5 shrink-0 text-[#F6C86E]" />
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-sky-400/20 bg-[#061024] p-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Kunlik avtomatik eslatmalar</div>
                    <div className="text-xs text-slate-400">
                      Ertalabki reja, kun davomidagi operatsiya oldi ogohlantirishlari
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dailyRemindersEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, dailyRemindersEnabled: e.target.checked }))
                    }
                    className="h-5 w-5 accent-[#EAB34B]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      🌅 Ertalabki kunlik reja
                    </label>
                    <input
                      type="time"
                      value={settings.dailyBriefingTime}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, dailyBriefingTime: e.target.value }))
                      }
                      className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      🌙 Kechki ertangi reja
                    </label>
                    <input
                      type="time"
                      value={settings.eveningPreviewTime}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, eveningPreviewTime: e.target.value }))
                      }
                      className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    📆 Haftalik to‘liq kalendar (+ .ICS) kuni
                  </label>
                  <select
                    value={settings.weeklyDigestDay}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, weeklyDigestDay: Number(e.target.value) }))
                    }
                    className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                  >
                    {WEEKDAY_FULL_UZ.map((dayName, idx) => (
                      <option key={dayName} value={idx}>
                        {dayName} ({settings.dailyBriefingTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-slate-300">
                    ⏱ Kun davomida operatsiyadan oldin eslatish:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[120, 60, 30, 15].map((mins) => {
                      const active = settings.preOpOffsets.includes(mins);
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() =>
                            setSettings((s) => {
                              const next = active
                                ? s.preOpOffsets.filter((v) => v !== mins)
                                : [...s.preOpOffsets, mins].slice(0, 4);
                              return { ...s, preOpOffsets: next.length ? next : [15] };
                            })
                          }
                          className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                            active
                              ? 'border-[#EAB34B] bg-[#EAB34B]/18 text-[#FCE19A]'
                              : 'border-sky-400/20 bg-[#050C1C] text-slate-400 hover:text-white'
                          }`}
                        >
                          {mins >= 60 ? `${mins / 60} soat oldin` : `${mins} daqiqa oldin`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="gold-cta mt-2 min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-60"
                >
                  {savingSettings ? 'Saqlanmoqda...' : 'Eslatma sozlamalarini saqlash'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* =================================================================
          ADD / EDIT OPERATION MODAL
      ================================================================= */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/90 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFormOpen(false)}
        >
          <form
            onSubmit={handleSaveOperation}
            onClick={(e) => e.stopPropagation()}
            className="neuro-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 pb-7 sm:rounded-2xl sm:p-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white sm:text-xl">
                {opForm.id ? 'Operatsiyani tahrirlash' : 'Yangi operatsiya / muolaja qo‘shish'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-400/35 bg-rose-500/12 p-3 text-xs text-rose-200">
                {formError}
              </div>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">Operatsiya / amaliyot nomi *</label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={opForm.procedureTitle}
                  onChange={(e) => setOpForm((f) => ({ ...f, procedureTitle: e.target.value }))}
                  placeholder="Masalan: Epileptologik VNS nazorati / Video-EEG..."
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Bemor ismi-sharifi *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={opForm.patientName}
                  onChange={(e) => setOpForm((f) => ({ ...f, patientName: e.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Bola yoshi *</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={opForm.childAge}
                  onChange={(e) => setOpForm((f) => ({ ...f, childAge: e.target.value }))}
                  placeholder="6 yosh"
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Ota-ona telefoni *</label>
                <input
                  type="tel"
                  required
                  maxLength={32}
                  value={opForm.parentPhone}
                  onChange={(e) => setOpForm((f) => ({ ...f, parentPhone: e.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Operatsiya xonasi / kabinet</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={opForm.room}
                  onChange={(e) => setOpForm((f) => ({ ...f, room: e.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Sana *</label>
                <input
                  type="date"
                  required
                  value={opForm.date}
                  onChange={(e) => setOpForm((f) => ({ ...f, date: e.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3.5 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Vaqt *</label>
                  <input
                    type="time"
                    required
                    value={opForm.startTime}
                    onChange={(e) => setOpForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Davomiyligi (daq)</label>
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={opForm.durationMinutes}
                    onChange={(e) =>
                      setOpForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
                    }
                    className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Turi</label>
                <select
                  value={opForm.category}
                  onChange={(e) =>
                    setOpForm((f) => ({ ...f, category: e.target.value as OperationCategory }))
                  }
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                >
                  <option value="operation">Operatsiya</option>
                  <option value="video_eeg">Video-EEG</option>
                  <option value="rehabilitation">Reabilitatsiya</option>
                  <option value="consultation">Konsultatsiya</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Muhimlik darajasi</label>
                <select
                  value={opForm.priority}
                  onChange={(e) =>
                    setOpForm((f) => ({ ...f, priority: e.target.value as OperationPriority }))
                  }
                  className="min-h-11 w-full rounded-xl border border-sky-400/25 bg-[#050C1C] px-3 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                >
                  <option value="routine">Rejali</option>
                  <option value="urgent">Muhim</option>
                  <option value="critical">Shoshilinch</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">
                  Klinik izoh va tayyorgarlik eslatmalari
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={opForm.notes}
                  onChange={(e) => setOpForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Anesteziya, MRT/EEG natijalari yoki maxsus tayyorgarlik..."
                  className="w-full rounded-xl border border-sky-400/25 bg-[#050C1C] p-3 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-11 rounded-xl border border-sky-400/20 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="gold-cta min-h-11 rounded-xl px-6 py-2 text-xs font-bold disabled:opacity-60 sm:text-sm"
              >
                {formSaving ? 'Saqlanmoqda...' : 'Kalendarga saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function DoctorCrmDashboard(props: DoctorCrmDashboardProps) {
  return (
    <CrmErrorBoundary onBack={props.onBack}>
      <DoctorCrmInner {...props} />
    </CrmErrorBoundary>
  );
}
