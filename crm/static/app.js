/**
 * Dr. Zokhidjon CRM - Frontend Logic
 * 1-2 click qulaylik, Telegram WebApp integratsiyasi, tezkor status o'zgartirish
 */

// Global holat (State)
const API_BASE = window.location.pathname.startsWith('/crm') ? '/crm/api' : '/api';

const state = {
  token: localStorage.getItem('crm_token') || '',
  user: JSON.parse(localStorage.getItem('crm_user') || 'null'),
  leads: [],
  currentFilter: 'all',
  searchQuery: '',
  selectedLead: null,
  pollInterval: null,
};

// Telegram WebApp obyekti
const tg = window.Telegram?.WebApp;

// DOM elementlar
const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');

const statTotal = document.getElementById('statTotal');
const statNew = document.getElementById('statNew');
const statContacted = document.getElementById('statContacted');
const statScheduled = document.getElementById('statScheduled');
const statCompleted = document.getElementById('statCompleted');

const cntAll = document.getElementById('cntAll');
const cntNew = document.getElementById('cntNew');
const cntContacted = document.getElementById('cntContacted');
const cntScheduled = document.getElementById('cntScheduled');
const cntCompleted = document.getElementById('cntCompleted');
const cntCancelled = document.getElementById('cntCancelled');

const statusFilterTabs = document.getElementById('statusFilterTabs');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

const leadsList = document.getElementById('leadsList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');

// Modal elementlar
const leadModal = document.getElementById('leadModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalLeadName = document.getElementById('modalLeadName');
const modalLeadCode = document.getElementById('modalLeadCode');
const modalLeadCreated = document.getElementById('modalLeadCreated');
const modalLeadPhone = document.getElementById('modalLeadPhone');
const modalLeadAgeSpec = document.getElementById('modalLeadAgeSpec');
const modalLeadAppointment = document.getElementById('modalLeadAppointment');
const modalLeadFormat = document.getElementById('modalLeadFormat');
const modalLeadNotes = document.getElementById('modalLeadNotes');
const modalStatusButtons = document.getElementById('modalStatusButtons');
const modalCommentsList = document.getElementById('modalCommentsList');
const modalCommentsCount = document.getElementById('modalCommentsCount');
const addCommentForm = document.getElementById('addCommentForm');
const newCommentInput = document.getElementById('newCommentInput');


// ====================================================
// 1. INITSIALIZATSIYA VA TELEGRAM WEBAPP SOZLASH
// ====================================================
async function initApp() {
  // 1. Telegram WebApp ichida ochilgan bo'lsa
  if (tg) {
    tg.ready();
    tg.expand();
    document.body.classList.add('telegram-app');

    // Agar Telegram foydalanuvchisi aniqlansa, tezkor avtorizatsiya urinishi
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser && tgUser.id && !state.token) {
      try {
        const resp = await fetch(`${API_BASE}/telegram/webapp-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_chat_id: String(tgUser.id) })
        });
        if (resp.ok) {
          const authData = await resp.json();
          saveAuth(authData.access_token, authData.user);
        }
      } catch (err) {
        console.warn('Telegram avtologin urinishi bajarilmadi:', err);
      }
    }
  }

  // URL da maxsus lead ko'rsatilgan bo'lsa (masalan: ?lead=12)
  const urlParams = new URLSearchParams(window.location.search);
  const targetLeadId = urlParams.get('lead');

  // Autentifikatsiyani tekshirish
  if (!state.token) {
    showLogin();
    return;
  }

  updateUserProfileUI();
  await loadLeadsAndStats();

  if (targetLeadId) {
    const found = state.leads.find(l => l.id === parseInt(targetLeadId, 10));
    if (found) openLeadModal(found);
  }

  // Har 15 soniyada yangilanishlarni tekshirish (polling)
  state.pollInterval = setInterval(() => {
    loadLeadsAndStats(true);
  }, 15000);
}


// ====================================================
// 2. AUTHENTICATION & SESSION
// ====================================================
function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_user', JSON.stringify(user));
  loginSection.classList.add('hidden');
  updateUserProfileUI();
  loadLeadsAndStats();
}

function showLogin() {
  loginSection.classList.remove('hidden');
  loginUsername.focus();
}

function logout() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
  state.token = '';
  state.user = null;
  state.leads = [];
  if (state.pollInterval) clearInterval(state.pollInterval);
  showLogin();
}

function updateUserProfileUI() {
  if (state.user) {
    userName.textContent = state.user.full_name || state.user.username;
    userRole.textContent = state.user.role || 'Operator';
    userAvatar.textContent = (state.user.full_name || state.user.username).charAt(0).toUpperCase();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<span>Kirilmoqda...</span>`;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginUsername.value.trim(),
        password: loginPassword.value
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login yoki parol notoʻgʻri');
    }

    saveAuth(data.access_token, data.user);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<span>Tizimga kirish</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
});

logoutBtn.addEventListener('click', logout);


// ====================================================
// 3. API CALLS & DATA FETCHING
// ====================================================
async function apiFetch(endpoint, options = {}) {
  const finalUrl = endpoint.startsWith('http')
    ? endpoint
    : (endpoint.startsWith('/api') ? `${API_BASE}${endpoint.slice(4)}` : `${API_BASE}${endpoint}`);

  const headers = {
    'Authorization': `Bearer ${state.token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(finalUrl, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Sessiya muddati tugadi. Qayta kiring.');
  }
  return res;
}

async function loadLeadsAndStats(silent = false) {
  if (!silent) {
    loadingState.classList.remove('hidden');
    refreshIcon.classList.add('animate-spin');
  }

  try {
    // 1. Stats olish
    const statsRes = await apiFetch('/api/stats');
    if (statsRes.ok) {
      const stats = await statsRes.json();
      updateStatsUI(stats);
    }

    // 2. Leads olish
    let url = `/api/leads?limit=100`;
    if (state.currentFilter !== 'all') {
      url += `&status=${encodeURIComponent(state.currentFilter)}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const leadsRes = await apiFetch(url);
    if (leadsRes.ok) {
      const data = await leadsRes.json();
      state.leads = data.items;
      renderLeads();
    }
  } catch (err) {
    console.error('Maʼlumotlarni yuklashda xatolik:', err);
  } finally {
    loadingState.classList.add('hidden');
    refreshIcon.classList.remove('animate-spin');
  }
}

function updateStatsUI(stats) {
  statTotal.textContent = stats.total_leads;
  statNew.textContent = stats.new_leads;
  statContacted.textContent = stats.contacted_leads;
  statScheduled.textContent = stats.scheduled_leads;
  statCompleted.textContent = stats.completed_leads;

  cntAll.textContent = stats.total_leads;
  cntNew.textContent = stats.new_leads;
  cntContacted.textContent = stats.contacted_leads;
  cntScheduled.textContent = stats.scheduled_leads;
  cntCompleted.textContent = stats.completed_leads;
  cntCancelled.textContent = stats.cancelled_leads;
}


// ====================================================
// 4. LEADS RENDERING (1-2 CLICK SPEED DESIGN)
// ====================================================
const STATUS_CONFIG = {
  new: { label: 'Yangi', class: 'badge-new', icon: 'bell' },
  contacted: { label: 'Bogʻlanildi', class: 'badge-contacted', icon: 'phone' },
  scheduled: { label: 'Belgilandi', class: 'badge-scheduled', icon: 'calendar' },
  completed: { label: 'Yakunlandi', class: 'badge-completed', icon: 'check-circle-2' },
  cancelled: { label: 'Bekor', class: 'badge-cancelled', icon: 'x-circle' },
};

function renderLeads() {
  if (state.leads.length === 0) {
    leadsList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  leadsList.innerHTML = state.leads.map(lead => {
    const st = STATUS_CONFIG[lead.status] || { label: lead.status, class: 'badge-new' };
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const dateFormatted = new Date(lead.created_at).toLocaleDateString('uz-UZ', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="lead-row p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
           data-lead-id="${lead.id}">
        
        <!-- Chap taraf: Mijoz ismi, raqami va ma'lumotlari -->
        <div class="flex-1 min-w-0" onclick="window.onLeadClick(${lead.id})">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
              #${lead.code}
            </span>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.class}">
              ${st.label}
            </span>
            <span class="text-[11px] text-slate-400">
              ${dateFormatted}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <h4 class="text-sm sm:text-base font-bold text-slate-900 truncate">
              ${escapeHtml(lead.parent_name)}
            </h4>
            ${lead.child_age ? `<span class="text-xs text-slate-500 font-medium">(${escapeHtml(lead.child_age)})</span>` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1">
            <span class="flex items-center gap-1 font-mono text-slate-700 font-semibold">
              <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i> ${escapeHtml(lead.phone)}
            </span>
            <span>•</span>
            <span class="flex items-center gap-1">
              <i data-lucide="activity" class="w-3.5 h-3.5 text-slate-400"></i> ${escapeHtml(lead.specialty_id || 'Umumiy nevrologiya')}
            </span>
            ${lead.appointment_date ? `
              <span>•</span>
              <span class="text-sky-700 font-medium flex items-center gap-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${escapeHtml(lead.appointment_date)} (${escapeHtml(lead.time_slot || '')})
              </span>
            ` : ''}
          </div>

          ${lead.notes ? `
            <p class="text-xs text-slate-500 line-clamp-1 italic mt-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              "${escapeHtml(lead.notes)}"
            </p>
          ` : ''}
        </div>

        <!-- O'ng taraf: 1-CLICK AMALLAR TUGMALARI -->
        <div class="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          
          <!-- 1. Telefon qo'ng'irog'i (1-click) -->
          <a href="tel:${cleanPhone}" title="Qo'ng'iroq qilish" onclick="event.stopPropagation()"
             class="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all shadow-sm">
            <i data-lucide="phone-call" class="w-4 h-4"></i>
          </a>

          <!-- 2. Telegram / WhatsApp tezkor link (1-click) -->
          <a href="https://t.me/+${cleanPhone}" target="_blank" title="Telegramda yozish" onclick="event.stopPropagation()"
             class="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white border border-sky-200 transition-all shadow-sm">
            <i data-lucide="send" class="w-4 h-4"></i>
          </a>

          <!-- 3. Tezkor Status o'zgartirish tugmalari (1-CLICK) -->
          <div class="flex items-center gap-1" onclick="event.stopPropagation()">
            ${lead.status === 'new' ? `
              <button onclick="window.quickChangeStatus(${lead.id}, 'contacted')"
                      title="Bog'landim deb belgilash"
                      class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-semibold transition-all">
                🔵 Bog'landim
              </button>
            ` : ''}

            ${lead.status === 'contacted' ? `
              <button onclick="window.quickChangeStatus(${lead.id}, 'scheduled')"
                      title="Uchrashuv belgilandi deb belgilash"
                      class="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200 text-xs font-semibold transition-all">
                🟣 Belgilandi
              </button>
            ` : ''}

            ${lead.status === 'scheduled' ? `
              <button onclick="window.quickChangeStatus(${lead.id}, 'completed')"
                      title="Qabul yakunlandi deb belgilash"
                      class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-semibold transition-all">
                ✅ Yakunlandi
              </button>
            ` : ''}

            <!-- Tafsilot va izoh ochish tugmasi -->
            <button onclick="window.onLeadClick(${lead.id})" title="Batafsil ko'rish"
                    class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');

  lucide.createIcons();
}


// ====================================================
// 5. 1-CLICK QUICK STATUS CHANGE
// ====================================================
window.quickChangeStatus = async function(leadId, newStatus) {
  try {
    const res = await apiFetch(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      alert('Holatni oʻzgartirishda xatolik yuz berdi.');
      return;
    }

    // Mahalliy yangilash
    const lead = state.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = newStatus;
      renderLeads();
    }
    loadLeadsAndStats(true);
  } catch (err) {
    alert(err.message);
  }
};


// ====================================================
// 6. MODAL DETAILS & COMMENTS
// ====================================================
window.onLeadClick = function(leadId) {
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;
  openLeadModal(lead);
};

function openLeadModal(lead) {
  state.selectedLead = lead;
  modalLeadName.textContent = lead.parent_name;
  modalLeadCode.textContent = `#${lead.code}`;
  modalLeadCreated.textContent = new Date(lead.created_at).toLocaleString('uz-UZ');
  
  const cleanPhone = lead.phone.replace(/\D/g, '');
  modalLeadPhone.href = `tel:${cleanPhone}`;
  modalLeadPhone.querySelector('span').textContent = lead.phone;

  modalLeadAgeSpec.textContent = `${lead.child_age || 'Yoshi koʻrsatilmagan'} · ${lead.specialty_id || 'Umumiy'}`;
  modalLeadAppointment.textContent = lead.appointment_date ? `${lead.appointment_date} · ${lead.time_slot || ''}` : 'Belgilanmagan';
  modalLeadFormat.textContent = lead.format === 'clinic' ? '🏥 Klinika qabuli' : '💻 Online konsultatsiya';

  if (lead.notes) {
    modalLeadNotes.textContent = lead.notes;
    document.getElementById('modalLeadNotesContainer').classList.remove('hidden');
  } else {
    document.getElementById('modalLeadNotesContainer').classList.add('hidden');
  }

  // 1-Click status buttons
  const statusBtns = modalStatusButtons.querySelectorAll('.status-change-btn');
  statusBtns.forEach(btn => {
    const s = btn.getAttribute('data-newstatus');
    if (s === lead.status) {
      btn.classList.add('ring-2', 'ring-offset-1', 'ring-sky-500', 'font-bold');
    } else {
      btn.classList.remove('ring-2', 'ring-offset-1', 'ring-sky-500', 'font-bold');
    }
  });

  renderModalComments(lead.comments || []);
  leadModal.classList.remove('hidden');
  lucide.createIcons();
}

function renderModalComments(comments) {
  modalCommentsCount.textContent = `${comments.length} ta izoh`;
  if (comments.length === 0) {
    modalCommentsList.innerHTML = `<div class="text-xs text-slate-400 italic py-2">Hali hech qanday izoh yoʻq.</div>`;
    return;
  }

  modalCommentsList.innerHTML = comments.map(c => `
    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
      <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span class="font-bold text-slate-700">${escapeHtml(c.author_name)}</span>
        <span>${new Date(c.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p class="text-slate-700 leading-relaxed">${escapeHtml(c.text)}</p>
    </div>
  `).join('');
}

// Modal status button bosinganda
modalStatusButtons.addEventListener('click', async (e) => {
  const btn = e.target.closest('.status-change-btn');
  if (!btn || !state.selectedLead) return;

  const newStatus = btn.getAttribute('data-newstatus');
  await window.quickChangeStatus(state.selectedLead.id, newStatus);
  state.selectedLead.status = newStatus;
  openLeadModal(state.selectedLead);
});

// Izoh qo'shish formasi
addCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.selectedLead) return;
  const text = newCommentInput.value.trim();
  if (!text) return;

  try {
    const res = await apiFetch(`/api/leads/${state.selectedLead.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      const newComment = await res.json();
      state.selectedLead.comments = [newComment, ...(state.selectedLead.comments || [])];
      renderModalComments(state.selectedLead.comments);
      newCommentInput.value = '';
    }
  } catch (err) {
    alert(err.message);
  }
});

closeModalBtn.addEventListener('click', () => {
  leadModal.classList.add('hidden');
  state.selectedLead = null;
});


// ====================================================
// 7. FILTRLAR VA QIDIRUV
// ====================================================
statusFilterTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;

  statusFilterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  state.currentFilter = tab.getAttribute('data-status');
  loadLeadsAndStats();
});

let searchDebounce = null;
searchInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  state.searchQuery = val;
  clearSearchBtn.classList.toggle('hidden', val.length === 0);

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadLeadsAndStats();
  }, 300);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  state.searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  loadLeadsAndStats();
});

refreshBtn.addEventListener('click', () => loadLeadsAndStats());

// Escape HTML xavfsizlik uchun
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Ilovani ishga tushirish
document.addEventListener('DOMContentLoaded', initApp);

