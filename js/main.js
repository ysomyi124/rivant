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
// API 레벨 호출 카운터 — 프론트엔드 가드 우회 시 이 숫자가 1을 초과함
let _signUpCallCount = 0;
let _signInCallCount = 0;

const Auth = {
  async getUser() {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    } catch (e) { return null; }
  },
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not initialized');
    console.log(`[Auth.signIn] ── 호출 #${++_signInCallCount} ──`, { email });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[Auth.signIn] 응답 error:', error);
    if (error) throw error;
    console.log('[Auth.signIn] 세션 발급:', !!data.session, '/ 유저:', data.user?.email);
    return data;
  },
  async signUp(email, password, name, phone) {
    if (!supabase) throw new Error('Supabase not initialized');

    // ── 호출 횟수 추적 ───────────────────────────────────────────────────
    // 프론트엔드의 _submitting 가드가 정상 작동하면 이 값은 항상 1
    // 2 이상이면 이벤트 리스너 중복 등록 또는 가드 우회가 발생한 것
    console.log(`[Auth.signUp] ── 호출 #${++_signUpCallCount} ──`, { email, name, phone });

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone } },
    });
    console.log('[Auth.signUp] 응답 error:', error);
    if (error) throw error;

    // 이미 가입된 이메일 감지
    // Supabase는 미인증 이메일 재가입 시 error=null, identities=[] 반환하며 메일을 재발송
    // → 차단하지 않으면 rate limit exceeded 발생
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      console.warn('[Auth.signUp] 이미 가입된 이메일 (identities 빈 배열):', data.user.email);
      throw new Error('이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해주세요.');
    }

    console.log('[Auth.signUp] 가입 완료 — session:', data.session ? '있음(즉시로그인)' : 'null(이메일인증필요)');

    // users 테이블 insert — 실패해도 가입 자체는 성공으로 처리
    if (data.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id:            data.user.id,
        email,
        password_hash: '(managed by supabase auth)',
        name,
        phone,
        status:        'ACTIVE',
      });
      if (dbError) {
        console.warn('[Auth.signUp] users 테이블 insert 실패 (무시):', dbError.message, dbError.code);
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
