/* SC-KR 리뷰 — Supabase에 저장. 누구나 보고 쓸 수 있고, 닉네임은 서버에서 * 로 가려서 내려옵니다.
 * DB 설정: 저장소의 supabase/reviews.sql
 * 아래 두 값은 Supabase 프로젝트 → Project Settings → API 에서 복사 (anon 키는 공개해도 되는 키입니다). */
(function () {
  'use strict';

  var SUPABASE_URL = '';        // 예: 'https://abcdefgh.supabase.co'
  var SUPABASE_ANON_KEY = '';   // 'anon public' 키
  var PAGE_SIZE = 20;
  var COOLDOWN_MS = 60 * 1000;  // 같은 브라우저에서 연속 작성 제한
  var ADMIN_KEY_STORE = 'sckr-review-admin';

  var root = document.getElementById('reviews');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('reviewList'), statsEl = $('reviewStats'), form = $('reviewForm'), moreBtn = $('reviewMore');
  var msgEl = $('reviewMsg'), nickEl = $('rvNick'), textEl = $('rvText'), countEl = $('rvCount'), previewEl = $('rvNickPreview');

  var reviews = [], offset = 0, done = false, loading = false;

  function isKo() { return document.documentElement.lang !== 'en'; }
  function L(ko, en) { return isKo() ? ko : en; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 서버(mask_nickname)와 같은 규칙 — 작성 전 미리보기용
  function mask(n) {
    var a = Array.from(n.trim()), l = a.length;
    if (l <= 1) return '*';
    if (l === 2) return a[0] + '*';
    if (l <= 5) return a[0] + '*'.repeat(l - 2) + a[l - 1];
    return a[0] + a[1] + '*'.repeat(l - 3) + a[l - 1];
  }
  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">★</span>';
    return '<span class="rv-stars" aria-label="' + n + ' / 5">' + s + '</span>';
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function setMsg(text, kind) {
    msgEl.textContent = text || '';
    msgEl.className = 'rv-msg' + (kind ? ' ' + kind : '');
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    if (opts.headers) for (var k in opts.headers) headers[k] = opts.headers[k];
    return fetch(SUPABASE_URL + path, { method: opts.method || 'GET', headers: headers, body: opts.body }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) { var e = new Error(t || r.status); e.status = r.status; throw e; }
        return t ? JSON.parse(t) : null;   // 작성 성공(201)은 본문이 비어 있음
      });
    });
  }
  function rpc(fn, args) { return api('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args || {}) }); }

  /* ========== 목록 ========== */
  function isEditable() { return !!(window.SCKR && SCKR.isEditable && SCKR.isEditable()); }

  function render() {
    if (!reviews.length) {
      listEl.innerHTML = '<div class="rv-empty">' + esc(L('아직 리뷰가 없어요. 첫 리뷰를 남겨 주세요!', 'No reviews yet. Be the first!')) + '</div>';
    } else {
      var edit = isEditable();
      listEl.innerHTML = reviews.map(function (r) {
        var del = edit ? '<button type="button" class="del-btn rv-del" data-id="' + r.id + '" aria-label="' + esc(L('리뷰 삭제', 'Delete review')) + '">×</button>' : '';
        return '<article class="rv-card">' + del +
          '<header class="rv-head"><span class="rv-nick mono">' + esc(r.nickname) + '</span>' + stars(r.rating) +
          '<time class="rv-date mono" datetime="' + esc(r.created_at) + '">' + fmtDate(r.created_at) + '</time></header>' +
          '<p class="rv-text">' + esc(r.content) + '</p></article>';
      }).join('');
    }
    moreBtn.hidden = done;
  }

  function loadStats() {
    return rpc('get_review_stats').then(function (rows) {
      var s = rows && rows[0];
      if (!s || !Number(s.total)) { statsEl.hidden = true; return; }
      statsEl.hidden = false;
      statsEl.innerHTML = '<span class="rv-avg">★ ' + Number(s.average).toFixed(1) + '</span><span class="dim">' +
        esc(L('리뷰 ' + s.total + '개', s.total + ' reviews')) + '</span>';
    }).catch(function () {});
  }

  function loadMore() {
    if (loading || done) return;
    loading = true;
    moreBtn.disabled = true;
    rpc('get_reviews', { p_limit: PAGE_SIZE, p_offset: offset }).then(function (rows) {
      rows = rows || [];
      reviews = reviews.concat(rows);
      offset += rows.length;
      if (rows.length < PAGE_SIZE) done = true;
      render();
    }).catch(function () {
      listEl.innerHTML = '<div class="rv-empty">' + esc(L('리뷰를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not load reviews. Please try again later.')) + '</div>';
    }).finally(function () { loading = false; moreBtn.disabled = false; });
  }

  function reload() {
    reviews = []; offset = 0; done = false;
    loadStats();
    loadMore();
  }

  /* ========== 작성 ========== */
  function selectedRating() {
    var r = form.querySelector('input[name="rvRating"]:checked');
    return r ? parseInt(r.value, 10) : 0;
  }
  function lastPosted() { try { return parseInt(localStorage.getItem('sckr-review-last'), 10) || 0; } catch (_) { return 0; } }

  nickEl.addEventListener('input', function () {
    var v = nickEl.value.trim();
    previewEl.textContent = v ? L('표시될 닉네임: ', 'Shown as: ') + mask(v) : '';
  });
  textEl.addEventListener('input', function () { countEl.textContent = textEl.value.length + ' / 500'; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.website.value) return;   // 스팸봇용 숨은 칸
    var nickname = nickEl.value.trim(), content = textEl.value.trim(), rating = selectedRating();
    if (!nickname) { setMsg(L('닉네임을 입력해 주세요.', 'Please enter a nickname.'), 'err'); nickEl.focus(); return; }
    if (!rating) { setMsg(L('별점을 선택해 주세요.', 'Please pick a rating.'), 'err'); return; }
    if (content.length < 2) { setMsg(L('리뷰 내용을 2자 이상 입력해 주세요.', 'Please write at least 2 characters.'), 'err'); textEl.focus(); return; }
    var wait = COOLDOWN_MS - (Date.now() - lastPosted());
    if (wait > 0) { setMsg(L(Math.ceil(wait / 1000) + '초 후에 다시 작성할 수 있어요.', 'Please wait ' + Math.ceil(wait / 1000) + 's.'), 'err'); return; }

    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    setMsg(L('등록 중...', 'Posting...'));
    api('/rest/v1/reviews', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ nickname: nickname, rating: rating, content: content }),
    }).then(function () {
      try { localStorage.setItem('sckr-review-last', String(Date.now())); } catch (_) {}
      form.reset();
      previewEl.textContent = '';
      countEl.textContent = '0 / 500';
      setMsg(L('리뷰가 등록됐어요. 감사합니다!', 'Thanks for your review!'), 'ok');
      reload();
    }).catch(function (err) {
      var m = String(err && err.message || '');
      if (/duplicate/.test(m)) setMsg(L('같은 내용의 리뷰가 이미 있어요.', 'That review was already posted.'), 'err');
      else if (/too many/.test(m)) setMsg(L('지금 작성이 많아요. 잠시 후 다시 시도해 주세요.', 'Too many reviews right now. Try again soon.'), 'err');
      else setMsg(L('등록하지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not post. Please try again later.'), 'err');
    }).finally(function () { btn.disabled = false; });
  });

  /* ========== 삭제 (콘텐츠 편집 모드 + 관리자 키) ========== */
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.rv-del');
    if (!btn) return;
    var key = null;
    try { key = sessionStorage.getItem(ADMIN_KEY_STORE); } catch (_) {}
    if (!key) key = prompt('리뷰 관리자 키를 입력하세요 (Supabase에 설정한 값)');
    if (!key) return;
    if (!confirm('이 리뷰를 삭제할까요?')) return;
    var id = parseInt(btn.getAttribute('data-id'), 10);
    rpc('delete_review', { p_id: id, p_key: key }).then(function () {
      try { sessionStorage.setItem(ADMIN_KEY_STORE, key); } catch (_) {}
      reviews = reviews.filter(function (r) { return r.id !== id; });
      render();
      loadStats();
    }).catch(function (err) {
      try { sessionStorage.removeItem(ADMIN_KEY_STORE); } catch (_) {}
      alert(/invalid admin key/.test(String(err && err.message)) ? '관리자 키가 올바르지 않습니다.' : '삭제하지 못했습니다.');
    });
  });

  /* ========== 시작 ========== */
  moreBtn.addEventListener('click', loadMore);
  document.addEventListener('sckr:editable', render);
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { render(); loadStats(); });
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // 아직 연결 전: 작성 폼 잠그고 안내
    listEl.innerHTML = '<div class="rv-empty">' + esc(L('리뷰 게시판을 준비하고 있어요.', 'Reviews are coming soon.')) + '</div>';
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
    moreBtn.hidden = true;
    return;
  }

  // 화면에 가까워지면 불러오기
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); reload(); }
    }, { rootMargin: '400px' });
    io.observe(root);
  } else {
    reload();
  }
})();
