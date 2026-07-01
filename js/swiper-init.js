/* ===========================
   SWIPER INITIALIZATIONS
=========================== */
(function () {
  // Progressbar update helper
  function makeProgressbar(swiper, el) {
    if (!el) return;
    const fill = el.querySelector('.swiper-progressbar-fill');
    if (!fill) return;
    const update = () => {
      const pct = ((swiper.realIndex + 1) / swiper.slides.length) * 100;
      fill.style.width = pct + '%';
    };
    swiper.on('slideChange', update);
    update();
  }

  // NEW Section Swiper
  const newSwiperEl = document.querySelector('.new-swiper');
  if (newSwiperEl) {
    const s = new Swiper(newSwiperEl, {
      slidesPerView: 2,
      spaceBetween: 16,
      loop: true,
      autoplay: { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true },
      grabCursor: true,
      mousewheel: { forwardOnly: true },
      breakpoints: {
        768: { slidesPerView: 3 },
        1280: { slidesPerView: 4 },
      },
    });
    makeProgressbar(s, document.querySelector('.new-progressbar'));
  }

  // BEST Items Swiper (tab-based)
  const bestPanels = document.querySelectorAll('.best-swiper');
  bestPanels.forEach((el, i) => {
    const s = new Swiper(el, {
      slidesPerView: 1.4,
      spaceBetween: 16,
      grabCursor: true,
      loop: false,
      breakpoints: {
        480: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1024: { slidesPerView: 3.5 },
        1280: { slidesPerView: 4.5 },
      },
    });
    makeProgressbar(s, el.closest('.best-tab-panel')?.querySelector('.best-progressbar'));
  });

  // COLLECTION Swiper
  const collectionEl = document.querySelector('.collection-swiper');
  if (collectionEl) {
    const s = new Swiper(collectionEl, {
      slidesPerView: 1.3,
      spaceBetween: 16,
      grabCursor: true,
      loop: false,
      breakpoints: {
        480: { slidesPerView: 2 },
        768: { slidesPerView: 2.5 },
        1024: { slidesPerView: 3.5 },
      },
    });
    makeProgressbar(s, document.querySelector('.collection-progressbar'));
  }

  // STYLE Swiper
  const styleEl = document.querySelector('.style-swiper');
  if (styleEl) {
    new Swiper(styleEl, {
      slidesPerView: 1.2,
      spaceBetween: 20,
      loop: true,
      autoplay: { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true },
      grabCursor: true,
      pagination: { el: '.style-pagination', clickable: true },
      navigation: { prevEl: '.style-prev', nextEl: '.style-next' },
      breakpoints: {
        480: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1280: { slidesPerView: 4 },
      },
    });
  }

  // Best Items Tab
  const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
  const tabPanels = document.querySelectorAll('.best-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => { p.style.display = 'none'; });
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });
})();
