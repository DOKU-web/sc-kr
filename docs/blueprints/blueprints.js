/* SC-KR 청사진 데이터베이스
 * - bp.json(목록) → 분류·세부 분류·검색·필터·정렬, 48개씩 나눠 그리기(스크롤하면 더 불러옴)
 * - 상세: 재료(보유 수량), 품질 슬롯·성능 변화(bp-detail.json), 분해, 획득 미션(missions.json — 펼칠 때 받음)
 * - 재료 상세: 채굴 지역·설명·이 재료가 쓰이는 청사진
 * - 내 기록(localStorage): 재료 보유 수량, 만들 목록(수량), 보유한 청사진 / 플래너: 남은 재료 합계·복사·백업 */
(function () {
  'use strict';

  var VER = document.documentElement.dataset.ver || '';
  var PAGE = 48;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString('ko-KR'); }
  function fmtTime(sec) {
    if (!sec) return '-';
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + '시간 ' : '') + (m ? m + '분 ' : '') + (!h && s ? s + '초' : '').trim() || '0초';
  }

  /* ========== 번역 ========== */
  var SLOT = { Frame: '프레임', Emitter: '방출기', Barrel: '총열', Body: '본체', Stock: '개머리', Receiver: '리시버', Core: '코어',
    Plating: '장갑판', Padding: '패딩', Lining: '안감', Shell: '외피', Housing: '하우징', Coil: '코일', Capacitor: '축전기',
    Casing: '케이스', Circuitry: '회로', Fabric: '원단', Weave: '직조', Filter: '필터', Lens: '렌즈', Battery: '배터리', Mechanism: '기계 장치',
    Exterior: '외장', Interior: '내장', Structure: '구조', Optics: '광학부', Magazine: '탄창', Ammo: '탄약', Muzzle: '총구',
    'Acceleration Unit': '가속 장치', 'Anchor Pins': '고정 핀', 'Aperture Iris': '조리개', 'Armored Carapace': '장갑 외피', Barrels: '총열',
    Case: '케이스', Conduit: '도관', 'Conduit Channel': '도관 채널', Coolant: '냉각재', Cycler: '사이클러', 'Distorter Unit': '디스토터 장치',
    'Drive Motor': '구동 모터', Electronics: '전자 장치', 'F R A M E': '프레임', 'Filament Coating': '필라멘트 코팅', 'Focus Zone Plate': '초점판',
    Grip: '손잡이', 'Insulative Liner': '단열 안감', 'Internal Array': '내부 배열', Lattice: '격자 구조', Lenses: '렌즈', Magnetizer: '자화 장치',
    'Panel Covering': '패널 덮개', 'Plating Barrier': '장갑 방벽', 'Precision Parts': '정밀 부품', 'Pump Impeller': '펌프 임펠러',
    Radiator: '방열기', 'Reinforced Frame': '강화 프레임', 'Segment Paneling': '분할 패널', Shot: '탄', Stabilizer: '안정 장치',
    Substrate: '기판', 'Suit Underlay': '슈트 안감', 'Support Structure': '지지 구조', 'Thermal Sink': '방열판', 'Torque Junction': '토크 접합부',
    Wiring: '배선' };
  var MOD = { Integrity: '내구도', 'Impact Force': '충격력', Damage: '피해량', 'Fire Rate': '연사력', Spread: '탄 퍼짐', Recoil: '반동',
    Range: '사거리', Heat: '발열', 'Heat Generation': '발열', Capacity: '용량', 'Power Draw': '전력 소모', 'Power Output': '전력 출력',
    'Cooling Rate': '냉각률', 'Shield Strength': '실드 강도', 'Shield Regen': '실드 재생', Speed: '속도', 'Spool Time': '가동 시간',
    'Fuel Efficiency': '연료 효율', 'Detection Range': '탐지 범위', Signature: '신호', Protection: '보호력', 'Damage Reduction': '피해 감소',
    'Temperature Resistance': '온도 저항', 'Radiation Resistance': '방사선 저항', Mobility: '기동성', 'Carry Capacity': '휴대 용량',
    Durability: '내구성', 'Projectile Speed': '탄속', 'Reload Speed': '재장전 속도', Accuracy: '정확도', Stability: '안정성',
    'Beam Force': '빔 출력', 'Coolant Rating': '냉각 성능', 'Damage Mitigation': '피해 경감', 'Full Strength Dist.': '최대 위력 거리',
    'Max Temp': '최고 온도', 'Min Temp': '최저 온도', 'Max. Distance': '최대 거리', 'Max. Volume': '최대 부피',
    'Radiation Dissipation': '방사선 방출', 'Recoil Handling': '반동 제어', 'Recoil Kick': '반동 세기', 'Recoil Smoothness': '반동 안정성' };
  function tr(map, s) { return (map && map[s]) || s; }
  var REG = { Stanton: '스탠턴', Pyro: '파이로', Nyx: '닉스' };

  /* ========== 데이터 ========== */
  var D = null, detail = null, mdesc = null;
  var byU = {}, ingUse = {}, missionBps = {};
  function getJSON(name) { return fetch(name + '?v=' + VER).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function loadDetail() { return detail ? Promise.resolve(detail) : getJSON('bp-detail.json').then(function (d) { detail = d; return d; }); }
  function loadDesc() { return mdesc ? Promise.resolve(mdesc) : getJSON('missions.json').then(function (d) { mdesc = d; return d; }); }

  function ingName(i) { var g = D.ing[i]; return g ? (g.k || g.n) : '?'; }
  function ingNameHtml(i) { var g = D.ing[i]; return g ? esc(g.k || g.n) + (g.k ? ' <span class="wk-en-sub">(' + esc(g.n) + ')</span>' : '') : '?'; }
  function bpName(b) { return b.k || b.n || b.u; }
  function bpNameFull(b) { return b.k ? b.k + ' (' + b.n + ')' : (b.n || b.u); }
  function ingNameFull(i) { var g = D.ing[i]; return g ? (g.k ? g.k + ' (' + g.n + ')' : g.n) : '?'; }
  // 아이템 이름: 한국어 (영어 원본)
  function bpLabelHtml(b) { return b.k ? esc(b.k) + ' <span class="wk-en-sub">(' + esc(b.n) + ')</span>' : esc(b.n || b.u); }
  var PH = { TargetName: '대상', Location: '장소', Destination: '목적지', System: '성계', Ship: '함선', Item: '아이템', Contractor: '의뢰인', Danger: '위험도', Amount: '수량', Reward: '보상', Creature: '생물', Commodity: '화물', ObjectiveSetupItem: '목표 물품' };
  function koPH(t) { return String(t || '').replace(/\[([A-Za-z]+)\]/g, function (_, k) { return '[' + (PH[k] || k) + ']'; }); }
  function mName(m) { return m.k ? koPH(m.k) : m.n; }
  function catKo(c) { for (var i = 0; i < D.meta.cats.length; i++) if (D.meta.cats[i][0] === c) return D.meta.cats[i][1]; return c; }
  function typeKo(b) { return tr(D.meta.typeKo, b.t); }
  function weightKo(b) { return b.c === 'armor' || b.c === 'fps' ? tr(D.meta.weightKo, b.w) : ''; }
  function qtyText(q, scu) { return scu ? fmt(q) + ' SCU' : fmt(q) + '개'; }

  /* ========== 내 기록 ========== */
  var KEY = 'sckr-bp-v1';
  var st = { owned: {}, tracked: {}, have: {} };
  try {
    var sv = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (sv) { st.owned = sv.owned || {}; st.tracked = sv.tracked || {}; st.have = sv.have || {}; }
  } catch (_) {}
  var saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} }, 150); }
  function ingKey(i) { return D.ing[i].n; }
  function owned(i) { return Number(st.owned[ingKey(i)]) || 0; }
  function setOwned(i, v) {
    v = Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
    if (v) st.owned[ingKey(i)] = v; else delete st.owned[ingKey(i)];
    save(); refresh();
  }
  function tracked(u) { return st.tracked[u] || 0; }
  function setTracked(u, n) { n = Math.max(0, Math.min(99, n | 0)); if (n) st.tracked[u] = n; else delete st.tracked[u]; save(); refresh(); }
  function has(u) { return !!st.have[u]; }
  function toggleHave(u) { if (st.have[u]) delete st.have[u]; else st.have[u] = 1; save(); refresh(); }
  function canCraft(b, times) {
    times = times || 1;
    return b.i.length > 0 && b.i.every(function (x) { return owned(x[0]) >= x[1] * times - 1e-9; });
  }
  function progress(b, times) {
    times = times || 1;
    if (!b.i.length) return 0;
    var s = 0;
    b.i.forEach(function (x) { s += Math.min(1, owned(x[0]) / (x[1] * times)); });
    return Math.round(s / b.i.length * 100);
  }

  /* ========== 목록 ========== */
  var cat = 'all', sub = '', q = '', sort = 'name', filters = { tracked: false, owned: false, ready: false, mission: false, default: false }, region = '';
  var view = [], shown = 0;
  var CAT_ICON = {
    fps: '<path d="M3 10h13l2-2h3v4h-3l-1 1H9l-1 4H5l1-4H3Z"/>', attach: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 7h4M10 11h4"/>',
    armor: '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6Z"/>', shipwpn: '<path d="M4 12h12l3-2v4l-3-2"/><path d="M6 9v6M10 9v6"/>',
    shipcomp: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/><circle cx="16.5" cy="14.5" r="1.5"/>',
    utility: '<path d="M14 4l6 6-9 9H5v-6Z"/><path d="m12 6 6 6"/>', other: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'
  };
  function icon(c) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (CAT_ICON[c] || CAT_ICON.other) + '</svg>'; }

  function subKey(b) { return b.c === 'armor' ? b.t : (b.c === 'fps' ? (b.w || '') : b.t); }
  function subLabel(b) { return b.c === 'fps' ? tr(D.meta.weightKo, b.w) : typeKo(b); }

  function renderCats() {
    var total = D.bps.length;
    $('bpCats').innerHTML = '<button type="button" class="wk-tab" data-cat="all" aria-pressed="' + (cat === 'all') + '">전체 <span>' + total + '</span></button>' +
      D.meta.cats.map(function (c) {
        return '<button type="button" class="wk-tab" data-cat="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + esc(c[1]) + ' <span>' + c[2] + '</span></button>';
      }).join('');
    var subs = {};
    if (cat !== 'all') D.bps.forEach(function (b) { if (b.c === cat) { var k = subKey(b); if (k) subs[k] = subs[k] || [subLabel(b), 0]; if (k) subs[k][1]++; } });
    var keys = Object.keys(subs);
    $('bpSubs').hidden = keys.length < 2;
    $('bpSubs').innerHTML = keys.length < 2 ? '' : '<button type="button" class="bp-sub" data-sub="" aria-pressed="' + (!sub) + '">전체</button>' +
      keys.sort(function (a, b) { return subs[b][1] - subs[a][1]; }).map(function (k) {
        return '<button type="button" class="bp-sub" data-sub="' + esc(k) + '" aria-pressed="' + (sub === k) + '">' + esc(subs[k][0]) + ' <span>' + subs[k][1] + '</span></button>';
      }).join('');
  }

  function apply(keepScroll) {
    var words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    view = D.bps.filter(function (b) {
      if (cat !== 'all' && b.c !== cat) return false;
      if (sub && subKey(b) !== sub) return false;
      if (filters.tracked && !tracked(b.u)) return false;
      if (filters.owned && !has(b.u)) return false;
      if (filters.ready && !canCraft(b)) return false;
      if (filters.mission && !b.m) return false;
      if (filters.default && !b.d) return false;
      if (region && (!b.r || b.r.indexOf(region) === -1)) return false;
      for (var i = 0; i < words.length; i++) if (b._s.indexOf(words[i]) === -1) return false;
      return true;
    });
    var cmp = {
      name: function (a, b) { return bpName(a).localeCompare(bpName(b), 'ko'); },
      time: function (a, b) { return (a.tm || 9e9) - (b.tm || 9e9); },
      ing: function (a, b) { return a.i.length - b.i.length || bpName(a).localeCompare(bpName(b), 'ko'); },
      grade: function (a, b) { return (b.g || 0) - (a.g || 0) || bpName(a).localeCompare(bpName(b), 'ko'); }
    }[sort];
    view.sort(cmp);
    shown = 0;
    $('bpGrid').innerHTML = '';
    more();
    var filtering = words.length || cat !== 'all' || region || Object.keys(filters).some(function (k) { return filters[k]; });
    $('bpCount').textContent = filtering ? '청사진 ' + view.length.toLocaleString('ko-KR') + '개' : '';
    $('bpEmpty').hidden = view.length > 0;
    if (!keepScroll && filtering && window.scrollY > $('list').offsetTop + 400) $('list').scrollIntoView({ block: 'start' });
  }

  function card(b) {
    var t = tracked(b.u), h = has(b.u), ready = canCraft(b), p = progress(b);
    var ings = b.i.slice(0, 4).map(function (x) {
      var ok = owned(x[0]) >= x[1];
      return '<li class="' + (ok ? 'ok' : '') + '"><button type="button" class="bp-ing" data-ing="' + x[0] + '">' + ingNameHtml(x[0]) + '</button><span class="mono">' + qtyText(x[1], x[2]) + '</span></li>';
    }).join('') + (b.i.length > 4 ? '<li class="dim">외 ' + (b.i.length - 4) + '종</li>' : '');
    var src = b.d ? '<span class="bp-badge bp-badge-def">기본 제공</span>' : (b.m ? '<span class="bp-badge bp-badge-ms">🎯 미션 ' + b.m.length + '개</span>' : '<span class="bp-badge">획득처 정보 없음</span>');
    var tags = [typeKo(b), weightKo(b), b.x && b.x[1], b.g && b.g !== '1' ? b.g + '등급' : ''].filter(Boolean);
    return '<article class="bp-card' + (ready ? ' is-ready' : '') + (h ? ' is-have' : '') + '" data-u="' + b.u + '">' +
      '<div class="bp-card-head">' + (b.im ? '<button type="button" class="bp-thumb" data-bp="' + b.u + '" tabindex="-1" aria-hidden="true"><img src="' + esc(b.im) + '" alt="" loading="lazy" decoding="async" width="72" height="72"></button>' : '<span class="bp-icon">' + icon(b.c) + '</span>') +
        '<div class="bp-title"><button type="button" class="bp-open" data-bp="' + b.u + '">' + bpLabelHtml(b) + '</button>' +
          '<span class="bp-tags">' + esc(tags.join(' · ')) + '</span></div>' +
        '<button type="button" class="wk-star bp-star' + (t ? ' on' : '') + '" data-track="' + b.u + '" aria-pressed="' + !!t + '" title="' + (t ? '만들 목록에서 빼기' : '만들 목록에 추가') + '">' + (t ? '★' : '☆') + '</button></div>' +
      '<ul class="bp-ings">' + ings + '</ul>' +
      '<div class="bp-card-foot">' + src + regionBadges(b.r) + '<span class="bp-time mono" title="제작 시간">⏱ ' + fmtTime(b.tm) + '</span>' +
        '<button type="button" class="bp-have' + (h ? ' on' : '') + '" data-have="' + b.u + '" title="이 청사진을 가지고 있어요">' + (h ? '📘 보유' : '보유 표시') + '</button></div>' +
      (p && !ready ? '<div class="wk-prog-bar bp-prog"><span style="width:' + p + '%"></span></div>' : '') +
    '</article>';
  }

  function more() {
    var next = view.slice(shown, shown + PAGE);
    $('bpGrid').insertAdjacentHTML('beforeend', next.map(card).join(''));
    shown += next.length;
    $('bpMore').hidden = shown >= view.length;
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    if (es[0].isIntersecting && D && shown < view.length) more();
  }, { rootMargin: '600px' }) : null;

  // 기록이 바뀌면 보이는 카드만 다시 그림 (스크롤 유지)
  function redrawCards() {
    document.querySelectorAll('.bp-card').forEach(function (el) {
      var b = byU[el.dataset.u];
      if (b) el.outerHTML = card(b);
    });
  }

  /* ========== 수량 입력 ========== */
  function stepper(i, need, scu) {
    var h = owned(i);
    return '<span class="wk-step" data-ing="' + i + '">' +
      '<button type="button" class="wk-step-btn" data-step="' + (scu ? -0.1 : -1) + '" aria-label="빼기">−</button>' +
      '<input type="number" class="wk-step-in mono" min="0" step="' + (scu ? '0.01' : '1') + '" inputmode="decimal" value="' + (h || '') + '" placeholder="0" aria-label="보유 수량">' +
      '<button type="button" class="wk-step-btn" data-step="' + (scu ? 0.1 : 1) + '" aria-label="더하기">+</button>' +
      (need != null ? '<span class="wk-step-need mono">/ ' + qtyText(need, scu) + '</span><button type="button" class="wk-step-max" data-max="' + need + '">MAX</button>' : (scu ? '<span class="wk-step-need mono">SCU</span>' : '')) +
      '</span>';
  }

  /* ========== 상세 보기 ========== */
  var modal = $('wkModal'), body = $('wkModalBody'), back = $('wkModalBack'), stack = [];

  function missionMeta(m, chance) {
    var bits = [];
    if (chance != null) bits.push(chance >= 1 ? '확정 지급' : '확률 ' + Math.round(chance * 100) + '%');
    if (m.type) bits.push(tr(D.meta.mtypeKo, m.type));
    return bits.join(' · ');
  }
  // 미션 이름: 한국어(영어)
  function missionTitleHtml(m) {
    return m.k ? esc(koPH(m.k)) + '<span class="wk-en-sub">(' + esc(m.n) + ')</span>' : esc(m.n);
  }
  function regionBadges(list) {
    return (list || []).map(function (s) { return '<span class="bp-reg bp-reg-' + s.toLowerCase() + '">' + REG[s] + '</span>'; }).join('');
  }
  function missionCard(idx, chance) {
    var m = D.ms[idx];
    var title = missionTitleHtml(m);
    var rows = [
      ['의뢰인', esc(m.giver || '-') + (m.fac && m.fac !== m.giver ? ' <span class="dim">· ' + esc(m.fac) + '</span>' : '') + (m.ill ? ' <span class="bp-ill">불법</span>' : '')],
      m.sys && m.sys.length ? ['성계', m.sys.map(function (s) { return REG[s] + '(' + s + ')'; }).join(', ')] : null,
      m.area ? ['작전 지역', esc(m.area)] : null,
      m.min ? ['필요 평판', esc(m.min)] : null,
      m.rep ? ['완료 평판', '+' + m.rep] : null,
      m.enemy ? ['적 수', m.enemy[0] + '–' + m.enemy[1]] : null,
      m.time ? ['제한 시간', fmtTime(m.time * 60)] : null,
      ['기타', [m.share ? '파티 공유 가능' : '혼자만', m.once ? '1회 한정' : '반복 가능'].join(' · ')]
    ].filter(Boolean);
    var others = (missionBps[idx] || []).filter(function (u) { return u; });
    return '<details class="wk-mission" data-mission="' + idx + '"><summary><span class="wk-mission-title">' + title + '</span>' +
      '<span class="wk-mission-meta">' + regionBadges(m.sys) + esc(missionMeta(m, chance)) + '</span></summary>' +
      '<div class="wk-mission-body"><dl class="wk-m-dl bp-mdl">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
      (m.at && m.at.length ? '<div class="wk-m-subtitle">미션이 뜨는 곳' + (m.atn ? ' <span class="dim">(' + m.atn + '곳 중 일부)</span>' : '') + '</div><div class="wk-m-chips bp-locs">' +
        m.at.map(function (l) { return '<span class="wk-m-chip bp-loc">📍 ' + esc(l) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="bp-mdesc" data-desc="' + idx + '"><p class="dim">미션 설명 불러오는 중…</p></div>' +
      (others.length > 1 ? '<div class="wk-m-subtitle">이 미션으로 얻는 청사진 ' + others.length + '개</div><div class="wk-m-chips">' +
        others.slice(0, 40).map(function (u) { var b = byU[u]; return b ? '<button type="button" class="wk-m-chip" data-bp="' + u + '">' + bpLabelHtml(b) + '</button>' : ''; }).join('') +
        (others.length > 40 ? '<span class="dim">외 ' + (others.length - 40) + '개</span>' : '') + '</div>' : '') +
      '</div></details>';
  }
  function gameText(s) {
    // 게임 속 자리 표시(~mission(TargetName) 등) → [대상]
    s = String(s || '').replace(/~mission\(([A-Za-z]+)[^)]*\)/g, function (_, k) { return '[' + (PH[k] || k) + ']'; });
    return esc(s.split('\\n').join('\n').replace(/\s+$/, ''))
      .replace(/&lt;EM\d&gt;/g, '<b>').replace(/&lt;\/EM\d&gt;/g, '</b>');
  }

  function renderBp(u) {
    var b = byU[u], t = tracked(u), h = has(u), ready = canCraft(b, t || 1);
    var tags = [catKo(b.c), typeKo(b), weightKo(b)].concat(b.x || []).filter(Boolean);
    var html = (b.im ? '<div class="wk-m-hero bp-m-hero"><img src="' + esc(b.im) + '" alt=""></div>' : '') +
      '<div class="bp-m-head">' + (b.im ? '' : '<span class="bp-icon bp-icon-lg">' + icon(b.c) + '</span>') + '<div>' +
      '<div class="wk-m-kicker mono">' + esc(tags.join(' · ')) + '</div>' +
      '<h3 class="wk-m-title" id="wkModalTitle">' + bpLabelHtml(b) + '</h3></div></div>' +
      '<div class="wk-m-meta"><span>제작 시간 <b>' + fmtTime(b.tm) + '</b></span>' + (b.g ? '<span>등급 <b>' + esc(b.g) + '</b></span>' : '') +
        '<span>획득 <b>' + (b.d ? '기본 제공' : (b.m ? '미션 ' + b.m.length + '개' : '정보 없음')) + '</b></span>' +
        (b.r ? '<span>미션 성계 ' + regionBadges(b.r) + '</span>' : '') + '</div>' +
      '<div class="wk-m-actions"><div class="bp-track"><button type="button" class="btn btn-sm ' + (t ? 'btn-primary' : 'btn-ghost') + '" data-track="' + u + '">' + (t ? '★ 만들 목록' : '☆ 만들 목록에 추가') + '</button>' +
        (t ? '<span class="bp-times"><button type="button" class="wk-step-btn" data-times="-1" data-u="' + u + '">−</button><b class="mono">×' + t + '</b><button type="button" class="wk-step-btn" data-times="1" data-u="' + u + '">+</button></span>' : '') + '</div>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-have="' + u + '">' + (h ? '📘 보유한 청사진 (취소)' : '📘 이 청사진 보유') + '</button>' +
        '<span class="bp-ready ' + (ready ? 'ok' : '') + '">' + (ready ? '✓ 지금 제작 가능' + (t > 1 ? ' (×' + t + ')' : '') : '재료 ' + progress(b, t || 1) + '%') + '</span></div>' +
      '<div class="wk-m-sec"><h4>필요 재료' + (t > 1 ? ' <small>×' + t + '개 기준</small>' : '') + ' <small>보유 수량을 적어 두면 진행률이 계산돼요 · 이름을 누르면 어디서 구하는지</small></h4><ul class="wk-m-items">' +
        b.i.map(function (x) {
          var need = x[1] * (t || 1), g = D.ing[x[0]];
          return '<li class="wk-m-order' + (owned(x[0]) >= need ? ' full' : '') + '" data-need="' + need + '">' +
            '<button type="button" class="wk-m-item" data-ing="' + x[0] + '"><span class="wk-m-thumb"><span class="wk-m-noimg">' + (g.kind === 'resource' ? '⛏' : '◆') + '</span></span>' +
            '<span class="wk-m-qty mono">' + qtyText(need, x[2]) + '</span><span class="wk-m-name">' + ingNameHtml(x[0]) + '</span><span class="wk-m-go">어디서? →</span></button>' +
            '<div class="wk-m-have"><span class="dim">보유</span>' + stepper(x[0], need, x[2]) + '</div></li>';
        }).join('') + '</ul></div>' +
      '<div class="bp-detail-slot" data-u="' + u + '"><p class="dim">품질 정보 불러오는 중…</p></div>';
    if (b.m) {
      html += '<div class="wk-m-sec"><h4>청사진 얻는 미션 <small>눌러서 의뢰인 · 지역 · 평판 · 미션 내용 보기</small></h4><div class="wk-missions">' +
        b.m.map(function (x) { return missionCard(x[0], x[1]); }).join('') + '</div></div>';
    } else if (b.d) {
      html += '<div class="wk-m-sec"><h4>획득 방법</h4><p class="wk-game-text">처음부터 가지고 있는 <b>기본 제공 청사진</b>이에요.</p></div>';
    } else {
      html += '<div class="wk-m-sec"><h4>획득 방법</h4><p class="dim">데이터에 이 청사진을 주는 미션 정보가 없어요. 게임 업데이트로 추가될 수 있어요.</p></div>';
    }
    html += '<p class="wk-m-source dim">데이터: Star Citizen Wiki API (게임 ' + esc(D.meta.version || '') + ') · 한국어: SC-KR 한국어 패치</p>';
    return html;
  }

  function fillDetail(u) {
    loadDetail().then(function (dt) {
      var slot = body.querySelector('.bp-detail-slot[data-u="' + u + '"]');
      if (!slot) return;
      var d = dt[u] || {};
      var h = '';
      var src = body.querySelector('.wk-m-source');
      if (d.ic && src && src.textContent.indexOf('이미지') === -1) src.insertAdjacentHTML('afterbegin', '이미지: ' + esc(d.ic[0]) + ' (' + esc(d.ic[1]) + ', Star Citizen Wiki) · ');
      if (d.slots && d.slots.length) {
        h += '<div class="wk-m-sec"><h4>재료 품질과 성능 <small>슬롯마다 넣는 재료의 품질(1~1000)에 따라 성능이 달라져요</small></h4>' +
          '<label class="bp-q"><span>재료 품질</span><input type="range" min="1" max="1000" value="500" id="bpQ" aria-label="재료 품질"><b class="mono" id="bpQv">500</b></label>' +
          '<div class="bp-slots">' + d.slots.map(function (s) {
            return '<div class="bp-slot"><div class="bp-slot-head"><b>' + esc(tr(SLOT, s.s)) + '</b> <span class="dim">' + esc(s.s) + '</span>' +
              (s.in != null ? '<span class="bp-slot-in">' + ingNameHtml(s.in) + ' · ' + qtyText(s.q, s.scu) + (s.mq > 1 ? ' · 최소 품질 ' + s.mq : '') + '</span>' : '') + '</div>' +
              (s.mod.length ? '<ul class="bp-mods">' + s.mod.map(function (m) {
                return '<li data-a="' + m[1] + '" data-b="' + m[2] + '" data-better="' + m[3] + '"><span>' + esc(tr(MOD, m[0])) + '</span>' +
                  '<span class="mono bp-mod-range">×' + fmt(m[1]) + ' ~ ×' + fmt(m[2]) + '</span><b class="mono bp-mod-now"></b></li>';
              }).join('') + '</ul>' : '<p class="dim small">성능 변화 없음</p>') + '</div>';
          }).join('') + '</div></div>';
      }
      if (d.dt || (d.ret && d.ret.length)) {
        h += '<div class="wk-m-sec"><h4>분해</h4><p class="wk-game-text">분해 시간 <b>' + fmtTime(d.dt) + '</b>' + (d.eff ? ' · 회수율 <b>' + Math.round(d.eff * 100) + '%</b>' : '') + '</p>' +
          (d.ret && d.ret.length ? '<div class="wk-m-chips">' + d.ret.map(function (r) { return '<button type="button" class="wk-m-chip" data-ing="' + r[0] + '">' + ingNameHtml(r[0]) + ' ' + fmt(r[1]) + ' SCU</button>'; }).join('') + '</div>' : '') + '</div>';
      }
      slot.innerHTML = h;
      updateQuality();
    }).catch(function () {
      var slot = body.querySelector('.bp-detail-slot');
      if (slot) slot.innerHTML = '<p class="dim">품질 정보를 불러오지 못했어요.</p>';
    });
  }
  function updateQuality() {
    var r = $('bpQ');
    if (!r) return;
    var qv = Number(r.value), k = (qv - 0) / 1000;
    $('bpQv').textContent = qv;
    body.querySelectorAll('.bp-mods li').forEach(function (li) {
      var a = Number(li.dataset.a), b = Number(li.dataset.b), v = a + (b - a) * k;
      var good = li.dataset.better === 'lower' ? v <= 1 : v >= 1;
      var el = li.querySelector('.bp-mod-now');
      el.textContent = (v >= 1 ? '+' : '') + Math.round((v - 1) * 1000) / 10 + '%';
      el.className = 'mono bp-mod-now ' + (Math.abs(v - 1) < 1e-6 ? '' : (good ? 'up' : 'down'));
    });
  }

  function renderIng(i) {
    var g = D.ing[i], uses = ingUse[i] || [];
    var h = '<div class="bp-m-head"><span class="bp-icon bp-icon-lg"><span class="bp-ing-ic">' + (g.kind === 'resource' ? '⛏' : '◆') + '</span></span><div>' +
      '<div class="wk-m-kicker mono">' + (g.kind === 'resource' ? '자원 (SCU 단위)' : '아이템') + '</div>' +
      '<h3 class="wk-m-title" id="wkModalTitle">' + ingNameHtml(i) + '</h3></div></div>';
    if (g.desc) h += '<p class="wk-m-lead">' + esc(g.desc) + '</p>';
    var total = 0;
    Object.keys(st.tracked).forEach(function (u) {
      var b = byU[u];
      if (b) b.i.forEach(function (x) { if (x[0] === i) total += x[1] * st.tracked[u]; });
    });
    h += '<div class="wk-m-mine"><div><div class="wk-m-subtitle">내 보유 수량</div>' + stepper(i, null, g.kind === 'resource') + '</div>' +
      (total ? '<div class="wk-m-mine-need"><span class="dim">만들 목록에 필요</span><b class="mono">' + fmt(total) + (g.kind === 'resource' ? ' SCU' : '개') + '</b>' +
        '<span class="dim">남음</span><b class="mono">' + fmt(Math.max(0, total - owned(i))) + '</b></div>' : '') + '</div>';
    h += '<div class="wk-m-sec"><h4>어디서 구하나요?</h4>';
    if (g.loc && g.loc.length) {
      h += '<p class="wk-game-text">채굴로 얻는 자원이에요. 아래 지역에서 발견돼요. 원광은 정제소에서 정제해야 SCU 자원이 됩니다.</p><div class="wk-m-chips bp-locs">' +
        g.loc.map(function (l) { return '<span class="wk-m-chip bp-loc">📍 ' + esc(l) + '</span>'; }).join('') + '</div>';
    } else if (g.kind === 'resource') {
      h += '<p class="wk-game-text">채굴 · 회수 · 구매로 얻는 자원이에요. 데이터에 상세 지역 정보가 없어요.</p>';
    } else {
      h += '<p class="wk-game-text">개인(FPS) 채굴로 얻는 광물이거나 전리품으로 나오는 아이템이에요. 동굴 · 소행성 표면에서 손 채굴 도구로 캘 수 있는 경우가 많아요.</p>';
    }
    h += '</div><div class="wk-m-sec"><h4>이 재료가 쓰이는 청사진 <small>' + uses.length + '개</small></h4><div class="wk-m-chips">' +
      uses.slice(0, 60).map(function (u) { var b = byU[u]; return '<button type="button" class="wk-m-chip" data-bp="' + u + '">' + (tracked(u) ? '★ ' : '') + bpLabelHtml(b) + '</button>'; }).join('') +
      (uses.length > 60 ? '<button type="button" class="wk-m-chip" data-search-ing="' + i + '">전체 ' + uses.length + '개 목록에서 보기 →</button>' : '') + '</div></div>';
    return h;
  }

  function show(v, push) {
    if (push !== false) stack.push(v);
    body.innerHTML = v.type === 'bp' ? renderBp(v.id) : renderIng(v.id);
    body.scrollTop = 0;
    back.hidden = stack.length < 2;
    if (!modal.open) { if (modal.showModal) modal.showModal(); else modal.setAttribute('open', ''); document.documentElement.classList.add('wk-modal-open'); }
    if (v.type === 'bp') fillDetail(v.id);
  }
  function rerenderModal() {
    var v = stack[stack.length - 1];
    if (!modal.open || !v) return;
    var top = body.scrollTop, open = [].map.call(body.querySelectorAll('details[open]'), function (d) { return d.dataset.mission; });
    show(v, false);
    open.forEach(function (m) { var d = body.querySelector('details[data-mission="' + m + '"]'); if (d) { d.open = true; fillDesc(d); } });
    body.scrollTop = top;
  }
  function closeModal() { stack = []; if (modal.close) modal.close(); else modal.removeAttribute('open'); document.documentElement.classList.remove('wk-modal-open'); }
  function fillDesc(det) {
    var idx = det.dataset.mission, box = det.querySelector('.bp-mdesc');
    if (!box || box.dataset.done) return;
    loadDesc().then(function (all) {
      var d = all[idx] || {};
      box.dataset.done = 1;
      box.innerHTML = (d.ko || d.en) ? '<div class="wk-m-subtitle">미션 내용</div><div class="wk-game-text wk-contract-text">' + gameText(d.ko || d.en) + '</div>' +
        (d.ko && d.en ? '<details class="wk-m-orig"><summary>영어 원본 보기</summary><div class="wk-game-text">' + gameText(d.en) + '</div></details>' : '') : '<p class="dim">미션 설명이 없어요.</p>';
    });
  }
  body.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('details.wk-mission') && e.target.open) fillDesc(e.target); }, true);
  body.addEventListener('input', function (e) { if (e.target.id === 'bpQ') updateQuality(); });

  /* ========== 플래너 ========== */
  function remaining() {
    var agg = {};
    Object.keys(st.tracked).forEach(function (u) {
      var b = byU[u], n = st.tracked[u];
      if (!b) return;
      b.i.forEach(function (x) {
        var a = agg[x[0]] || (agg[x[0]] = { i: x[0], need: 0, scu: x[2], used: [] });
        a.need += x[1] * n;
        a.used.push(bpNameFull(b) + (n > 1 ? ' ×' + n : ''));
      });
    });
    return Object.keys(agg).map(function (k) {
      var a = agg[k]; a.have = owned(a.i); a.left = Math.max(0, a.need - a.have); return a;
    }).sort(function (x, y) { return (y.left > 0) - (x.left > 0) || y.left - x.left; });
  }
  function renderPlanner() {
    var us = Object.keys(st.tracked).filter(function (u) { return byU[u]; });
    if (!us.length) {
      $('planBody').innerHTML = '<div class="wk-plan-empty">아직 만들 목록이 없어요. 아래 청사진의 <b>☆</b>를 눌러 추가해 보세요.' +
        (Object.keys(st.have).length ? '<br><span class="dim">보유한 청사진 ' + Object.keys(st.have).length + '개가 기록돼 있어요.</span>' : '') + '</div>';
      return;
    }
    var rows = remaining(), left = rows.filter(function (r) { return r.left > 0; }).length;
    var ready = us.filter(function (u) { return canCraft(byU[u], st.tracked[u]); }).length;
    var noBp = us.filter(function (u) { return !has(u) && !byU[u].d; }).length;
    $('planBody').innerHTML =
      '<div class="wk-plan-stats"><div><span class="dim">만들 목록</span><b>' + us.length + '</b></div>' +
      '<div><span class="dim">지금 제작 가능</span><b class="ok">' + ready + '</b></div>' +
      '<div><span class="dim">청사진 미보유</span><b>' + noBp + '</b></div>' +
      '<div><span class="dim">더 모을 재료</span><b>' + left + '종</b></div></div>' +
      '<div class="wk-plan-chips">' + us.map(function (u) {
        var b = byU[u], n = st.tracked[u], ok = canCraft(b, n), p = progress(b, n);
        var need = !has(u) && !b.d;
        return '<div class="wk-plan-chip' + (ok ? ' is-ready' : '') + '"><button type="button" class="wk-plan-chip-name" data-bp="' + u + '" title="' + esc(bpNameFull(b)) + '">' + bpLabelHtml(b) + (n > 1 ? ' ×' + n : '') + '</button>' +
          '<div class="wk-prog-bar"><span style="width:' + (ok ? 100 : p) + '%"></span></div><span class="wk-plan-chip-pct mono">' + (ok ? '제작 가능' : p + '%') + (need ? ' · <span class="bp-need-bp" title="청사진을 아직 보유하지 않음">청사진 필요</span>' : '') + '</span>' +
          '<button type="button" class="wk-plan-chip-x" data-untrack="' + u + '" aria-label="목록에서 빼기">×</button></div>';
      }).join('') + '</div>' +
      (rows.length ? '<div class="wk-plan-table"><table><thead><tr><th>재료</th><th>필요</th><th>보유</th><th>남음</th></tr></thead><tbody>' + rows.map(function (r) {
        var g = D.ing[r.i];
        return '<tr class="' + (r.left ? '' : 'full') + '"><td><div class="wk-plan-name"><span class="wk-m-thumb"><span>' + (g.kind === 'resource' ? '⛏' : '◆') + '</span></span><div>' +
          '<button type="button" class="wk-plan-item" data-ing="' + r.i + '">' + ingNameHtml(r.i) + '</button><div class="wk-plan-used dim">' + esc(r.used.join(' · ')) + '</div></div></div></td>' +
          '<td class="mono">' + qtyText(r.need, r.scu) + '</td><td>' + stepper(r.i, null, r.scu) + '</td>' +
          '<td class="mono wk-plan-left">' + (r.left ? qtyText(r.left, r.scu) : '✓') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '');
  }
  function toast(msg) {
    var t = document.querySelector('.wk-toast');
    if (!t) { t = document.createElement('div'); t.className = 'wk-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  $('plCopy').addEventListener('click', function () {
    if (!D) return;
    var rows = remaining().filter(function (r) { return r.left > 0; });
    var lines = ['[청사진 제작 플래너 — SC-KR]', '만들 목록: ' + Object.keys(st.tracked).filter(function (u) { return byU[u]; }).map(function (u) { return bpNameFull(byU[u]) + (st.tracked[u] > 1 ? ' ×' + st.tracked[u] : ''); }).join(', '), ''];
    if (rows.length) { lines.push('더 모을 재료:'); rows.forEach(function (r) { var g = D.ing[r.i]; lines.push('- ' + (g.k ? g.k + ' (' + g.n + ')' : g.n) + ': ' + qtyText(r.left, r.scu)); }); }
    else lines.push('필요한 재료를 모두 모았어요!');
    lines.push('', 'https://doku-web.github.io/sc-kr/blueprints/');
    var text = lines.join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('남은 재료 목록을 복사했어요.'); }).catch(function () { prompt('아래 내용을 복사하세요', text); });
  });
  $('plExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ app: 'sckr-blueprints', v: 1, savedAt: new Date().toISOString(), data: st }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sckr-blueprints-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('백업 파일을 저장했어요.');
  });
  $('plImport').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var j = JSON.parse(txt), d = j && (j.data || j);
      if (!d || typeof d.owned !== 'object') throw 0;
      if (!confirm('현재 기록을 백업 파일 내용으로 바꿀까요?')) return;
      st = { owned: d.owned || {}, tracked: d.tracked || {}, have: d.have || {} }; save(); refresh(); toast('백업을 불러왔어요.');
    }).catch(function () { alert('백업 파일을 읽지 못했어요.'); });
    this.value = '';
  });
  $('plReset').addEventListener('click', function () {
    if (!confirm('재료 보유 수량, 만들 목록, 보유 청사진 기록을 모두 지울까요?')) return;
    st = { owned: {}, tracked: {}, have: {} }; save(); refresh();
  });

  /* ========== 이벤트 ========== */
  function refresh() { if (!D) return; renderPlanner(); redrawCards(); rerenderModal(); }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('.wk-step-btn[data-step], .wk-step-max'))) {
      var w = el.closest('.wk-step'), i = Number(w.dataset.ing);
      setOwned(i, el.dataset.max ? Number(el.dataset.max) : owned(i) + Number(el.dataset.step));
      return;
    }
    if ((el = e.target.closest('[data-times]'))) { setTracked(el.dataset.u, tracked(el.dataset.u) + Number(el.dataset.times)); return; }
    if ((el = e.target.closest('[data-track]'))) { var u = el.dataset.track; setTracked(u, tracked(u) ? 0 : 1); return; }
    if ((el = e.target.closest('[data-untrack]'))) { setTracked(el.dataset.untrack, 0); return; }
    if ((el = e.target.closest('[data-have]'))) { toggleHave(el.dataset.have); return; }
    if ((el = e.target.closest('[data-search-ing]'))) {
      closeModal(); q = D.ing[Number(el.dataset.searchIng)].n; $('bpSearch').value = q; cat = 'all'; sub = ''; renderCats(); apply(); $('list').scrollIntoView(); return;
    }
    if ((el = e.target.closest('[data-ing]')) && !e.target.closest('.wk-step')) { e.preventDefault(); show({ type: 'ing', id: Number(el.dataset.ing) }); return; }
    if ((el = e.target.closest('[data-bp]'))) { e.preventDefault(); show({ type: 'bp', id: el.dataset.bp }); return; }
    if ((el = e.target.closest('.wk-tab[data-cat]'))) { cat = el.dataset.cat; sub = ''; renderCats(); apply(); return; }
    if ((el = e.target.closest('.bp-sub'))) { sub = el.dataset.sub; renderCats(); apply(); return; }
    if ((el = e.target.closest('.bp-region'))) {
      region = el.dataset.region;
      document.querySelectorAll('.bp-region').forEach(function (r) { r.setAttribute('aria-pressed', String(r === el)); });
      apply(); return;
    }
    if ((el = e.target.closest('.wk-filter'))) { var k = el.dataset.filter; filters[k] = !filters[k]; el.setAttribute('aria-pressed', String(filters[k])); apply(); return; }
  });
  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('wk-step-in')) setOwned(Number(e.target.closest('.wk-step').dataset.ing), e.target.value);
  });
  $('bpSort').addEventListener('change', function () { sort = this.value; apply(true); });
  var sT;
  $('bpSearch').addEventListener('input', function () { var v = this.value; clearTimeout(sT); sT = setTimeout(function () { q = v; apply(true); }, 150); });
  $('bpMoreBtn').addEventListener('click', more);
  back.addEventListener('click', function () { stack.pop(); var p = stack[stack.length - 1]; if (p) show(p, false); });
  $('wkModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.addEventListener('close', function () { stack = []; document.documentElement.classList.remove('wk-modal-open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !modal.open) { e.preventDefault(); $('bpSearch').focus(); }
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    try { var d = JSON.parse(e.newValue || '{}'); st = { owned: d.owned || {}, tracked: d.tracked || {}, have: d.have || {} }; } catch (_) {}
    refresh();
  });
  // 주소에 ?bp=xxxx 또는 #bp-xxxx 가 있으면 바로 열기 (공유 링크용)
  function openFromUrl() {
    var m = (location.search.match(/[?&]bp=([0-9a-f]{8})/) || location.hash.match(/bp-([0-9a-f]{8})/));
    if (m && byU[m[1]]) show({ type: 'bp', id: m[1] });
  }

  /* ========== 헤더 · 모바일 메뉴 ========== */
  var header = document.querySelector('.site-header'), menuBtn = document.querySelector('.menu-toggle');
  function setOpen(o) { header.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); }
  menuBtn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ========== 시작 ========== */
  getJSON('bp.json').then(function (d) {
    D = d;
    D.bps.forEach(function (b) {
      byU[b.u] = b;
      b.i.forEach(function (x) { (ingUse[x[0]] = ingUse[x[0]] || []).push(b.u); });
      (b.m || []).forEach(function (x) { (missionBps[x[0]] = missionBps[x[0]] || []).push(b.u); });
      b._s = [b.k, b.n, typeKo(b), b.t, weightKo(b), (b.x || []).join(' '), (b.r || []).map(function (r) { return REG[r] + ' ' + r; }).join(' ')].concat(
        b.i.map(function (x) { var g = D.ing[x[0]]; return (g.k || '') + ' ' + g.n; }),
        (b.m || []).map(function (x) { var m = D.ms[x[0]]; return (m.k || '') + ' ' + m.n + ' ' + (m.giver || ''); })
      ).join(' ').toLowerCase();
    });
    renderCats();
    apply(true);
    renderPlanner();
    if (io) io.observe($('bpMore'));
    openFromUrl();
  }).catch(function (err) {
    if (window.console) console.error(err);
    $('bpGrid').innerHTML = '<p class="wk-empty" data-err="' + esc(err && (err.stack || err.message || err)) + '">청사진 데이터를 불러오지 못했어요. 새로고침해 주세요.</p>';
  });
})();
