/* ===========================
   HEADER INTERACTIONS
=========================== */
(function () {
  const header = document.getElementById('header');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavClose = document.querySelector('.mobile-nav-close');
  const searchOpenBtn = document.getElementById('searchOpen');
  const searchOverlay = document.querySelector('.search-overlay');
  const searchClose = document.querySelector('.search-close');
  const overlayBg = document.querySelector('.overlay-bg');

  if (!header) return;

  // Sticky header
  const onScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
      header.classList.remove('transparent');
    } else {
      header.classList.remove('scrolled');
      if (!mobileNav?.classList.contains('open')) {
        header.classList.add('transparent');
      }
    }
  };

  header.classList.add('transparent');
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      mobileMenuBtn.classList.toggle('open', isOpen);
      overlayBg?.classList.toggle('active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) header.classList.remove('transparent');
      else if (window.scrollY <= 50) header.classList.add('transparent');
    });
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeMobileNav);
  }

  // Mobile sub-menu toggle
  document.querySelectorAll('.mobile-nav-item > a').forEach(link => {
    const sub = link.nextElementSibling;
    if (!sub || !sub.classList.contains('mobile-sub')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      sub.classList.toggle('open');
      const icon = link.querySelector('.toggle-icon');
      if (icon) icon.style.transform = sub.classList.contains('open') ? 'rotate(180deg)' : '';
    });
  });

  // Search overlay
  if (searchOpenBtn && searchOverlay) {
    searchOpenBtn.addEventListener('click', () => {
      searchOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      searchOverlay.querySelector('input')?.focus();
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  if (overlayBg) {
    overlayBg.addEventListener('click', () => {
      closeMobileNav();
      closeSearch();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearch();
      closeMobileNav();
    }
  });

  function closeMobileNav() {
    mobileNav?.classList.remove('open');
    mobileMenuBtn?.classList.remove('open');
    overlayBg?.classList.remove('active');
    document.body.style.overflow = '';
    if (window.scrollY <= 50) header.classList.add('transparent');
  }

  function closeSearch() {
    searchOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Cart count from localStorage
  const updateCartBadge = () => {
    const cart = JSON.parse(localStorage.getItem('rivant_cart') || '[]');
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      badge.textContent = cart.length || '';
      badge.style.display = cart.length ? 'flex' : 'none';
    }
  };

  updateCartBadge();
  window.addEventListener('cartUpdated', updateCartBadge);
})();
