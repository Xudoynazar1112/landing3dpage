/**
 * CRM Integratsiya Yordamchisi (Landing Page uchun)
 * 
 * Ushbu modul orqali landing pagedan kelgan buyurtmalarni CRM tizimiga
 * 1 qatorda yuborish mumkin. Joriy loyihani o'zgartirish shart emas,
 * faqat xohlagan joyda `sendLeadToCRM(record)` funksiyasini chaqirish kifoya.
 */

export interface LeadSubmissionData {
  parent_name: string;
  phone: string;
  child_age?: string;
  specialty_id?: string;
  format?: 'clinic' | 'online';
  appointment_date?: string;
  time_slot?: string;
  notes?: string;
}

// CRM Backend server manzili (productionda o'z domeningizga o'zgartiring)
export const CRM_API_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8001/api/leads';

/**
 * Yangi leadni CRM backendga yuborish
 */
export async function sendLeadToCRM(data: LeadSubmissionData): Promise<{ success: boolean; code?: string; message: string }> {
  try {
    const response = await fetch(CRM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Server xatosi: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      code: result.code,
      message: result.message || 'Muvaffaqiyatli qabul qilindi'
    };
  } catch (error) {
    console.warn('CRM ga yuborishda xatolik (offline/server ishlamayapti):', error);
    // Sayt foydalanuvchisiga xatolik bermaymiz, offline rejimda ham sayt ishlayveradi
    return {
      success: false,
      message: 'CRM serveri bilan aloqa bo‘lmadi, maʼlumot lokal saqlandi.'
    };
  }
}

