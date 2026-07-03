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
    console.log('[Auth.signIn] 요청:', { email });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[Auth.signIn] 응답 data:', data);
    console.log('[Auth.signIn] 응답 error:', error);
    if (error) throw error;
    console.log('[Auth.signIn] 세션:', data.session);
    console.log('[Auth.signIn] 유저:', data.user);
    return data;
  },
  async signUp(email, password, name, phone) {
    if (!supabase) throw new Error('Supabase not initialized');
    console.log('[Auth.signUp] 요청:', { email, name, phone });
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone } }
    });
    console.log('[Auth.signUp] 응답 data:', data);
    console.log('[Auth.signUp] 응답 error:', error);
    if (error) throw error;

    // 이미 가입된 이메일 감지
    // Supabase는 미인증 이메일로 재가입 시 오류 없이 identities=[] 반환하며 인증 메일을 재발송함
    // → 방치하면 rate limit exceeded 발생
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      console.warn('[Auth.signUp] 이미 가입된 이메일 — identities 빈 배열:', data.user.email);
      throw new Error('이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해주세요.');
    }

    // auth.users 생성 확인
    console.log('[Auth.signUp] auth.user:', data.user);
    console.log('[Auth.signUp] session:', data.session, '(null이면 이메일 인증 필요)');

    // users 테이블 insert — 실패해도 회원가입 자체는 성공으로 처리
    if (data.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        password_hash: '(managed by supabase auth)',
        name,
        phone,
        status: 'ACTIVE',
      });
      if (dbError) {
        console.warn('[Auth.signUp] users 테이블 insert 실패 (무시):', dbError.message, dbError.code);
      } else {
        console.log('[Auth.signUp] users 테이블 insert 성공');
      }
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
