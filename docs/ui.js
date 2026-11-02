/* SC-KR 인터랙션 — 내비 활성 표시 · 스크롤 반응 · 기능 상세 모달 · 카드 조명 · 히어로 패럴랙스
 * transform / opacity만 움직이고, '동작 줄이기' 설정과 터치 기기에서는 효과를 줄입니다. */
(function () {
  'use strict';

  var S = window.SCKR || null;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduceMQ = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  var reduce = function () { return reduceMQ.matches; };
  var root = document.documentElement;

  root.classList.add('js');
  if (finePointer) root.classList.add('fine-pointer');

  /* ---------- rAF 스크롤 루프 (스크롤 이벤트마다 한 번만 계산) ---------- */
  var scrollFns = [];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      for (var i = 0; i < scrollFns.length; i++) scrollFns[i](y);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 헤더: 스크롤에 따라 유리 농도·블러가 서서히 진해짐 ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    scrollFns.push(function (y) {
      var p = Math.max(0, Math.min(1, y / 140));
      header.style.setProperty('--nav-p', p.toFixed(3));
    });
    // 모바일 메뉴가 열려 있으면 뒤 페이지 스크롤 잠금
    new MutationObserver(function () {
      root.classList.toggle('menu-open', header.classList.contains('open'));
    }).observe(header, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- 내비 활성 표시 (스크롤 위치 → 움직이는 인디케이터) ---------- */
  var navLinks = document.querySelector('.nav-links');
  var indicator = navLinks && navLinks.querySelector('.nav-indicator');
  var spyLinks = navLinks ? Array.prototype.slice.call(navLinks.querySelectorAll('a[data-spy]')) : [];
  var spyTargets = [
    ['top', document.querySelector('.hero')],
    ['features', document.getElementById('features')],
    ['features', document.getElementById('launcher')],
    ['how', document.getElementById('how')],
    ['updates', document.getElementById('updates')],
    ['download', document.getElementById('download')],
    ['community', document.getElementById('community')],
  ].filter(function (p) { return p[1]; });
  var activeKey = '';

  function moveIndicator() {
    if (!indicator) return;
    var link = spyLinks.filter(function (a) { return a.dataset.spy === activeKey; })[0];
    if (!link || !link.offsetParent || getComputedStyle(indicator).display === 'none') {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
  }
  function setActive(key) {
    if (key === activeKey) return;
    activeKey = key;
    spyLinks.forEach(function (a) {
      if (a.dataset.spy === key) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    moveIndicator();
  }
  if (spyTargets.length) {
    scrollFns.push(function () {
      var line = window.innerHeight * 0.38;
      var key = spyTargets[0][0];
      for (var i = 0; i < spyTargets.length; i++) {
        if (spyTargets[i][1].getBoundingClientRect().top <= line) key = spyTargets[i][0];
      }
      // 페이지 맨 아래에 닿으면 마지막 항목
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) key = spyTargets[spyTargets.length - 1][0];
      setActive(key);
    });
  }
  // 첫 배치에서는 인디케이터를 미끄러뜨리지 않음
  if (indicator) {
    indicator.classList.add('no-anim');
    setTimeout(function () { indicator.classList.remove('no-anim'); }, 400);
  }

  /* ---------- 탭 인디케이터 (업데이트 내역) ---------- */
  function moveTabIndicator() {
    document.querySelectorAll('.tabs').forEach(function (tabs) {
      var ind = tabs.querySelector('.tab-indicator');
      var sel = tabs.querySelector('[aria-selected="true"]');
      if (!ind || !sel) return;
      ind.style.width = sel.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + sel.offsetLeft + 'px)';
    });
  }
  document.addEventListener('sckr:tabs', moveTabIndicator);

  /* ---------- 히어로 패럴랙스 (스크롤 + 아주 약한 포인터) ---------- */
  var backdrop = document.querySelector('.hero-backdrop-img');
  var px = 0, py = 0;
  if (backdrop) {
    var heroY = 0;
    var applyBackdrop = function () {
      backdrop.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + (heroY + py).toFixed(1) + 'px,0) scale(1.08)';
    };
    scrollFns.push(function (y) {
      if (reduce()) return;
      if (y > window.innerHeight * 1.6) return;   // 화면 밖이면 계산 안 함
      heroY = y * 0.22;
      applyBackdrop();
    });
    if (finePointer) {
      var pending = false, lastE = null;
      window.addEventListener('pointermove', function (e) {
        if (reduce() || window.scrollY > window.innerHeight) return;
        lastE = e;
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          px = (lastE.clientX / window.innerWidth - 0.5) * -14;
          py = (lastE.clientY / window.innerHeight - 0.5) * -8;
          applyBackdrop();
        });
      }, { passive: true });
    }
  }

  /* ---------- 유리 카드 조명: 포인터를 따라가는 은은한 반사광 ---------- */
  if (finePointer) {
    var lightCard = null, lx = 0, ly = 0, lightPending = false;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.glass-card');
      if (lightCard && lightCard !== card) lightCard.classList.remove('lit');
      lightCard = card;
      if (!card) return;
      lx = e.clientX; ly = e.clientY;
      if (lightPending) return;
      lightPending = true;
      requestAnimationFrame(function () {
        lightPending = false;
        if (!lightCard) return;
        var r = lightCard.getBoundingClientRect();
        lightCard.style.setProperty('--mx', (lx - r.left) + 'px');
        lightCard.style.setProperty('--my', (ly - r.top) + 'px');
        lightCard.classList.add('lit');
      });
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (lightCard) lightCard.classList.remove('lit'); });
  }

  /* ---------- 기능 상세 모달 ---------- */
  var modal = document.getElementById('featureModal');
  var modalBody = document.getElementById('featureModalBody');
  var lastFocus = null;

  function closeModal() {
    if (!modal || !modal.open || modal.classList.contains('closing')) return;
    if (reduce()) { modal.close(); return; }
    modal.classList.add('closing');
    setTimeout(function () { modal.classList.remove('closing'); modal.close(); }, 200);
  }
  function openFeature(i) {
    if (!S || !modal || typeof modal.showModal !== 'function') return;
    var f = S.feature(i);
    if (!f) return;
    var dl = document.querySelector('.js-download');
    var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    var since = f.since ? '<span class="since mono">' + esc(S.t('status.since').replace('{n}', f.since)) + '</span>' : '';
    modalBody.innerHTML =
      '<div class="modal-icon icon-box">' + f.icon + '</div>' +
      '<div class="modal-meta">' + f.badge + since + '</div>' +
      '<h2 id="featureModalTitle">' + esc(f.title) + '</h2>' +
      '<p>' + esc(f.desc) + '</p>' +
      '<div class="btn-row">' +
        (f.status === 'soon' ? '' : '<a class="btn btn-primary btn-sm" href="' + esc(dl ? dl.href : 'https://github.com/DOKU-web/sc-kr/releases/latest/download/SC-KR-Launcher.exe') + '">' + esc(S.t('cta.download')) + '</a>') +
        '<a class="btn btn-glass btn-sm" href="#how" data-close>' + esc(S.t('modal.guide')) + '</a>' +
      '</div>';
    lastFocus = document.activeElement;
    modal.showModal();
  }
  if (modal) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.feature-open');
      if (btn) { openFeature(parseInt(btn.dataset.feature, 10)); return; }
      if (modal.open && e.target.closest('[data-close]')) {
        var href = e.target.closest('a[href^="#"]');
        closeModal();
        if (href) {
          e.preventDefault();
          var target = document.querySelector(href.getAttribute('href'));
          setTimeout(function () { if (target) target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' }); }, 210);
        }
      }
    });
    // 바깥(배경) 클릭으로 닫기
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
    modal.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  }

  /* ---------- 다시 그려질 때·크기 바뀔 때 인디케이터 위치 맞춤 ---------- */
  function relayout() { moveIndicator(); moveTabIndicator(); }
  document.addEventListener('sckr:render', relayout);
  window.addEventListener('resize', function () { requestAnimationFrame(relayout); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  onScroll();
  requestAnimationFrame(function () { relayout(); root.classList.add('ready'); });
})();
