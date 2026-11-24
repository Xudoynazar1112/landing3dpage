from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from models import LeadStatus, UserRole


# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: UserRole
    telegram_chat_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# --- Comment Schemas ---
class LeadCommentCreate(BaseModel):
    text: str = Field(..., min_length=1, description="Izoh matni")


class LeadCommentOut(BaseModel):
    id: int
    lead_id: int
    user_id: Optional[int]
    author_name: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Lead Schemas ---
class LeadCreate(BaseModel):
    """Landing page orqali keladigan ma'lumotlar formati (snake_case va camelCase qo'llab-quvvatlanadi)"""
    code: Optional[str] = None
    parent_name: Optional[str] = Field(None, description="Ota-ona yoki mijoz ismi")
    parentName: Optional[str] = None
    phone: str = Field(..., min_length=7, description="Telefon raqami")
    child_age: Optional[str] = Field(None, description="Bolaning yoshi")
    childAge: Optional[str] = None
    specialty_id: Optional[str] = Field(None, description="Yo'nalish ID si")
    specialtyId: Optional[str] = None
    format: Optional[str] = Field("clinic", description="clinic | online")
    appointment_date: Optional[str] = Field(None, description="Qabul sanasi (YYYY-MM-DD)")
    date: Optional[str] = None
    time_slot: Optional[str] = Field(None, description="Vaqt oralig'i")
    timeSlot: Optional[str] = None
    notes: Optional[str] = Field(None, description="Qo'shimcha izoh / shikoyat")

    def get_parent_name(self) -> str:
        return (self.parent_name or self.parentName or "Mijoz").strip()

    def get_child_age(self) -> Optional[str]:
        val = self.child_age or self.childAge
        return val.strip() if val else None

    def get_specialty_id(self) -> Optional[str]:
        val = self.specialty_id or self.specialtyId
        return val.strip() if val else None

    def get_appointment_date(self) -> Optional[str]:
        val = self.appointment_date or self.date
        return val.strip() if val else None

    def get_time_slot(self) -> Optional[str]:
        val = self.time_slot or self.timeSlot
        return val.strip() if val else None

    def get_notes(self) -> Optional[str]:
        return self.notes.strip() if self.notes else None


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
    comment: Optional[str] = None


class LeadUpdate(BaseModel):
    parent_name: Optional[str] = None
    phone: Optional[str] = None
    child_age: Optional[str] = None
    specialty_id: Optional[str] = None
    format: Optional[str] = None
    appointment_date: Optional[str] = None
    time_slot: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[LeadStatus] = None
    assigned_to_id: Optional[int] = None


class LeadOut(BaseModel):
    id: int
    code: str
    parent_name: str
    phone: str
    child_age: Optional[str]
    specialty_id: Optional[str]
    format: str
    appointment_date: Optional[str]
    time_slot: Optional[str]
    notes: Optional[str]
    status: LeadStatus
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    comments: List[LeadCommentOut] = []

    class Config:
        from_attributes = True


# --- Statistics Summary ---
class StatsSummary(BaseModel):
    total_leads: int
    today_leads: int
    new_leads: int
    contacted_leads: int
    scheduled_leads: int
    completed_leads: int
    cancelled_leads: int
    conversion_rate: float

