import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  Video,
  Building2,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  CLINIC_CONTACTS,
  SPECIALTIES,
  UI_COPY,
  type Locale,
  type SpecialtyId,
} from '../data/neurologyData';
import { db } from '../lib/firebase';

interface BookingRecord {
  code: string;
  parentName: string;
  phone: string;
  childAge: string;
  specialtyId: SpecialtyId;
  format: 'clinic' | 'online';
  date: string;
  timeSlot: string;
  notes: string;
  createdAt: string;
}

interface BookingSectionProps {
  locale: Locale;
  selectedSpecialty: SpecialtyId;
  onSelectSpecialty: (id: SpecialtyId) => void;
}

const STORAGE_KEY = 'dr_zokhidjon_bookings_v1';
const TIME_SLOTS = ['13:00', '14:00', '15:00', '16:00', '17:00', '10:00 (Sat)'];

const MAP_LABELS: Record<Locale, { title: string; google: string; yandex: string }> = {
  uz: {
    title: 'Klinika xaritada (lokatsiya)',
    google: 'Google Maps',
    yandex: 'Yandex Maps',
  },
  ru: {
    title: 'Локация клиники на карте',
    google: 'Google Карты',
    yandex: 'Яндекс Карты',
  },
  en: {
    title: 'Clinic Location on Map',
    google: 'Google Maps',
    yandex: 'Yandex Maps',
  },
};

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function BookingSection({
  locale,
  selectedSpecialty,
  onSelectSpecialty,
}: BookingSectionProps) {
  const copy = UI_COPY[locale].booking;

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [childAge, setChildAge] = useState('');
  const [format, setFormat] = useState<'clinic' | 'online'>('clinic');
  const [date, setDate] = useState(getDefaultDate);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedRecord, setSubmittedRecord] = useState<BookingRecord | null>(null);
  const [savedBookings, setSavedBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BookingRecord[];
        if (Array.isArray(parsed)) setSavedBookings(parsed.slice(0, 3));
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const digitsOnly = phone.replace(/\D/g, '');

    if (parentName.trim().length < 2) {
      nextErrors.name = copy.errors.name;
    }
    if (digitsOnly.length < 9) {
      nextErrors.phone = copy.errors.phone;
    }
    if (childAge.trim().length < 1) {
      nextErrors.age = copy.errors.age;
    }
    if (!date) {
      nextErrors.date = copy.errors.date;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const code = `DZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanName = parentName.trim().slice(0, 120);
    const cleanPhone = phone.trim().slice(0, 32);
    const cleanAge = childAge.trim().slice(0, 40);
    const cleanNotes = notes.trim().slice(0, 800);

    const record: BookingRecord = {
      code,
      parentName: cleanName,
      phone: cleanPhone,
      childAge: cleanAge,
      specialtyId: selectedSpecialty,
      format,
      date,
      timeSlot,
      notes: cleanNotes,
      createdAt: new Date().toISOString(),
    };

    const nextList = [record, ...savedBookings].slice(0, 3);
    setSavedBookings(nextList);
    setSubmittedRecord(record);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage quota errors
    }

    // Persist directly to Firestore CRM pipeline (strictly validated create-only rule)
    void setDoc(doc(db, 'bookings', code), {
      code,
      parentName: cleanName,
      phone: cleanPhone,
      childAge: cleanAge,
      specialtyId: selectedSpecialty,
      format,
      date,
      timeSlot,
      notes: cleanNotes,
      status: 'new',
      createdAt: serverTimestamp(),
    }).catch((err) => {
      console.error('Firestore booking create failed:', err);
    });

    // Notify server Telegram bot so doctor receives immediate ping for new booking
    void fetch('/api/public/booking-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        parentName: cleanName,
        phone: cleanPhone,
        childAge: cleanAge,
        specialtyId: selectedSpecialty,
        format,
        date,
        timeSlot,
        notes: cleanNotes,
      }),
    }).catch(() => {});
  };

  const resetForm = () => {
    setSubmittedRecord(null);
    setParentName('');
    setPhone('+998 ');
    setChildAge('');
    setNotes('');
  };

  const getSpecialtyTitle = (id: SpecialtyId) =>
    SPECIALTIES.find((s) => s.id === id)?.title[locale] ?? id;

  return (
    <section id="booking" className="relative overflow-x-clip py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1840px] px-4 sm:px-6 lg:px-10 xl:px-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="neuro-panel overflow-hidden rounded-3xl p-5 sm:p-10 lg:p-12 xl:p-14"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-12 xl:gap-16">
            {/* Left column: Authentic drzokhidjon.uz clinic details & direct contacts */}
            <div className="min-w-0 lg:col-span-5">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {copy.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {copy.subheading}
              </p>

              <div className="mt-7 space-y-4 border-t border-sky-400/15 pt-6 sm:mt-8 sm:space-y-5 sm:pt-7">
                <div className="flex items-start gap-3.5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#F6C86E]" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-400">
                      {copy.clinicAddressTitle}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-slate-100">
                      {copy.clinicAddress}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#F6C86E]" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-400">
                      {copy.hoursTitle}
                    </div>
                    <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-100 sm:text-sm">
                      {copy.hoursValue}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#F6C86E]" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-400">
                      {copy.phonesTitle}
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {CLINIC_CONTACTS.phones.map((num) => (
                        <a
                          key={num}
                          href={`tel:${num.replace(/\s+/g, '')}`}
                          className="font-mono text-xs tabular-nums text-slate-200 transition-colors hover:text-[#F6C86E]"
                        >
                          {num}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <Mail className="h-5 w-5 shrink-0 text-[#F6C86E]" />
                  <a
                    href={`mailto:${CLINIC_CONTACTS.email}`}
                    className="font-mono text-xs text-sky-300 transition-colors hover:text-[#F6C86E] sm:text-sm"
                  >
                    {CLINIC_CONTACTS.email}
                  </a>
                </div>
              </div>

              {/* Direct WhatsApp & Telegram buttons */}
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={CLINIC_CONTACTS.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#EAB34B]/35 bg-[#0A1733] px-4 py-3 text-sm font-medium text-[#FCE19A] transition-colors hover:border-[#EAB34B] hover:bg-[#11234A]"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{copy.whatsapp}</span>
                </a>
                <a
                  href={CLINIC_CONTACTS.telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#EAB34B]/35 bg-[#0A1733] px-4 py-3 text-sm font-medium text-[#FCE19A] transition-colors hover:border-[#EAB34B] hover:bg-[#11234A]"
                >
                  <Send className="h-4 w-4 shrink-0" />
                  <span className="truncate">{copy.telegram}</span>
                </a>
              </div>

              {/* Authentic drzokhidjon.uz Clinic Location Map (41.3631232, 69.2412239) */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-sky-400/25 bg-[#050C1C]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Navigation className="h-3.5 w-3.5 text-[#F6C86E]" />
                    <span>{MAP_LABELS[locale].title}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-sky-300">
                    {CLINIC_CONTACTS.mapLat.toFixed(5)}, {CLINIC_CONTACTS.mapLng.toFixed(5)}
                  </span>
                </div>
                <div className="relative h-[200px] w-full bg-[#071226] sm:h-[225px]">
                  <iframe
                    src={CLINIC_CONTACTS.googleMapsEmbedUrl}
                    title={copy.clinicAddress}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full border-0 brightness-[0.92] contrast-[1.05]"
                  />
                </div>
                <div className="grid grid-cols-2 divide-x divide-sky-400/15 border-t border-sky-400/15 bg-[#071329]/95">
                  <a
                    href={CLINIC_CONTACTS.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-sky-500/10 hover:text-[#FCE19A]"
                  >
                    <span>{MAP_LABELS[locale].google}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#F6C86E]" />
                  </a>
                  <a
                    href={CLINIC_CONTACTS.yandexMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-sky-500/10 hover:text-[#FCE19A]"
                  >
                    <span>{MAP_LABELS[locale].yandex}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#F6C86E]" />
                  </a>
                </div>
              </div>

              {/* Saved recent requests from localStorage */}
              {savedBookings.length > 0 && (
                <div className="mt-7 border-t border-sky-400/15 pt-5">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-400">
                    {copy.recentBookings}
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {savedBookings.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/15 bg-[#061024]/80 px-4 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">
                            {getSpecialtyTitle(item.specialtyId)}
                          </div>
                          <div className="mt-0.5 font-mono tabular-nums text-slate-400">
                            {item.date} · {item.timeSlot}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono font-semibold text-[#F6C86E]">
                          {item.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Interactive Validated Booking Form */}
            <div className="min-w-0 lg:col-span-7">
              {submittedRecord ? (
                <div className="rounded-2xl border border-[#EAB34B]/40 bg-[#07132A] p-5 sm:p-8">
                  <div className="flex items-center gap-3 text-[#F6C86E]">
                    <CheckCircle2 className="h-7 w-7 shrink-0" />
                    <h3 className="text-lg font-bold text-white sm:text-xl">
                      {copy.successTitle}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{copy.successDesc}</p>

                  <div className="mt-6 grid gap-4 border-y border-sky-400/15 py-5 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">{copy.referenceCode}</div>
                      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#F6C86E]">
                        {submittedRecord.code}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{copy.specialty}</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {getSpecialtyTitle(submittedRecord.specialtyId)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">
                        {copy.date} · {copy.timeSlot}
                      </div>
                      <div className="mt-1 font-mono text-sm tabular-nums text-slate-100">
                        {submittedRecord.date} · {submittedRecord.timeSlot}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{copy.parentName}</div>
                      <div className="mt-1 text-sm text-slate-100">
                        {submittedRecord.parentName} ({submittedRecord.childAge})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-6 min-h-11 rounded-xl border border-sky-400/30 bg-[#0C1D3F] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#EAB34B]/60"
                  >
                    {copy.bookAnother}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
                  {/* Consultation Format Segmented Switch */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-300">
                      {copy.format}
                    </label>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFormat('clinic')}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                          format === 'clinic'
                            ? 'border-[#EAB34B]/70 bg-[#142952] text-[#FCE19A]'
                            : 'border-sky-400/20 bg-[#071226] text-slate-300 hover:border-sky-400/40'
                        }`}
                      >
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{copy.formatClinic}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormat('online')}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                          format === 'online'
                            ? 'border-[#EAB34B]/70 bg-[#142952] text-[#FCE19A]'
                            : 'border-sky-400/20 bg-[#071226] text-slate-300 hover:border-sky-400/40'
                        }`}
                      >
                        <Video className="h-4 w-4 shrink-0" />
                        <span className="truncate">{copy.formatOnline}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="booking-name"
                        className="mb-1.5 block text-xs font-medium text-slate-300"
                      >
                        {copy.parentName}
                      </label>
                      <input
                        id="booking-name"
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder={copy.parentNamePlaceholder}
                        className="w-full rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#EAB34B] focus:outline-none"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-amber-400">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="booking-phone"
                        className="mb-1.5 block text-xs font-medium text-slate-300"
                      >
                        {copy.phone}
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={copy.phonePlaceholder}
                        className="w-full rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-[#EAB34B] focus:outline-none"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-amber-400">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="booking-age"
                        className="mb-1.5 block text-xs font-medium text-slate-300"
                      >
                        {copy.childAge}
                      </label>
                      <input
                        id="booking-age"
                        type="text"
                        value={childAge}
                        onChange={(e) => setChildAge(e.target.value)}
                        placeholder={copy.childAgePlaceholder}
                        className="w-full rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#EAB34B] focus:outline-none"
                      />
                      {errors.age && (
                        <p className="mt-1 text-xs text-amber-400">{errors.age}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="booking-specialty"
                        className="mb-1.5 block text-xs font-medium text-slate-300"
                      >
                        {copy.specialty}
                      </label>
                      <select
                        id="booking-specialty"
                        value={selectedSpecialty}
                        onChange={(e) => onSelectSpecialty(e.target.value as SpecialtyId)}
                        className="w-full rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                      >
                        {SPECIALTIES.map((sp) => (
                          <option key={sp.id} value={sp.id} className="bg-[#061024] text-white">
                            {sp.title[locale]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="booking-date"
                        className="mb-1.5 block text-xs font-medium text-slate-300"
                      >
                        {copy.date}
                      </label>
                      <input
                        id="booking-date"
                        type="date"
                        value={date}
                        min={getDefaultDate()}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 font-mono text-sm text-white focus:border-[#EAB34B] focus:outline-none"
                      />
                      {errors.date && (
                        <p className="mt-1 text-xs text-amber-400">{errors.date}</p>
                      )}
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-slate-300">
                        {copy.timeSlot}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTimeSlot(slot)}
                            className={`min-h-10 rounded-lg border px-1 py-2 font-mono text-[11px] tabular-nums transition-colors sm:text-xs ${
                              timeSlot === slot
                                ? 'border-[#EAB34B] bg-[#EAB34B]/20 font-semibold text-[#FCE19A]'
                                : 'border-sky-400/20 bg-[#061024] text-slate-300 hover:border-sky-400/45'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-notes"
                      className="mb-1.5 block text-xs font-medium text-slate-300"
                    >
                      {copy.notes}
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={copy.notesPlaceholder}
                      className="w-full resize-none rounded-xl border border-sky-400/20 bg-[#061024] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#EAB34B] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="gold-cta flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl px-6 py-3.5 text-sm font-bold tracking-tight transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:min-h-14 sm:text-base"
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    <span>{copy.submit}</span>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
