/* ===========================
   RIVANT SEARCH MODULE
=========================== */
(function (global) {
'use strict';

const SB_URL = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL
  : 'https://icpadkshsayuzpgiaojh.supabase.co';
const SB_KEY = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcGFka3Noc2F5dXpwZ2lhb2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjU5NzMsImV4cCI6MjA5NjgwMTk3M30.0dn3CqhajZecDVGUSX6tKo6JnCKYLPUBkon9eUPs6Dc';
const _H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

const HISTORY_KEY = 'rivant_search_history';
const HISTORY_MAX = 10;
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';

/* ── Utility ─────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
}

function sbGet(table, params) {
  const url = new URL(SB_URL + '/rest/v1/' + table);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  return fetch(url.toString(), { headers: _H }).then(r => {
    if (!r.ok) throw new Error(table + ' ' + r.status);
    return r.json();
  });
}

function esc(t) {
  return (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(rawText, rawQ) {
  if (!rawQ || !rawText) return esc(rawText);
  const safe = esc(rawText);
  const safeQ = esc(rawQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(
      new RegExp(safeQ, 'gi'),
      m => `<mark style="background:rgba(255,81,18,0.18);color:inherit;padding:0 1px;border-radius:2px">${m}</mark>`
    );
  } catch { return safe; }
}

/* ── URL helper ──────────────────────────────────── */
function getSearchBase() {
  const href = window.location.href;
  return /\/pages\//i.test(href) ? 'search.html' : 'pages/search.html';
}

/* ── LocalStorage History ────────────────────────── */
const History = {
  get() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  },
  add(q) {
    let list = this.get().filter(t => t !== q.trim());
    list.unshift(q.trim());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  },
  remove(q) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(this.get().filter(t => t !== q)));
  },
  clear() { localStorage.removeItem(HISTORY_KEY); },
};

/* ── Product Cache (autocomplete) ────────────────── */
let _cache = null;

async function fetchCache() {
  if (_cache) return _cache;
  try {
    const [products, brands] = await Promise.all([
      sbGet('products', { select: 'id,name,brand_id', status: 'eq.ACTIVE', limit: '300' }),
      sbGet('brands', { select: 'id,name' }),
    ]);
    const bMap = {};
    brands.forEach(b => { bMap[b.id] = b.name; });
    _cache = products.map(p => ({ id: p.id, name: p.name || '', brandName: bMap[p.brand_id] || '' }));
  } catch { _cache = []; }
  return _cache;
}

/* ── Navigation ──────────────────────────────────── */
function doSearch(q) {
  if (!q || !q.trim()) return;
  History.add(q.trim());
  window.location.href = getSearchBase() + '?q=' + encodeURIComponent(q.trim());
}

/* ── Full Search API ─────────────────────────────── */
async function searchProducts(q) {
  const low = q.toLowerCase();

  const [products, brands, cats] = await Promise.all([
    sbGet('products', {
      select: 'id,name,summary,thumbnail,brand_id,category_id,created_at',
      status: 'eq.ACTIVE',
      limit:  '300',
    }),
    sbGet('brands',     { select: 'id,name' }),
    sbGet('categories', { select: 'id,name' }),
  ]);

  const bMap = {}, cMap = {};
  brands.forEach(b => { bMap[b.id] = b.name; });
  cats.forEach(c => { cMap[c.id] = c.name; });

  const filtered = products.filter(p =>
    (p.name    || '').toLowerCase().includes(low) ||
    (p.summary || '').toLowerCase().includes(low) ||
    (bMap[p.brand_id]    || '').toLowerCase().includes(low) ||
    (cMap[p.category_id] || '').toLowerCase().includes(low)
  );

  if (!filtered.length) return [];

  const pIds = filtered.map(p => p.id).join(',');
  const [skus, stats] = await Promise.all([
    sbGet('product_skus', {
      select: 'product_id,price,sale_price,status',
      product_id: 'in.(' + pIds + ')',
      status: 'eq.ACTIVE',
    }),
    sbGet('products_statistics', {
      select: 'product_id,review_count,wish_count',
      product_id: 'in.(' + pIds + ')',
    }).catch(() => []),
  ]);

  const skuMap = {}, statMap = {};
  skus.forEach(s => { (skuMap[s.product_id] = skuMap[s.product_id] || []).push(s); });
  stats.forEach(s => { statMap[s.product_id] = s; });

  return filtered.map(p => {
    const ps     = skuMap[p.id] || [];
    const prices = ps.map(s => s.sale_price || s.price).filter(Boolean);
    const origPs = ps.map(s => s.price).filter(Boolean);
    const minSale = prices.length ? Math.min(...prices) : 0;
    const minOrig = origPs.length ? Math.min(...origPs) : 0;
    const hasSale = ps.some(s => s.sale_price && s.sale_price < s.price);
    const rate    = hasSale && minOrig > 0 ? Math.round((1 - minSale / minOrig) * 100) : 0;
    const st      = statMap[p.id] || {};
    return {
      ...p,
      brandName:    bMap[p.brand_id]    || '',
      categoryName: cMap[p.category_id] || '',
      minSale, minOrig, hasSale, rate,
      reviewCount: Number(st.review_count || 0),
    };
  });
}

/* ── Recommended Products (empty state) ─────────── */
async function fetchRecommended(limit) {
  limit = limit || 8;
  try {
    const products = await sbGet('products', {
      select: 'id,name,thumbnail,brand_id',
      status: 'eq.ACTIVE',
      order:  'id.desc',
      limit:  String(limit),
    });
    const bIds = [...new Set(products.map(p => p.brand_id).filter(Boolean))];
    const bMap = {};
    if (bIds.length) {
      const brands = await sbGet('brands', { select: 'id,name', id: 'in.(' + bIds.join(',') + ')' });
      brands.forEach(b => { bMap[b.id] = b.name; });
    }
    const pIds = products.map(p => p.id).join(',');
    const skuMap = {};
    if (pIds) {
      const skus = await sbGet('product_skus', {
        select: 'product_id,price,sale_price',
        product_id: 'in.(' + pIds + ')',
        status: 'eq.ACTIVE',
      });
      skus.forEach(s => { (skuMap[s.product_id] = skuMap[s.product_id] || []).push(s); });
    }
    return products.map(p => {
      const ps     = skuMap[p.id] || [];
      const prices = ps.map(s => s.sale_price || s.price).filter(Boolean);
      const origPs = ps.map(s => s.price).filter(Boolean);
      const minSale = prices.length ? Math.min(...prices) : 0;
      const minOrig = origPs.length ? Math.min(...origPs) : 0;
      const hasSale = ps.some(s => s.sale_price && s.sale_price < s.price);
      const rate    = hasSale && minOrig > 0 ? Math.round((1 - minSale / minOrig) * 100) : 0;
      return { ...p, brandName: bMap[p.brand_id] || '', minSale, minOrig, hasSale, rate };
    });
  } catch { return []; }
}

/* ── Overlay UI Controller ───────────────────────── */
function initSearchOverlay() {
  const overlay     = document.querySelector('.search-overlay');
  const input       = document.getElementById('searchInput');
  const clearBtn    = document.getElementById('searchClear');
  const suggestBox  = document.getElementById('searchSuggest');
  const recentWrap  = document.getElementById('searchRecent');
  const recentList  = document.getElementById('recentList');
  const popularWrap = document.querySelector('.search-keywords');
  const searchBtn   = document.getElementById('searchSubmit');

  if (!overlay || !input) return;

  /* 최근 검색어 렌더링 */
  function renderRecent() {
    if (!recentWrap || !recentList) return;
    const list = History.get();
    if (!list.length) { recentWrap.style.display = 'none'; return; }
    recentWrap.style.display = '';
    recentList.innerHTML = list.map(q =>
      `<span class="recent-tag">
        <span class="recent-tag-text">${esc(q)}</span>
        <button class="recent-tag-del" data-q="${esc(q)}" aria-label="삭제">✕</button>
      </span>`
    ).join('') + `<button class="recent-clear-all">전체 삭제</button>`;

    recentList.querySelectorAll('.recent-tag-text').forEach(el => {
      el.addEventListener('click', () => doSearch(el.textContent.trim()));
    });
    recentList.querySelectorAll('.recent-tag-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        History.remove(btn.dataset.q);
        renderRecent();
      });
    });
    recentList.querySelector('.recent-clear-all')?.addEventListener('click', () => {
      History.clear();
      renderRecent();
    });
  }

  /* 자동완성 렌더링 */
  async function renderSuggest(q) {
    if (!suggestBox) return;
    const names = await fetchCache();
    const low = q.toLowerCase();
    const matches = names.filter(p =>
      p.name.toLowerCase().includes(low) || p.brandName.toLowerCase().includes(low)
    ).slice(0, 8);

    if (!input.value.trim() || !matches.length) {
      suggestBox.style.display = 'none';
      return;
    }
    suggestBox.innerHTML = matches.map(p => `
      <div class="suggest-item" data-name="${esc(p.name)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>${highlight(p.name, q)}</span>
        ${p.brandName ? `<span class="suggest-brand">${highlight(p.brandName, q)}</span>` : ''}
      </div>`).join('');
    suggestBox.style.display = 'block';

    suggestBox.querySelectorAll('.suggest-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = item.dataset.name;
        doSearch(item.dataset.name);
      });
    });
  }

  /* 입력 이벤트 (debounce 300ms) */
  const onInput = debounce(function () {
    const q = input.value.trim();
    if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
    if (q) {
      renderSuggest(q);
      if (recentWrap)  recentWrap.style.display  = 'none';
      if (popularWrap) popularWrap.style.display  = 'none';
    } else {
      if (suggestBox)  suggestBox.style.display   = 'none';
      renderRecent();
      if (popularWrap) popularWrap.style.display  = '';
    }
  }, 300);

  input.addEventListener('input',  onInput);
  input.addEventListener('focus',  () => { fetchCache(); renderRecent(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const q = input.value.trim(); if (q) doSearch(q); }
  });

  /* X 버튼 — 검색어 초기화 */
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    if (suggestBox)  suggestBox.style.display  = 'none';
    if (popularWrap) popularWrap.style.display  = '';
    renderRecent();
    input.focus();
  });

  /* 검색 버튼 */
  searchBtn?.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) doSearch(q);
  });

  /* 인기 검색어 태그 클릭 */
  document.querySelectorAll('.keyword-tag').forEach(tag => {
    tag.addEventListener('click', () => doSearch(tag.textContent.trim()));
  });
}

/* ── Auto-init ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelector('.search-overlay')) {
    initSearchOverlay();
  }
});

/* ── Expose ──────────────────────────────────────── */
global.RivantSearch = {
  doSearch,
  searchProducts,
  fetchRecommended,
  highlight,
  esc,
  History,
  FALLBACK_IMG,
  debounce,
};

})(window);
