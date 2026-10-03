/* 위켈로 페이지 — 분류 탭, 검색, 모바일 메뉴 */
(function () {
  'use strict';

  var tabs = document.querySelectorAll('.wk-tab');
  var search = document.getElementById('wkSearch');
  var cards = document.querySelectorAll('.wk-card');
  var groups = document.querySelectorAll('.wk-group');
  var countEl = document.getElementById('wkCount');
  var emptyEl = document.getElementById('wkEmpty');
  var cat = 'all';

  function apply() {
    var q = (search.value || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (cat === 'all' || c.dataset.cat === cat) && (!q || c.dataset.search.indexOf(q) !== -1);
      c.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    groups.forEach(function (g) {
      g.classList.toggle('is-hidden', !g.querySelector('.wk-card:not(.is-hidden)'));
    });
    countEl.textContent = (q || cat !== 'all') ? '계약 ' + shown + '개' : '';
    emptyEl.hidden = shown > 0;
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      cat = t.dataset.cat;
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      apply();
    });
  });
  var timer;
  search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });

  // 헤더 · 모바일 메뉴
  var header = document.querySelector('.site-header');
  var btn = document.querySelector('.menu-toggle');
  function setOpen(open) {
    header.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }
  btn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
