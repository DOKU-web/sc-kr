/* SC-KR 소개 페이지 — 버전 연동, 다국어, 콘텐츠 렌더링 */
(function () {
  'use strict';

  var GH = {
    owner: 'DOKU-web',
    repo: 'sc-kr',
    branch: 'main',
    launcherVersionFile: 'launcher_version.txt', // 런처 버전 (예: 1.21)
    patchVersionFile: 'version.txt',             // 언어팩 버전 (예: 2.3)
    assetName: 'SC-KR-Launcher.exe',             // 최신 릴리스에 올린 런처 파일
  };

  /* ========== 다국어 문구 ========== */
  var I18N = {
    ko: {
      'nav.label': '주요 메뉴',
      'nav.features': '기능', 'nav.how': '설치 방법', 'nav.crew': '번역팀', 'nav.partners': '파트너', 'nav.wikelo': '위켈로', 'nav.discord': '디스코드',
      'cta.download': '런처 다운로드', 'cta.discord': '디스코드 참여',
      'hero.title': '스타시티즌,<br>이제 <span class="accent">한국어로.</span>',
      'hero.lead': '한국어 번역 적용부터 게임 채팅 한글 입력까지, SC-KR 런처 하나로 끝납니다. 번역팀이 게임 업데이트를 계속 따라가고, 런처는 실행할 때마다 최신 버전을 스스로 확인해요.',
      'meta.launcher': '런처', 'meta.patch': '언어팩', 'meta.size': '파일 크기', 'meta.os': '지원',
      'launcher.label': 'SC-KR 런처 화면 미리보기',
      'launcher.sub': '스타시티즌 한국어 패치', 'launcher.status': '언어팩 상태', 'launcher.applied': '적용 완료',
      'launcher.path': '게임 경로', 'launcher.chat': '한국어 채팅', 'launcher.chatDesc': '한영키로 게임 채팅에 한글 입력',
      'launcher.apply': '자동 다운로드 및 적용',
      'features.title': '런처 하나로 처리합니다',
      'how.title': '네 단계면 준비 끝',
      'how.lead': '설치 프로그램이 따로 없습니다. exe 하나만 받으면 됩니다.',
      'how.s1.title': '다운로드', 'how.s1.body': 'SC-KR-Launcher.exe를 받아 원하는 폴더에 둡니다.',
      'how.s2.title': '폴더 지정', 'how.s2.body': '스타시티즌 LIVE 폴더 경로를 확인·지정합니다.',
      'how.s3.title': '적용', 'how.s3.body': '‘자동 다운로드 및 적용’ 버튼을 누릅니다.',
      'how.s4.title': '실행', 'how.s4.body': '게임을 켜면 한국어로 표시됩니다.',
      'crew.title': '번역팀',
      'crew.lead': '게임이 업데이트될 때마다 새로 생기는 텍스트를 자원해서 번역하고 있습니다.',
      'partners.title': '파트너 스트리머',
      'partners.lead': 'SC-KR과 함께 한국어로 스타시티즌을 즐기는 스트리머들을 만나보세요.',
      'partners.contact': '파트너 문의하기', 'partners.channel': '채널 바로가기',
      'partners.emptyTitle': '첫 파트너를 기다리고 있어요',
      'partners.emptyBody': 'SC-KR과 함께하고 싶은 스트리머라면 디스코드로 문의해 주세요.',
      'discord.title': '디스코드에서 함께 플레이해요',
      'discord.lead': '패치노트와 언어팩 배포 소식을 가장 먼저 받고, 같이 비행할 파티도 찾아보세요. 번역 오류나 버그 제보도 디스코드 티켓으로 받고 있어요.',
      'discord.join': '디스코드 참여하기',
      'footer.admin': '관리자 대시보드', 'footer.edit': '콘텐츠 편집', 'footer.photos': '배경 사진',
      'footer.disclaimer': 'SC-KR은 비공식 커뮤니티 팬 프로젝트로 Cloud Imperium Games 및 Roberts Space Industries와 관련이 없습니다. Star Citizen®은 Cloud Imperium Rights LLC의 등록 상표입니다.',
      'menu.open': '메뉴 열기', 'menu.close': '메뉴 닫기',
    },
    en: {
      'nav.label': 'Main menu',
      'nav.features': 'Features', 'nav.how': 'Setup', 'nav.crew': 'Crew', 'nav.partners': 'Partners', 'nav.wikelo': 'Wikelo', 'nav.discord': 'Discord',
      'cta.download': 'Download launcher', 'cta.discord': 'Join Discord',
      'hero.title': 'Star Citizen,<br>now in <span class="accent">Korean.</span>',
      'hero.lead': 'From applying the Korean translation to typing Hangul in game chat, the SC-KR launcher does it all. The crew keeps up with every game update, and the launcher checks for new versions each time it starts.',
      'meta.launcher': 'Launcher', 'meta.patch': 'Lang pack', 'meta.size': 'Size', 'meta.os': 'Platform',
      'launcher.label': 'SC-KR launcher preview',
      'launcher.sub': 'Star Citizen Korean Patch', 'launcher.status': 'Language pack', 'launcher.applied': 'Applied',
      'launcher.path': 'Game path', 'launcher.chat': 'Korean chat', 'launcher.chatDesc': 'Type Hangul in game chat',
      'launcher.apply': 'Download & apply',
      'features.title': 'One launcher does it all',
      'how.title': 'Ready in four steps',
      'how.lead': 'No installer — just a single exe.',
      'how.s1.title': 'Download', 'how.s1.body': 'Get SC-KR-Launcher.exe and put it in any folder.',
      'how.s2.title': 'Pick the folder', 'how.s2.body': 'Confirm or choose your Star Citizen LIVE folder.',
      'how.s3.title': 'Apply', 'how.s3.body': 'Press “Download & apply”.',
      'how.s4.title': 'Play', 'how.s4.body': 'Launch the game and it shows in Korean.',
      'crew.title': 'Translation crew',
      'crew.lead': 'Volunteers translate the new text that arrives with every game update.',
      'partners.title': 'Partner streamers',
      'partners.lead': 'Meet the streamers playing Star Citizen in Korean with SC-KR.',
      'partners.contact': 'Become a partner', 'partners.channel': 'Visit channel',
      'partners.emptyTitle': 'Waiting for our first partner',
      'partners.emptyBody': 'Streamers who want to team up with SC-KR, reach out on Discord.',
      'discord.title': 'Play together on Discord',
      'discord.lead': 'Get patch notes and language pack releases first, and find a crew to fly with. Translation errors and bug reports go through Discord tickets.',
      'discord.join': 'Join the Discord',
      'footer.admin': 'Admin dashboard', 'footer.edit': 'Edit content', 'footer.photos': 'Photos',
      'footer.disclaimer': 'SC-KR is an unofficial community fan project and is not affiliated with Cloud Imperium Games or Roberts Space Industries. Star Citizen® is a registered trademark of Cloud Imperium Rights LLC.',
      'menu.open': 'Open menu', 'menu.close': 'Close menu',
    },
  };

  /* ========== 기능 아이콘 ========== */
  var ICON_PATHS = {
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M9 10h6M9 13.5h4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 10"/>',
    table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
    cursor: '<path d="M8 3v3"/><path d="M3 8h3"/><path d="m4.5 4.5 2 2"/><path d="m11 11 9 3.5-3.8 1.5-1.6 3.8Z"/>',
    box: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    shield: '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6Z"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15 6 12c1.5-4.5 5.5-9 14-9 0 8.5-4.5 12.5-9 14Z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  var ICON_LABELS = {
    download: '다운로드', chat: '채팅', check: '체크', table: '표', refresh: '새로고침', star: '별',
    cursor: '클릭', box: '패키지', globe: '지구', shield: '방패', bolt: '번개', rocket: '로켓', users: '사람들', gear: '설정',
  };
  // 예전 사이트의 문자 아이콘 호환
  var LEGACY_ICONS = { '↓': 'download', '가': 'chat', '✓': 'check', '▤': 'table', '↻': 'refresh', '★': 'star' };

  function iconHtml(icon) {
    var key = ICON_PATHS[icon] ? icon : LEGACY_ICONS[icon];
    if (key) {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[key] + '</svg>';
    }
    return '<span aria-hidden="true">' + esc(icon || '•') + '</span>';
  }

  var ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  var PERSON = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>';

  /* ========== 상태 ========== */
  function readJson(id, fallback) {
    try { return JSON.parse(document.getElementById(id).textContent); } catch (_) { return fallback; }
  }
  var data = {
    features: readJson('features-data', []),
    crew: readJson('crew-data', []),
    partners: readJson('partners-data', []),
  };
  var lang = 'ko';
  var editable = false;

  function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.ko[key] || ''; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function delBtn(o, kind, i, label) {
    return o.editable ? '<button type="button" class="del-btn" data-kind="' + kind + '" data-i="' + i + '" aria-label="' + esc(label) + ' 삭제">×</button>' : '';
  }
  function tl(key, l) { return (I18N[l] && I18N[l][key]) || I18N.ko[key] || ''; }

  /* ========== 렌더링 ==========
   * 목록 HTML은 editor.js가 저장할 때 index.html에도 미리 넣어 둡니다 (JS를 실행하지 않는 검색 로봇용). */
  function featuresHtml(o) {
    return data.features.map(function (f, i) {
      var title = o.lang === 'en' && f.titleEn ? f.titleEn : f.title;
      var desc = o.lang === 'en' && f.descEn ? f.descEn : f.desc;
      return '<article class="feature">' + delBtn(o, 'features', i, f.title) +
        '<div class="icon-box">' + iconHtml(f.icon) + '</div>' +
        '<h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p></article>';
    }).join('');
  }

  /* 번역팀 역할 — 콘텐츠 편집에서 선택지로 나옴. 목록에 없는 역할은 '직접 입력'으로 추가 가능 */
  var CREW_ROLES = [
    { ko: '런처 개발자', en: 'Launcher developer' },
    { ko: '번역팀', en: 'Translation' },
    { ko: '의역팀', en: 'Localization' },
    { ko: '검수팀', en: 'Proofreading' },
    { ko: '운영진', en: 'Operations' },
    { ko: '디자이너', en: 'Design' },
  ];
  var NO_ROLE = { ko: '팀원', en: 'Members' };

  // 예전 형식("이름")과 새 형식({name, role}) 모두 지원
  function crewItem(c) { return typeof c === 'string' ? { name: c, role: '' } : { name: c.name || '', role: c.role || '' }; }
  function roleLabel(role, l) {
    if (!role) return l === 'en' ? NO_ROLE.en : NO_ROLE.ko;
    for (var i = 0; i < CREW_ROLES.length; i++) if (CREW_ROLES[i].ko === role) return l === 'en' ? CREW_ROLES[i].en : role;
    return role;
  }

  function crewHtml(o) {
    // 역할별로 묶기: 기본 역할 순서 → 직접 입력한 역할(처음 나온 순서) → 역할 없음
    var groups = {}, order = [];
    data.crew.forEach(function (c, i) {
      var it = crewItem(c);
      if (!groups[it.role]) { groups[it.role] = []; order.push(it.role); }
      groups[it.role].push({ name: it.name, i: i });
    });
    var rank = function (r) {
      if (!r) return 1000;
      for (var k = 0; k < CREW_ROLES.length; k++) if (CREW_ROLES[k].ko === r) return k;
      return 100 + order.indexOf(r);
    };
    order.sort(function (a, b) { return rank(a) - rank(b); });
    return order.map(function (role) {
      return '<div class="crew-group"><div class="crew-role mono">' + esc(roleLabel(role, o.lang)) + '</div><ul class="crew">' +
        groups[role].map(function (m) {
          var edit = o.editable ? '<button type="button" class="edit-btn" data-kind="crew" data-i="' + m.i + '" aria-label="' + esc(m.name) + ' 역할 수정">✎</button>' : '';
          return '<li>' + esc(m.name) + edit + delBtn(o, 'crew', m.i, m.name) + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  function partnersHtml(o) {
    if (!data.partners.length) {
      return '<div class="partners-empty"><strong>' + esc(tl('partners.emptyTitle', o.lang)) + '</strong><span>' + esc(tl('partners.emptyBody', o.lang)) + '</span></div>';
    }
    return data.partners.map(function (p, i) {
      var avatarUrl = safeUrl(p.avatar);
      var url = safeUrl(p.url);
      var avatar = avatarUrl ? '<img src="' + esc(avatarUrl) + '" alt="' + esc(p.name) + '" loading="lazy">' : PERSON;
      var link = url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener"><span>' + esc(tl('partners.channel', o.lang)) + '</span>' + ARROW + '</a>' : '';
      return '<article class="partner">' + delBtn(o, 'partners', i, p.name) +
        '<div class="avatar">' + avatar + '</div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<div class="platform">' + esc(p.platform) + '</div>' + link + '</article>';
    }).join('');
  }

  var RENDERERS = {
    features: { id: 'featuresGrid', html: featuresHtml },
    crew: { id: 'crewList', html: crewHtml },
    partners: { id: 'partnerList', html: partnersHtml },
  };

  function renderAll() {
    var o = { lang: lang, editable: editable };
    Object.keys(RENDERERS).forEach(function (k) {
      document.getElementById(RENDERERS[k].id).innerHTML = RENDERERS[k].html(o);
    });
  }
  // 검색 로봇용 정적 HTML (한국어, 편집 버튼 없음)
  function staticHtml(kind) { return RENDERERS[kind].html({ lang: 'ko', editable: false }); }

  /* ========== 언어 전환 ========== */
  function setLang(next) {
    lang = I18N[next] ? next : 'ko';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var parts = el.dataset.i18nAttr.split(':');
      el.setAttribute(parts[0], t(parts[1]));
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    var menuBtn = document.querySelector('.menu-toggle');
    if (menuBtn) menuBtn.setAttribute('aria-label', t(menuBtn.getAttribute('aria-expanded') === 'true' ? 'menu.close' : 'menu.open'));
    renderAll();
    try { localStorage.setItem('sckr-lang', lang); } catch (_) {}
  }

  /* ========== 버전 · 다운로드 (GitHub 연동) ========== */
  function withV(v) { return v && !/^v/i.test(v) ? 'v' + v : v; }
  function formatBytes(n) {
    if (!n) return '';
    var mb = n / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(mb >= 100 ? 0 : 1) + ' MB' : Math.ceil(n / 1024) + ' KB';
  }
  function applyRelease(info) {
    if (info.launcher) document.querySelectorAll('.js-version').forEach(function (el) { el.textContent = withV(info.launcher); });
    if (info.patch) document.querySelectorAll('.js-patch-version').forEach(function (el) { el.textContent = withV(info.patch); });
    if (info.url) document.querySelectorAll('.js-download').forEach(function (a) { a.href = info.url; });
    if (info.size) {
      document.querySelectorAll('.js-filesize').forEach(function (el) { el.textContent = formatBytes(info.size); });
      document.querySelectorAll('.js-filesize-wrap').forEach(function (el) { el.hidden = false; });
    }
  }
  // 버전 파일은 raw로, 파일 크기는 릴리스 API로 가져옴. API는 IP당 시간당 60회 제한이라 10분간 캐시.
  function loadRelease() {
    var cacheKey = 'sckr-release:' + GH.owner + '/' + GH.repo;
    try {
      var cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.at < 10 * 60 * 1000) { applyRelease(cached.data); return; }
    } catch (_) {}

    function raw(file) {
      return fetch('https://raw.githubusercontent.com/' + GH.owner + '/' + GH.repo + '/' + GH.branch + '/' + file, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (txt) { return txt.trim().split(/\s+/)[0] || ''; })
        .catch(function () { return ''; });
    }
    var release = fetch('https://api.github.com/repos/' + GH.owner + '/' + GH.repo + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });

    Promise.all([raw(GH.launcherVersionFile), raw(GH.patchVersionFile), release]).then(function (res) {
      var rel = res[2];
      var asset = rel && (rel.assets || []).filter(function (a) { return a.name === GH.assetName; })[0];
      var info = {
        launcher: res[0],
        patch: res[1],
        url: asset ? asset.browser_download_url : '',
        size: asset ? asset.size : 0,
      };
      applyRelease(info);
      if (info.launcher || info.patch || asset) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: info })); } catch (_) {}
      }
    });
  }

  /* ========== 모바일 메뉴 · 헤더 ========== */
  function initMenu() {
    var header = document.querySelector('.site-header');
    var btn = document.querySelector('.menu-toggle');
    function setOpen(open) {
      header.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', t(open ? 'menu.close' : 'menu.open'));
    }
    btn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
    document.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });

    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section-head, .features, .steps, .crew-groups, .partners, .cta-panel').forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  function toast(msg) {
    var el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.style.opacity = '0'; }, 2600);
  }

  /* ========== 시작 ========== */
  var saved = 'ko';
  try { saved = localStorage.getItem('sckr-lang') || 'ko'; } catch (_) {}
  document.querySelectorAll('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  setLang(saved);
  initMenu();
  initReveal();
  loadRelease();
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); });
  });

  // editor.js(콘텐츠 편집)에서 사용
  window.SCKR = {
    data: data,
    render: renderAll,
    setEditable: function (v) { editable = !!v; renderAll(); },
    iconKeys: Object.keys(ICON_PATHS),
    iconLabels: ICON_LABELS,
    toast: toast,
    staticHtml: staticHtml,
    crewRoles: CREW_ROLES,
    crewItem: crewItem,
  };
})();
