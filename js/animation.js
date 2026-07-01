/* ===========================
   SCROLL & ANIMATION
=========================== */
(function () {
  // Scroll Reveal
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  // Top Button
  const btnTop = document.querySelector('.btn-top');
  const btnConsult = document.querySelector('.btn-consult');

  if (btnTop) {
    window.addEventListener('scroll', () => {
      btnTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btnTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Parallax (hero bg)
  const heroBg = document.querySelector('.hero__bg img');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      heroBg.style.transform = `scale(1) translateY(${scrolled * 0.3}px)`;
    }, { passive: true });
  }

  // Text Reveal (hero title chars)
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) {
    heroTitle.querySelectorAll('span').forEach((span, i) => {
      span.style.animationDelay = `${i * 0.15}s`;
    });
  }

  // Smooth page transitions
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const overlay = document.querySelector('.page-transition');
      if (!overlay) { window.location.href = href; return; }
      overlay.classList.add('entering');
      setTimeout(() => { window.location.href = href; }, 380);
    });
  });

  const pageOverlay = document.querySelector('.page-transition');
  if (pageOverlay) {
    window.addEventListener('pageshow', () => {
      pageOverlay.classList.remove('entering');
      pageOverlay.classList.add('leaving');
      setTimeout(() => pageOverlay.classList.remove('leaving'), 500);
    });
  }

  // Wishlist toggle
  document.querySelectorAll('.product-card__wish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
    });
  });

  // Marquee pause on hover — handled via CSS :hover on .lookbook-track
})();
