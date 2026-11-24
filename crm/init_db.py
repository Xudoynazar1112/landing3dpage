from datetime import datetime
from database import init_models, SessionLocal
from models import User, Lead, LeadComment, UserRole, LeadStatus
from auth import hash_password


def init_database_data():
    """Boshlang'ich jadvallar, foydalanuvchilar va demo ma'lumotlarni yaratish"""
    print("⚙️  Ma'lumotlar bazasi initsializatsiya qilinmoqda...")
    init_models()

    db = SessionLocal()
    try:
        # 1. Standart foydalanuvchilar (admin va operator)
        admin_user = db.query(User).filter(User.username == "admin").first()

        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=hash_password("admin123"),
                full_name="Bosh Shifokor / Admin",
                role=UserRole.ADMIN,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(admin_user)

            operator_user = User(
                username="operator",
                password_hash=hash_password("operator123"),
                full_name="Aziza Karimova (Operator)",
                role=UserRole.OPERATOR,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(operator_user)
            db.commit()
            print("✅ Standart xodimlar yaratildi: 'admin' (parol: admin123), 'operator' (parol: operator123)")

        # 2. Demo leadlar
        existing_leads_count = db.query(Lead).count()

        if existing_leads_count == 0:
            demo_leads = [
                Lead(
                    code="DZ-784102",
                    parent_name="Madina Usmonova",
                    phone="+998901234567",
                    child_age="3 yosh",
                    specialty_id="speech-delay",
                    format="clinic",
                    appointment_date="2026-11-23",
                    time_slot="14:00",
                    notes="Bolamiz 3 yoshda, so'zlarni kam gapiryapti, tekshiruvdan o'tmoqchimiz.",
                    status=LeadStatus.NEW,
                    created_at=datetime.utcnow()
                ),
                Lead(
                    code="DZ-651239",
                    parent_name="Bobur Alimov",
                    phone="+998935551122",
                    child_age="7 yosh",
                    specialty_id="adhd",
                    format="clinic",
                    appointment_date="2026-11-24",
                    time_slot="15:00",
                    notes="Maktabda diqqatini jamlay olmayapti, giperfaollik belgilari bor.",
                    status=LeadStatus.CONTACTED,
                    created_at=datetime.utcnow()
                ),
                Lead(
                    code="DZ-912384",
                    parent_name="Nargiza Xoliqova",
                    phone="+998977114488",
                    child_age="1.5 yosh",
                    specialty_id="infant-neurology",
                    format="online",
                    appointment_date="2026-11-25",
                    time_slot="10:00 (Sat)",
                    notes="Viloyatdanmiz, onlayn konsultatsiya orqali maslahat olmoqchimiz.",
                    status=LeadStatus.SCHEDULED,
                    created_at=datetime.utcnow()
                ),
                Lead(
                    code="DZ-438901",
                    parent_name="Jasur Rahimov",
                    phone="+998946667788",
                    child_age="5 yosh",
                    specialty_id="epilepsy",
                    format="clinic",
                    appointment_date="2026-11-20",
                    time_slot="16:00",
                    notes="EEG xulosasi bilan ko'rikka keldik, davolash kursi belgilandi.",
                    status=LeadStatus.COMPLETED,
                    created_at=datetime.utcnow()
                )
            ]
            db.add_all(demo_leads)
            db.commit()
            print("✅ 4 ta demo mijoz (lead) qo'shildi.")

        print("🎉 Baza to'liq tayyor bo'ldi!")
    finally:
        db.close()


if __name__ == "__main__":
    init_database_data()
