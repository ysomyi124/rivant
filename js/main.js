/* ===========================
   MAIN — Cart & Auth helpers
=========================== */
(function () {

// Supabase client (loaded via CDN)
// IIFE로 감싸 전역 let supabase 선언이 CDN bundle과 충돌하지 않도록 함
let supabase = null;
try {
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase init failed:', e);
}

// Cart helpers (localStorage)
const Cart = {
  get() { return JSON.parse(localStorage.getItem('rivant_cart') || '[]'); },
  save(items) {
    localStorage.setItem('rivant_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('cartUpdated'));
  },
  add(item) {
    const cart = this.get();
    const existing = cart.find(i => i.sku === item.sku);
    if (existing) existing.qty = (existing.qty || 1) + (item.qty || 1);
    else cart.push({ ...item, qty: item.qty || 1 });
    this.save(cart);
  },
  remove(sku) { this.save(this.get().filter(i => i.sku !== sku)); },
  clear() { this.save([]); },
  count() { return this.get().reduce((a, i) => a + (i.qty || 1), 0); },
  total() { return this.get().reduce((a, i) => a + (i.salePrice || i.price || 0) * (i.qty || 1), 0); },
};

// Auth helpers
const Auth = {
  async getUser() {
    if (!supabase) return null;
    try {
      // getSession은 localStorage에서 즉시 읽음 — 네트워크 요청 없음
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    } catch (e) { return null; }
  },
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUp(email, password, name, phone) {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone } }
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        password_hash: '(managed by supabase auth)',
        name,
        phone,
        status: 'ACTIVE',
      }).maybeSingle();
    }
    return data;
  },
  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    // 상대 경로로 메인으로 이동
    const isSubPage = window.location.pathname.includes('/pages/');
    window.location.href = isSubPage ? '../index.html' : 'index.html';
  },
};

// Toast notification
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.rivant-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'rivant-toast';
  toast.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()">✕</button>`;
  toast.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
    background:${type === 'error' ? '#e53e3e' : '#111111'};color:#fff;
    padding:14px 24px;border-radius:999px;font-size:14px;
    display:flex;align-items:center;gap:12px;z-index:9999;
    box-shadow:0 8px 32px rgba(0,0,0,0.2);white-space:nowrap;
    animation:fadeUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove?.(), 3000);
}

// Number format
function fmtPrice(n) {
  if (!n && n !== 0) return '-';
  return Number(n).toLocaleString('ko-KR') + '원';
}

window.RivantApp = { Cart, Auth, showToast, fmtPrice, supabase };

})();
