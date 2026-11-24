import os
import random
from pathlib import Path
from typing import Optional, List
from datetime import datetime, date

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func

from database import get_db, init_models
from models import Lead, LeadComment, User, LeadStatus, UserRole
from schemas import (
    LeadCreate, LeadUpdate, LeadStatusUpdate, LeadOut, LeadCommentCreate, LeadCommentOut,
    LoginRequest, TokenResponse, UserOut, StatsSummary
)
from auth import verify_password, create_access_token, get_current_user
from bot import notify_operators_new_lead

app = FastAPI(
    title="Dr. Zokhidjon CRM API",
    description="Landing page leadlari va xodimlar uchun qulay CRM tizimi",
    version="1.0.0"
)

# CORS sozlamalari
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================
# 1. AUTH ENDPOINTS
# ==========================================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Xodimlar (admin / operator) login qilishi"""
    user = db.query(User).filter(User.username == req.username.strip()).first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Noto'g'ri login yoki parol"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisobingiz nofaol holatda. Administratorga murojaat qiling."
        )

    token = create_access_token(data={"sub": user.username, "role": user.role.value, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Joriy tizimga kirgan xodim ma'lumotlari"""
    return current_user


@app.post("/api/telegram/webapp-auth")
def telegram_webapp_auth(payload: dict, db: Session = Depends(get_db)):
    """Telegram WebApp ochilganda tezkor chat_id orqali avtologin"""
    chat_id = payload.get("telegram_chat_id")
    if not chat_id:
        return JSONResponse(status_code=400, content={"error": "chat_id berilmagan"})

    user = db.query(User).filter(User.telegram_chat_id == str(chat_id), User.is_active == True).first()
    if not user:
        return JSONResponse(status_code=404, content={"error": "Xodim topilmadi. Avval botda /login qiling"})

    token = create_access_token(data={"sub": user.username, "role": user.role.value, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }


# ==========================================
# 2. LEADS ENDPOINTS
# ==========================================

@app.post("/api/public/booking-alert", response_model=dict)
@app.post("/api/leads", response_model=dict)
async def create_lead_from_landing(lead_in: LeadCreate, db: Session = Depends(get_db)):
    """Landing page orqali keladigan yangi lead (buyurtma)"""
    code = lead_in.code or f"DZ-{random.randint(100000, 999999)}"
    
    lead = Lead(
        code=code,
        parent_name=lead_in.get_parent_name(),
        phone=lead_in.phone.strip(),
        child_age=lead_in.get_child_age(),
        specialty_id=lead_in.get_specialty_id(),
        format=lead_in.format.strip() if lead_in.format else "clinic",
        appointment_date=lead_in.get_appointment_date(),
        time_slot=lead_in.get_time_slot(),
        notes=lead_in.get_notes(),
        status=LeadStatus.NEW,
        created_at=datetime.utcnow()
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Telegram bot orqali barcha xodimlarga bildirishnoma yuborish
    try:
        await notify_operators_new_lead(lead)
    except Exception as e:
        print(f"Telegram bot xabar yuborishda xatolik: {e}")

    return {
        "ok": True,
        "success": True,
        "message": "Buyurtmangiz qabul qilindi. Tez orada mutaxassisimiz bog'lanadi.",
        "code": lead.code,
        "lead_id": lead.id
    }


@app.get("/api/leads")
def get_leads(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    date_filter: Optional[str] = Query(None, alias="date"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leadlar ro'yxatini filtrlash, sana va qidiruv bilan olish"""
    query = db.query(Lead).order_by(desc(Lead.id))

    if status_filter and status_filter != "all":
        query = query.filter(Lead.status == status_filter)

    if date_filter:
        query = query.filter(Lead.appointment_date == date_filter.strip())

    if search:
        p = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.parent_name.ilike(p),
                Lead.phone.ilike(p),
                Lead.code.ilike(p),
                Lead.notes.ilike(p)
            )
        )

    total_count = query.count()
    leads = query.limit(limit).offset(offset).all()

    leads_data = []
    for l in leads:
        leads_data.append({
            "id": l.id,
            "code": l.code,
            "parent_name": l.parent_name,
            "phone": l.phone,
            "child_age": l.child_age,
            "specialty_id": l.specialty_id,
            "format": l.format,
            "appointment_date": l.appointment_date,
            "time_slot": l.time_slot,
            "notes": l.notes,
            "status": l.status.value,
            "assigned_to_id": l.assigned_to_id,
            "assigned_to_name": l.assigned_to.full_name if l.assigned_to else None,
            "created_at": l.created_at.isoformat(),
            "updated_at": l.updated_at.isoformat() if l.updated_at else l.created_at.isoformat(),
            "comments_count": len(l.comments),
            "comments": [
                {
                    "id": c.id,
                    "lead_id": c.lead_id,
                    "author_name": c.author_name,
                    "text": c.text,
                    "created_at": c.created_at.isoformat()
                } for c in l.comments
            ]
        })

    return {
        "total": total_count,
        "items": leads_data
    }


@app.get("/api/leads/{lead_id}")
def get_lead_by_id(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bitta lead tafsilotlarini olish"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead topilmadi")

    return {
        "id": lead.id,
        "code": lead.code,
        "parent_name": lead.parent_name,
        "phone": lead.phone,
        "child_age": lead.child_age,
        "specialty_id": lead.specialty_id,
        "format": lead.format,
        "appointment_date": lead.appointment_date,
        "time_slot": lead.time_slot,
        "notes": lead.notes,
        "status": lead.status.value,
        "assigned_to_id": lead.assigned_to_id,
        "assigned_to_name": lead.assigned_to.full_name if lead.assigned_to else None,
        "created_at": lead.created_at.isoformat(),
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else lead.created_at.isoformat(),
        "comments": [
            {
                "id": c.id,
                "lead_id": c.lead_id,
                "author_name": c.author_name,
                "text": c.text,
                "created_at": c.created_at.isoformat()
            } for c in lead.comments
        ]
    }


@app.patch("/api/leads/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """1-CLICK STATUS O'ZGARTIRISH"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead topilmadi")

    old_status = lead.status
    lead.status = payload.status
    lead.updated_at = datetime.utcnow()

    if not lead.assigned_to_id:
        lead.assigned_to_id = current_user.id

    comment_text = payload.comment
    if not comment_text:
        comment_text = f"Holat '{old_status.value.upper()}' dan '{payload.status.value.upper()}' ga o'zgartirildi"

    comment = LeadComment(
        lead_id=lead.id,
        user_id=current_user.id,
        author_name=current_user.full_name,
        text=comment_text,
        created_at=datetime.utcnow()
    )
    db.add(comment)
    db.commit()
    db.refresh(lead)

    return {
        "success": True,
        "id": lead.id,
        "new_status": lead.status.value,
        "message": f"Holat muvaffaqiyatli o'zgartirildi: {lead.status.value.upper()}"
    }


@app.post("/api/leads/{lead_id}/comments")
def add_lead_comment(
    lead_id: int,
    payload: LeadCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Izoh qoldirish"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead topilmadi")

    comment = LeadComment(
        lead_id=lead.id,
        user_id=current_user.id,
        author_name=current_user.full_name,
        text=payload.text.strip(),
        created_at=datetime.utcnow()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "lead_id": comment.lead_id,
        "author_name": comment.author_name,
        "text": comment.text,
        "created_at": comment.created_at.isoformat()
    }


@app.delete("/api/leads/{lead_id}")
def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leadni o'chirish"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead topilmadi")

    db.delete(lead)
    db.commit()
    return {"success": True, "message": "Lead muvaffaqiyatli o'chirildi"}


# ==========================================
# 3. STATS ENDPOINT
# ==========================================

@app.get("/api/stats", response_model=StatsSummary)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Statistika va KPI ma'lumotlari"""
    leads = db.query(Lead).all()

    today_str = date.today().isoformat()
    today_leads_cnt = sum(1 for l in leads if l.created_at.date().isoformat() == today_str)

    total = len(leads)
    new_cnt = sum(1 for l in leads if l.status == LeadStatus.NEW)
    contacted_cnt = sum(1 for l in leads if l.status == LeadStatus.CONTACTED)
    scheduled_cnt = sum(1 for l in leads if l.status == LeadStatus.SCHEDULED)
    completed_cnt = sum(1 for l in leads if l.status == LeadStatus.COMPLETED)
    cancelled_cnt = sum(1 for l in leads if l.status == LeadStatus.CANCELLED)

    conversion = round((completed_cnt / total * 100), 1) if total > 0 else 0.0

    return {
        "total_leads": total,
        "today_leads": today_leads_cnt,
        "new_leads": new_cnt,
        "contacted_leads": contacted_cnt,
        "scheduled_leads": scheduled_cnt,
        "completed_leads": completed_cnt,
        "cancelled_leads": cancelled_cnt,
        "conversion_rate": conversion
    }


# ==========================================
# 4. STATIC & WEBAPP SERVE
# ==========================================

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.api_route("/", methods=["GET", "HEAD"])
def serve_crm_app():
    """CRM Admin Panel va Telegram WebApp sahifasini ochish"""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "CRM Frontend yuklanmoqda..."}
