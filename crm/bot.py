import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    CallbackQuery
)

from database import SessionLocal
from models import User, Lead, LeadStatus, LeadComment, UserRole
from auth import verify_password
from config import TELEGRAM_BOT_TOKEN

BOT_TOKEN = TELEGRAM_BOT_TOKEN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crm_bot")

bot: Optional[Bot] = None
dp: Optional[Dispatcher] = None

if BOT_TOKEN:
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()


# FSM Holatlari
class BotStates(StatesGroup):
    waiting_username = State()
    waiting_password = State()
    waiting_comment = State()
    waiting_search = State()


def get_tashkent_date(offset_days: int = 0) -> tuple[str, str]:
    """Toshkent vaqti (UTC+5) bo'yicha sana qaytarish (YYYY-MM-DD va chiroyli matn)"""
    tashkent_tz = timezone(timedelta(hours=5))
    target = datetime.now(tashkent_tz) + timedelta(days=offset_days)
    date_str = target.strftime("%Y-%m-%d")
    
    months_uz = [
        "yanvar", "fevral", "mart", "aprel", "may", "iyun",
        "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"
    ]
    human_str = f"{target.day}-{months_uz[target.month - 1]}, {target.year}"
    return date_str, human_str


def get_main_keyboard(is_logged_in: bool = False) -> ReplyKeyboardMarkup:
    """Asosiy doimiy menyu tugmalari (WebApp-siz toza Telegram bot)"""
    if not is_logged_in:
        return ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="🔑 Tizimga kirish")],
            ],
            resize_keyboard=True
        )
    
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📅 Bugungi qabullar"),
                KeyboardButton(text="🗓 Ertangi qabullar")
            ],
            [
                KeyboardButton(text="📋 Barcha leadlar"),
                KeyboardButton(text="🔍 Qidiruv")
            ],
            [
                KeyboardButton(text="📊 Statistika"),
                KeyboardButton(text="ℹ️ Profil"),
                KeyboardButton(text="🚪 Chiqish")
            ]
        ],
        resize_keyboard=True
    )


def get_lead_inline_keyboard(lead_id: int, phone: str, status: LeadStatus) -> InlineKeyboardMarkup:
    """Lead uchun 1-click harakat inline tugmalari"""
    # Status tugmalari
    status_buttons = []
    if status != LeadStatus.CONTACTED:
        status_buttons.append(InlineKeyboardButton(text="🔵 Bog'landim", callback_data=f"st:{lead_id}:contacted"))
    if status != LeadStatus.SCHEDULED:
        status_buttons.append(InlineKeyboardButton(text="🟣 Belgilandi", callback_data=f"st:{lead_id}:scheduled"))
    if status != LeadStatus.COMPLETED:
        status_buttons.append(InlineKeyboardButton(text="✅ Yakunlandi", callback_data=f"st:{lead_id}:completed"))
    if status != LeadStatus.CANCELLED:
        status_buttons.append(InlineKeyboardButton(text="❌ Bekor", callback_data=f"st:{lead_id}:cancelled"))

    rows = [
        [
            InlineKeyboardButton(text="📞 Qo'ng'iroq", callback_data=f"call:{lead_id}"),
            InlineKeyboardButton(text="✍️ Izoh", callback_data=f"cmt:{lead_id}")
        ]
    ]

    # Status o'zgartirish tugmalarini 2 tadan joylashtirish
    if status_buttons:
        rows.append(status_buttons[:2])
        if len(status_buttons) > 2:
            rows.append(status_buttons[2:])

    return InlineKeyboardMarkup(inline_keyboard=rows)


def find_user_by_chat_id(chat_id: int) -> Optional[User]:
    """Chat ID orqali xodimni topish"""
    db = SessionLocal()
    try:
        return db.query(User).filter(User.telegram_chat_id == str(chat_id), User.is_active == True).first()
    finally:
        db.close()


def format_lead_message(lead: Lead) -> str:
    """Lead haqidagi formatlangan chiroyli xabar matni"""
    status_icons = {
        LeadStatus.NEW: "🟡 YANGI",
        LeadStatus.CONTACTED: "🔵 BOG'LANILDI",
        LeadStatus.SCHEDULED: "🟣 UCHRASHUV BELGILANDI",
        LeadStatus.COMPLETED: "✅ YAKUNLANDI",
        LeadStatus.CANCELLED: "❌ BEKOR QILINDI",
    }
    status_text = status_icons.get(lead.status, str(lead.status))

    msg = (
        f"📋 <b>Mijoz Murojaati: #{lead.code}</b>\n"
        f"📊 <b>Holati:</b> {status_text}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Ismi:</b> {lead.parent_name}\n"
        f"📞 <b>Telefon:</b> <code>{lead.phone}</code>\n"
        f"👶 <b>Farzand yoshi:</b> {lead.child_age or 'Koʻrsatilmagan'}\n"
        f"🩺 <b>Yoʻnalish:</b> {lead.specialty_id or 'Umumiy nevrologiya'}\n"
        f"🏥 <b>Format:</b> {'🏥 Klinika qabuli' if lead.format == 'clinic' else '💻 Online konsultatsiya'}\n"
        f"📅 <b>Belgilangan vaqt:</b> {lead.appointment_date or '-'} · {lead.time_slot or '-'}\n"
    )
    if lead.notes:
        msg += f"📝 <b>Shikoyat/Eslatma:</b> <i>{lead.notes}</i>\n"

    # Izohlar tarixi (oxirgi 2 ta)
    if lead.comments:
        msg += "\n💬 <b>Oxirgi izohlar:</b>\n"
        for c in lead.comments[:2]:
            msg += f"• <i>{c.author_name}:</i> {c.text}\n"

    msg += f"\n⏱ <i>Yaratilgan vaqt: {lead.created_at.strftime('%Y-%m-%d %H:%M')}</i>"
    return msg


async def notify_operators_new_lead(lead: Lead):
    """Barcha faol xodimlarga yangi lead tushganda push bildirishnoma yuborish"""
    if not bot:
        logger.info("Telegram bot faol emas.")
        return

    db = SessionLocal()
    try:
        users = db.query(User).filter(User.telegram_chat_id.is_not(None), User.is_active == True).all()
        text = "⚡️ <b>YANGI BUYURTMA KELIB TUSHDI!</b>\n\n" + format_lead_message(lead)
        keyboard = get_lead_inline_keyboard(lead.id, lead.phone, lead.status)

        for u in users:
            try:
                await bot.send_message(
                    chat_id=int(u.telegram_chat_id),
                    text=text,
                    parse_mode="HTML",
                    reply_markup=keyboard
                )
            except Exception as e:
                logger.error(f"Xodimga ({u.username}) xabar yuborishda xato: {e}")
    finally:
        db.close()


def do_login_user(username: str, password: str, chat_id: int) -> tuple[bool, str]:
    """Foydalanuvchi loginini tekshirish va chat_id ni ulash"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username.strip()).first()
        if not user or not verify_password(password, user.password_hash):
            return False, "❌ Notoʻgʻri login yoki parol. Qaytadan urinib koʻring."

        if not user.is_active:
            return False, "⛔️ Profilingiz nofaol holatda. Administratorga murojaat qiling."

        user.telegram_chat_id = str(chat_id)
        db.commit()
        return True, (
            f"✅ <b>Xush kelibsiz, {user.full_name}!</b>\n\n"
            f"Siz CRM tizimiga muvaffaqiyatli ulandingiz. Yangi buyurtmalar va kunlik kalendar xabarnomalari shu yerga keladi."
        )
    finally:
        db.close()


async def send_calendar_appointments(target, target_date: str, human_date: str, title: str):
    """Belgilangan sana bo'yicha qabullarni 1-click da chiqarish"""
    db = SessionLocal()
    try:
        leads = db.query(Lead).filter(Lead.appointment_date == target_date).all()

        tashkent_today, _ = get_tashkent_date(0)
        # Agar appointment_date bo'sh bo'lsa va bugun qidirilayotgan bo'lsa, bugun tushgan yangi leadlarni ham qo'shish
        if not leads and target_date == tashkent_today:
            leads = db.query(Lead).filter(
                Lead.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
            ).all()

        if not leads:
            msg = (
                f"🗓 <b>{title}</b>\n"
                f"📅 Sana: <b>{human_date}</b> (<code>{target_date}</code>)\n\n"
                f"📭 Ushbu kunga belgilangan qabullar yoki murojaatlar mavjud emas."
            )
            await target.answer(msg, parse_mode="HTML")
            return

        # Vaqt bo'yicha tartiblash
        def sort_key(l: Lead):
            return l.time_slot or "99:99"
        leads.sort(key=sort_key)

        header = (
            f"🗓 <b>{title}</b>\n"
            f"📅 Sana: <b>{human_date}</b> (<code>{target_date}</code>)\n"
            f"📊 Jami qabullar soni: <b>{len(leads)} ta</b>\n"
            f"━━━━━━━━━━━━━━━━━━━"
        )
        await target.answer(header, parse_mode="HTML")

        for lead in leads:
            text = format_lead_message(lead)
            keyboard = get_lead_inline_keyboard(lead.id, lead.phone, lead.status)
            await target.answer(text, parse_mode="HTML", reply_markup=keyboard)

    finally:
        db.close()


async def send_daily_briefing_to_staff(bot_instance: Bot, target_date: str, human_date: str, is_morning: bool):
    """Kunlik ertalabki va kechki jadvalni barcha xodimlarga avtomatik yuborish"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.telegram_chat_id.is_not(None), User.is_active == True).all()
        if not users:
            return

        leads = db.query(Lead).filter(Lead.appointment_date == target_date).all()
        count = len(leads)

        if is_morning:
            header = f"🌅 <b>Xayrli tong! Bugungi qabullar jadvali:</b>\n"
        else:
            header = f"🌙 <b>Xayrli kech! Ertangi kunga belgilangan qabullar:</b>\n"

        header += f"📅 Sana: <b>{human_date}</b> (<code>{target_date}</code>)\n"

        if count == 0:
            body = "\n📭 Ushbu kunga rejalashtirilgan qabullar hozircha mavjud emas."
        else:
            def sort_key(l: Lead):
                return l.time_slot or "99:99"
            leads.sort(key=sort_key)

            body = f"📊 Jami belgilangan qabullar: <b>{count} ta</b>\n━━━━━━━━━━━━━━━━━━━\n"
            for idx, l in enumerate(leads, 1):
                time_txt = l.time_slot or "Vaqt belgilanmagan"
                body += f"<b>{idx}. ⏰ {time_txt}</b> — {l.parent_name} ({l.phone})\n"

        msg = header + body

        for u in users:
            try:
                await bot_instance.send_message(
                    chat_id=int(u.telegram_chat_id),
                    text=msg,
                    parse_mode="HTML"
                )
            except Exception as e:
                logger.warning(f"Xodimga ({u.username}) kunlik eslatma yuborishda xatolik: {e}")
    finally:
        db.close()


async def daily_calendar_scheduler(bot_instance: Bot):
    """
    Har kuni avtomatik ravishda:
    - 08:00 (Toshkent vaqti): Bugungi qabullar jadvali
    - 20:00 (Toshkent vaqti): Ertangi qabullar rejasi
    xodimlarga yuborib turadi.
    """
    logger.info("📅 Kunlik kalendar eslatmalari avtomatik xizmati faol!")
    last_morning_sent = ""
    last_evening_sent = ""

    while True:
        try:
            tashkent_tz = timezone(timedelta(hours=5))
            now = datetime.now(tashkent_tz)
            today_str = now.strftime("%Y-%m-%d")
            current_hm = now.strftime("%H:%M")

            # 1. Tonggi eslatma (08:00)
            if current_hm == "08:00" and last_morning_sent != today_str:
                last_morning_sent = today_str
                _, human_today = get_tashkent_date(0)
                await send_daily_briefing_to_staff(bot_instance, target_date=today_str, human_date=human_today, is_morning=True)

            # 2. Kechki preview (20:00)
            if current_hm == "20:00" and last_evening_sent != today_str:
                last_evening_sent = today_str
                tomorrow_str, human_tomorrow = get_tashkent_date(1)
                await send_daily_briefing_to_staff(bot_instance, target_date=tomorrow_str, human_date=human_tomorrow, is_morning=False)

        except Exception as e:
            logger.error(f"Scheduler xatoligi: {e}")

        await asyncio.sleep(25)


# --- BOT HANDLERS ---
if dp:
    @dp.message(CommandStart())
    async def cmd_start(message: types.Message, state: FSMContext):
        await state.clear()
        user = find_user_by_chat_id(message.from_user.id)
        if user:
            await message.answer(
                f"👋 Salom, <b>{user.full_name}</b>!\n\n"
                f"Siz Dr. Zokhidjon CRM tizimiga ulangansiz.\n"
                f"Mijozlar va kalendar bilan ishlash uchun quyidagi menyudan foydalaning:",
                parse_mode="HTML",
                reply_markup=get_main_keyboard(is_logged_in=True)
            )
        else:
            await message.answer(
                "👋 <b>Assalomu alaykum!</b>\n\n"
                "Bu <b>Dr. Zokhidjon CRM</b> xodimlar boti.\n\n"
                "Mijozlar bilan ishlash uchun tizimga kiring:\n"
                "• Pastdagi <b>🔑 Tizimga kirish</b> tugmasini bosing,\n"
                "• Yoki <code>/login username parol</code> buyrug'idan foydalaning.",
                parse_mode="HTML",
                reply_markup=get_main_keyboard(is_logged_in=False)
            )

    @dp.message(F.text == "🔑 Tizimga kirish")
    async def btn_start_login(message: types.Message, state: FSMContext):
        user = find_user_by_chat_id(message.from_user.id)
        if user:
            await message.answer(
                f"✅ Siz allaqachon <b>{user.full_name}</b> sifatida tizimdasiz.",
                parse_mode="HTML",
                reply_markup=get_main_keyboard(is_logged_in=True)
            )
            return

        await state.set_state(BotStates.waiting_username)
        await message.answer(
            "👤 Iltimos, <b>Login</b>ingizni kiriting:",
            parse_mode="HTML",
            reply_markup=types.ReplyKeyboardRemove()
        )

    # Login qadami: username qabul qilish
    @dp.message(BotStates.waiting_username)
    async def process_username(message: types.Message, state: FSMContext):
        text = message.text.strip()
        parts = text.split()

        if len(parts) >= 2:
            u_name, p_word = parts[0], parts[1]
            success, msg = do_login_user(u_name, p_word, message.from_user.id)
            if success:
                await state.clear()
                await message.answer(msg, parse_mode="HTML", reply_markup=get_main_keyboard(is_logged_in=True))
                return
            else:
                await message.answer(msg, parse_mode="HTML")
                await message.answer("Loginingizni qaytadan kiriting:")
                return

        await state.update_data(username=text)
        await state.set_state(BotStates.waiting_password)
        await message.answer(
            f"🔑 Login: <code>{text}</code>\n\nEndi <b>Parol</b>ingizni yozing:",
            parse_mode="HTML"
        )

    # Login qadami: password qabul qilish
    @dp.message(BotStates.waiting_password)
    async def process_password(message: types.Message, state: FSMContext):
        data = await state.get_data()
        username = data.get("username", "")
        password = message.text.strip()

        success, msg = do_login_user(username, password, message.from_user.id)
        if success:
            await state.clear()
            await message.answer(msg, parse_mode="HTML", reply_markup=get_main_keyboard(is_logged_in=True))
        else:
            await message.answer(msg, parse_mode="HTML")
            await message.answer("Loginingizni qaytadan yozing:")
            await state.set_state(BotStates.waiting_username)

    # /login buyrug'i orqali tezkor kirish
    @dp.message(Command("login"))
    async def cmd_login(message: types.Message, state: FSMContext):
        await state.clear()
        parts = message.text.strip().split()
        if len(parts) < 3:
            await state.set_state(BotStates.waiting_username)
            await message.answer(
                "Iltimos, <b>Login</b>ingizni yozing:\n"
                "<i>(Yoki bir yo'la: <code>/login username parol</code>)</i>",
                parse_mode="HTML"
            )
            return

        username, password = parts[1], parts[2]
        success, msg = do_login_user(username, password, message.from_user.id)
        await message.answer(
            msg,
            parse_mode="HTML",
            reply_markup=get_main_keyboard(is_logged_in=success)
        )

    # 1-CLICK: BUGUNGI QABULLAR
    @dp.message(F.text == "📅 Bugungi qabullar")
    @dp.message(Command("today"))
    @dp.message(Command("calendar"))
    async def cmd_today_appointments(message: types.Message):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Avval tizimga kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        today_str, human_today = get_tashkent_date(0)
        await send_calendar_appointments(
            message,
            target_date=today_str,
            human_date=human_today,
            title="📅 Bugungi Qabullar Jadvali"
        )

    # 1-CLICK: ERTANGI QABULLAR
    @dp.message(F.text == "🗓 Ertangi qabullar")
    @dp.message(Command("tomorrow"))
    async def cmd_tomorrow_appointments(message: types.Message):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Avval tizimga kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        tomorrow_str, human_tomorrow = get_tashkent_date(1)
        await send_calendar_appointments(
            message,
            target_date=tomorrow_str,
            human_date=human_tomorrow,
            title="🗓 Ertangi Kunga Belgilangan Qabullar"
        )

    # Chiqish (Logout)
    @dp.message(F.text == "🚪 Chiqish")
    @dp.message(Command("logout"))
    async def cmd_logout(message: types.Message, state: FSMContext):
        await state.clear()
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == str(message.from_user.id)).first()
            if user:
                user.telegram_chat_id = None
                db.commit()
                await message.answer(
                    "🚪 Tizimdan chiqdingiz. Qayta kirish uchun pastdagi tugmani bosing.",
                    reply_markup=get_main_keyboard(is_logged_in=False)
                )
            else:
                await message.answer("Siz kirmagansiz.", reply_markup=get_main_keyboard(is_logged_in=False))
        finally:
            db.close()

    # Mening profilim
    @dp.message(F.text == "ℹ️ Profil")
    @dp.message(F.text == "ℹ️ Mening profilim")
    @dp.message(Command("profile"))
    async def btn_my_profile(message: types.Message):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Siz kirmagansiz. /start orqali kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        await message.answer(
            f"👤 <b>Xodim Profili</b>\n\n"
            f"• Ism: <b>{user.full_name}</b>\n"
            f"• Login: <code>{user.username}</code>\n"
            f"• Rol: <b>{user.role.upper()}</b>\n"
            f"• Telegram Chat ID: <code>{user.telegram_chat_id}</code>\n"
            f"• Holat: {'🟢 Faol' if user.is_active else '🔴 Nofaol'}",
            parse_mode="HTML"
        )

    # Barcha leadlar ro'yxati
    @dp.message(F.text == "📋 Barcha leadlar")
    @dp.message(F.text == "📋 Yangi leadlar")
    @dp.message(Command("leads"))
    async def cmd_leads(message: types.Message):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Avval tizimga kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        db = SessionLocal()
        try:
            leads = db.query(Lead).order_by(Lead.id.desc()).limit(5).all()
            if not leads:
                await message.answer("📭 Hozircha hech qanday buyurtma/lead mavjud emas.")
                return

            await message.answer(f"📋 <b>Oxirgi {len(leads)} ta mijoz buyurtmasi:</b>", parse_mode="HTML")
            for lead in leads:
                text = format_lead_message(lead)
                keyboard = get_lead_inline_keyboard(lead.id, lead.phone, lead.status)
                await message.answer(text, parse_mode="HTML", reply_markup=keyboard)
        finally:
            db.close()

    # Qidiruv boshlash
    @dp.message(F.text == "🔍 Qidiruv")
    async def btn_start_search(message: types.Message, state: FSMContext):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Avval tizimga kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        await state.set_state(BotStates.waiting_search)
        await message.answer(
            "🔍 Qidirilayotgan mijozning <b>ismi</b>, <b>telefon raqami</b> yoki <b>kodini</b> yozing:\n"
            "<i>(Masalan: <code>Madina</code> yoki <code>90123</code>)</i>",
            parse_mode="HTML"
        )

    # Qidiruv natijalarini ko'rsatish
    @dp.message(BotStates.waiting_search)
    async def process_search(message: types.Message, state: FSMContext):
        query_text = message.text.strip()
        await state.clear()

        db = SessionLocal()
        try:
            from sqlalchemy import or_
            p = f"%{query_text}%"
            leads = db.query(Lead).filter(
                or_(
                    Lead.parent_name.ilike(p),
                    Lead.phone.ilike(p),
                    Lead.code.ilike(p),
                    Lead.notes.ilike(p)
                )
            ).order_by(Lead.id.desc()).limit(5).all()

            if not leads:
                await message.answer(f"🔍 '<b>{query_text}</b>' bo'yicha hech kim topilmadi.", parse_mode="HTML")
                return

            await message.answer(f"🔍 Topildi: <b>{len(leads)} ta natija</b>:", parse_mode="HTML")
            for lead in leads:
                text = format_lead_message(lead)
                keyboard = get_lead_inline_keyboard(lead.id, lead.phone, lead.status)
                await message.answer(text, parse_mode="HTML", reply_markup=keyboard)
        finally:
            db.close()

    # Statistika
    @dp.message(F.text == "📊 Statistika")
    @dp.message(Command("stats"))
    async def cmd_stats(message: types.Message):
        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Avval tizimga kiring.", reply_markup=get_main_keyboard(is_logged_in=False))
            return

        db = SessionLocal()
        try:
            total = db.query(Lead).count()
            new_cnt = db.query(Lead).filter(Lead.status == LeadStatus.NEW).count()
            contacted_cnt = db.query(Lead).filter(Lead.status == LeadStatus.CONTACTED).count()
            scheduled_cnt = db.query(Lead).filter(Lead.status == LeadStatus.SCHEDULED).count()
            completed_cnt = db.query(Lead).filter(Lead.status == LeadStatus.COMPLETED).count()
            cancelled_cnt = db.query(Lead).filter(Lead.status == LeadStatus.CANCELLED).count()

            conversion = 0.0
            if total > 0:
                conversion = round((completed_cnt / total) * 100, 1)

            text = (
                f"📊 <b>Dr. Zokhidjon CRM Statistikasi:</b>\n\n"
                f"• Jami mijozlar: <b>{total}</b>\n"
                f"• 🟡 Yangi (koʻrilmagan): <b>{new_cnt}</b>\n"
                f"• 🔵 Bogʻlanilgan: <b>{contacted_cnt}</b>\n"
                f"• 🟣 Uchrashuv belgilangan: <b>{scheduled_cnt}</b>\n"
                f"• ✅ Yakunlangan qabullar: <b>{completed_cnt}</b>\n"
                f"• ❌ Bekor qilingan: <b>{cancelled_cnt}</b>\n\n"
                f"🎯 <b>Muvaffaqiyatli konversiya:</b> <b>{conversion}%</b>"
            )
            await message.answer(text, parse_mode="HTML")
        finally:
            db.close()

    # 1-CLICK STATUS O'ZGARTIRISH (INLINE CALLBACK)
    @dp.callback_query(F.data.startswith("st:"))
    async def cb_change_status(query: CallbackQuery):
        user = find_user_by_chat_id(query.from_user.id)
        if not user:
            await query.answer("Avval tizimga kiring!", show_alert=True)
            return

        parts = query.data.split(":")
        lead_id = int(parts[1])
        new_status_raw = parts[2]

        status_map = {
            "contacted": LeadStatus.CONTACTED,
            "scheduled": LeadStatus.SCHEDULED,
            "completed": LeadStatus.COMPLETED,
            "cancelled": LeadStatus.CANCELLED,
            "new": LeadStatus.NEW,
        }
        new_status = status_map.get(new_status_raw)
        if not new_status:
            await query.answer("Noto'g'ri holat!", show_alert=True)
            return

        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                await query.answer("Mijoz topilmadi!", show_alert=True)
                return

            lead.status = new_status
            lead.updated_at = datetime.utcnow()

            # Avtomatik izoh yozish
            status_labels = {
                LeadStatus.CONTACTED: "Bog'lanildi (Qo'ng'iroq qilindi)",
                LeadStatus.SCHEDULED: "Uchrashuv/Qabul belgilandi",
                LeadStatus.COMPLETED: "Ko'rik muvaffaqiyatli yakunlandi",
                LeadStatus.CANCELLED: "Murojaat bekor qilindi",
                LeadStatus.NEW: "Yangi holatga qaytarildi"
            }
            comment = LeadComment(
                lead_id=lead.id,
                user_id=user.id,
                author_name=user.full_name,
                text=f"Holat o'zgartirildi: {status_labels.get(new_status, new_status.value)}"
            )
            db.add(comment)
            db.commit()
            db.refresh(lead)

            new_text = format_lead_message(lead) + f"\n\n✍️ <i>Oxirgi amal: {user.full_name} ({new_status.value.upper()})</i>"
            new_keyboard = get_lead_inline_keyboard(lead.id, lead.phone, lead.status)

            try:
                await query.message.edit_text(new_text, parse_mode="HTML", reply_markup=new_keyboard)
                await query.answer(f"✅ Holat o'zgartirildi: {new_status.value.upper()}")
            except Exception:
                await query.answer("Holat yangilandi!")
        finally:
            db.close()

    # QO'NG'IROQ RAQAMINI KO'RSATISH CALLBACK
    @dp.callback_query(F.data.startswith("call:"))
    async def cb_show_call_info(query: CallbackQuery):
        parts = query.data.split(":")
        lead_id = int(parts[1])
        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if lead:
                await query.answer(f"📞 Mijoz: {lead.parent_name}\nTel: {lead.phone}", show_alert=True)
            else:
                await query.answer("Mijoz topilmadi!", show_alert=True)
        finally:
            db.close()

    # IZOH QO'SHISH CALLBACK
    @dp.callback_query(F.data.startswith("cmt:"))
    async def cb_start_comment(query: CallbackQuery, state: FSMContext):
        user = find_user_by_chat_id(query.from_user.id)
        if not user:
            await query.answer("Avval tizimga kiring!", show_alert=True)
            return

        lead_id = int(query.data.split(":")[1])
        await state.update_data(lead_id=lead_id)
        await state.set_state(BotStates.waiting_comment)

        await query.answer()
        await query.message.answer(
            f"✍️ <b>#{lead_id}-raqamli mijoz uchun izohingizni yozib yuboring:</b>\n"
            f"<i>(Masalan: Ertaga soat 14:00 ga chaqirildi, qayta qo'ng'iroq qiladi)</i>",
            parse_mode="HTML"
        )

    # Izoh matnini qabul qilish va saqlash
    @dp.message(BotStates.waiting_comment)
    async def process_lead_comment(message: types.Message, state: FSMContext):
        data = await state.get_data()
        lead_id = data.get("lead_id")
        comment_text = message.text.strip()
        await state.clear()

        user = find_user_by_chat_id(message.from_user.id)
        if not user:
            await message.answer("Siz tizimga kirmagansiz.")
            return

        db = SessionLocal()
        try:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                await message.answer("Mijoz topilmadi.")
                return

            comment = LeadComment(
                lead_id=lead.id,
                user_id=user.id,
                author_name=user.full_name,
                text=comment_text
            )
            db.add(comment)
            db.commit()

            await message.answer(
                f"✅ <b>Izoh muvaffaqiyatli saqlandi!</b>\n\n"
                f"Mijoz: <b>{lead.parent_name} (#{lead.code})</b>\n"
                f"Izoh: <i>{comment_text}</i>",
                parse_mode="HTML"
            )
        finally:
            db.close()

    # Noma'lum yoki erkin kiritilgan xabarlar
    @dp.message()
    async def fallback_any_message(message: types.Message, state: FSMContext):
        text = message.text.strip()
        parts = text.split()

        # Agar foydalanuvchi login va parolni probel bilan yozsa
        if len(parts) == 2 and not text.startswith("/"):
            success, msg = do_login_user(parts[0], parts[1], message.from_user.id)
            if success:
                await message.answer(msg, parse_mode="HTML", reply_markup=get_main_keyboard(is_logged_in=True))
                return

        user = find_user_by_chat_id(message.from_user.id)
        if user:
            await message.answer(
                "Kerakli boʻlimni tanlang:",
                reply_markup=get_main_keyboard(is_logged_in=True)
            )
        else:
            await message.answer(
                "Tizimga kirish uchun <b>🔑 Tizimga kirish</b> tugmasini bosing yoki login va parolingizni yuboring.",
                parse_mode="HTML",
                reply_markup=get_main_keyboard(is_logged_in=False)
            )
