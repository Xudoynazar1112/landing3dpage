# 🏥 Dr. Zokhidjon CRM & Telegram WebApp Tizimi

Landing page orqali raqamini va murojaatini qoldirgan mijozlar bilan tezkor ishlash uchun mo'ljallangan yengil, mustaqil va juda qulay **1-2 click CRM tizimi**.

---

## 🚀 Asosiy Imkoniyatlar

1. **1-2 Click bilan ishlash (Oddiy va o'ta qulay UI):**
   - Xodim bitta bosish bilan mijozga telefon qiladi (`tel:+998...`).
   - Bitta bosish bilan Telegram orqali xabar yozadi.
   - Bitta bosish bilan mijoz holatini o'zgartiradi:
     - 🟡 **Yangi** ➡️ 🔵 **Bog'lanildi** ➡️ 🟣 **Belgilandi** ➡️ ✅ **Yakunlandi** (yoki ❌ **Bekor**).
   - Real-time qidiruv (ism, telefon, buyurtma kodi bo'yicha).
   - Holatlar bo'yicha tezkor filtrlash va har bir leadga tezkor izohlar qoldirish.

2. **Python Backend (FastAPI + SQLite):**
   - Tezkor asinxron va ixcham arxitektura.
   - JWT autentifikatsiya (Admin va Operator rollari).
   - Sayt uchun ochiq `POST /api/leads` endpointi (CORS yoqilgan).
   - Avtomatik KPI va statistika hisoblash (kunlik tushum, konversiya foizi).

3. **Telegram Bot integratsiyasi:**
   - Saytdan yangi lead kelishi bilan tizimga ulangan barcha faol xodimlarga **lahzalik push bildirishnoma** yuboriladi.
   - Botdagi xabarda inline tugmalar bor: 
     `[📞 Qo'ng'iroq qilish]` `[🟢 Bog'landim]` `[📅 Belgilandi]` `[❌ Bekor]` `[📱 WebApp'da ochish]`.
   - Xodim bot orqali login qiladi: `/login <username> <parol>`.
   - `/leads` - oxirgi buyurtmalar, `/stats` - tezkor statistika.

4. **Telegram Web App (Mini App):**
   - Bot menyusidagi `[📱 CRM WebApp ochish]` tugmasi orqali to'g'ridan-to'g'ri Telegram ichida to'liq CRM boshqaruv paneli ochiladi.
   - Telegram tema ranglariga va mobil ekranga avtomatik moslashadi.
   - Xodim bot yoki WebApp'dan o'ziga qulay bo'lgan usulda birdek foydalana oladi.

5. **Modullik va Mavjud Loyihani Saqlash:**
   - Joriy landing page kodlariga ziyon yetkazilmagan, barcha backend va CRM fayllari `crm/` papkasida to'liq avtonom saqlangan.

---

## 📁 Fayllar Strukturasi

```
crm/
├── venv/                   # Python virtual muhiti (o'rnatilgan kutubxonalar)
├── .env                    # Sozlamalar va Telegram bot tokeni
├── .env.example            # Sozlamalar namunasi
├── config.py               # Muhit o'zgaruvchilari
├── database.py             # SQLite ulanishi va jadvallarni initsializatsiya qilish
├── models.py               # Ma'lumotlar bazasi modellari (User, Lead, LeadComment)
├── schemas.py              # Pydantic schemalari
├── auth.py                 # Xavfsizlik, bcrypt parol hashing va JWT tokenlar
├── crm_api.py              # FastAPI REST API endpointlari va statik fayllar
├── bot.py                  # Aiogram 3 Telegram Bot va WebApp integratsiyasi
├── run.py                  # Yagona boshqaruv skripti (FastAPI + Bot bir vaqtda ishlaydi)
├── init_db.py              # Boshlang'ich jadvallar va namuna ma'lumotlar
├── crm_connector.ts        # Landing page uchun tayyor yuborish helperi
├── static/                 # CRM Frontend / WebApp fayllari
│   ├── index.html          # Zamonaviy, toza, 1-click boshqaruv paneli
│   ├── app.js              # Reaktiv frontend logikasi va Telegram SDK
│   └── style.css           # Clean CSS uslublari
└── crm.db                  # SQLite ma'lumotlar bazasi
```

---

## 🛠 Ishga Tushirish

### 1. Dastlabki bazani tekshirish:
```bash
cd crm
./venv/bin/python init_db.py
```
*(Baza avtomatik yaratiladi, standart `admin` va `operator` profillari hamda demo leadlar kiritiladi)*

### 2. Tizimni ishga tushirish (Web panel + Bot):
```bash
cd crm
./venv/bin/python run.py
```

Server ishga tushgach:
- 🌐 **CRM Web Panel / WebApp:** `http://localhost:8001/`
- 📖 **Swagger API Hujjatlari:** `http://localhost:8001/docs`
- 🖥 **Landing Page:** `http://localhost:5173/`

---

## 🔑 Standart Kirish Ma'lumotlari

| Rol | Login | Parol |
| :--- | :--- | :--- |
| **Bosh Administrator** | `admin` | `admin123` |
| **Operator** | `operator` | `operator123` |

---

## 🤖 Telegram Bot va Web App sozlash

1. Telegramda [@BotFather](https://t.me/BotFather) ga kiring va `/newbot` buyrug'i orqali yangi bot yarating.
2. Olingan `token`ni `crm/.env` fayliga yozing:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   WEBAPP_URL=http://localhost:8000
   ```
3. Xodimlar Telegram botga kirib `/start` bosishadi va tizimga ulanish uchun quyidagicha yozishadi:
   ```
   /login operator operator123
   ```
4. **Tayyor!** Endi landing page orqali qoldirilgan har bir buyurtma xodimga Telegram orqali zudlik bilan yetib boradi va 1 click bilan ishlanadi.

---

## 🔗 Landing Pagedan Lead Yuborish (Namuna)

Saytdan yangi lead yuborish uchun quyidagi oddiy `fetch` so'rovidan foydalanishingiz mumkin:

```javascript
fetch('http://localhost:8000/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parent_name: "Aziza Karimova",
    phone: "+998901234567",
    child_age: "4 yosh",
    specialty_id: "speech-delay",
    format: "clinic",
    appointment_date: "2026-11-25",
    time_slot: "14:00",
    notes: "Farzandimizda nutq kechikishi bor"
  })
});
```
Yoki `crm/crm_connector.ts` faylini landing page ichida import qilib chaqirishingiz mumkin.

