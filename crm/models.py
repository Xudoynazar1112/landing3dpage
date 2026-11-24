import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"


class LeadStatus(str, enum.Enum):
    NEW = "new"                  # Yangi kelgan buyurtma
    CONTACTED = "contacted"      # Bog'lanildi (qo'ng'iroq qilindi)
    SCHEDULED = "scheduled"      # Uchrashuv belgilandi
    COMPLETED = "completed"      # Ko'rik / qabul yakunlandi
    CANCELLED = "cancelled"      # Rad etildi / bekor qilindi


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERATOR, nullable=False)
    telegram_chat_id = Column(String(50), unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assigned_leads = relationship("Lead", back_populates="assigned_to")
    comments = relationship("LeadComment", back_populates="user")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    parent_name = Column(String(100), nullable=False)
    phone = Column(String(30), index=True, nullable=False)
    child_age = Column(String(50), nullable=True)
    specialty_id = Column(String(100), nullable=True)
    format = Column(String(20), default="clinic", nullable=False) # clinic | online
    appointment_date = Column(String(30), nullable=True)
    time_slot = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(SQLEnum(LeadStatus), default=LeadStatus.NEW, index=True, nullable=False)
    
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assigned_to = relationship("User", back_populates="assigned_leads")
    comments = relationship("LeadComment", back_populates="lead", cascade="all, delete-orphan", order_by="desc(LeadComment.created_at)")


class LeadComment(Base):
    __tablename__ = "lead_comments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="comments")
    user = relationship("User", back_populates="comments")

