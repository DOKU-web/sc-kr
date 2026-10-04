/* 위켈로 페이지
 * - 분류 탭 · 검색 · 필터(추적 중 / 지금 완료 가능 / 완료 숨기기)
 * - 상세 보기(계약 · 아이템 · 획득 방법)
 * - 내 진행 기록: 보유 수량, ★ 추적, 완료 표시 (localStorage, 이 브라우저에만 저장)
 * - 내 계약 플래너: 추적 계약의 남은 재료 합계, 복사, 백업/불러오기 */
(function () {
  'use strict';

  /* ========== 번역 표 ========== */
  var ACQ = { Mine: '채굴', Harvest: '채집', Buy: '구매', Loot: '전리품', Craft: '제작', Pledge: '후원(현금)', Rent: '대여', Salvage: '회수' };
  var ACQ_ICON = { Mine: '⛏️', Harvest: '🌿', Buy: '🛒', Loot: '📦', Craft: '🔨', Pledge: '💵', Rent: '🔑', Salvage: '♻️' };
  var STATE = { yes: '가능', no: '불가', unknown: '정보 없음' };
  var CARD = { 'Shops': '판매처', 'Ship mining': '함선 채굴', 'FPS mining': '개인(FPS) 채굴', 'Ground vehicle mining': '차량 채굴',
    'Vehicle mining': '차량 채굴', 'Harvesting': '채집', 'Harvestables': '채집', 'Loot': '전리품', 'Loot locations': '전리품 위치', 'Rental': '대여' };
  var HEAD = { 'Body': '천체', 'Type': '종류', 'Spawn %': '출현율', 'Quality': '품질', 'Location': '위치', 'Locations': '위치',
    'Shop': '상점', 'Price': '가격', 'Buy': '구매가', 'Sell': '판매가', 'System': '성계', 'Planet/ Moon': '행성/위성', 'Planet/Moon': '행성/위성',
    'Name': '이름', 'Terminal': '터미널', 'Stock': '재고', 'Probability': '확률', 'Container': '컨테이너', 'Area': '구역', 'Rate': '확률' };
  var INFO = { 'Manufacturer': '제조사', 'Size': '크기', 'Type': '종류', 'Class': '분류', 'Damage': '피해량', 'Ammo': '탄약', 'Muzzle velocity': '탄속',
    'Range': '사거리', 'Career': '직군', 'Role': '역할', 'Model': '모델', 'Crew': '승무원', 'Cargo': '화물', 'Inventory': '인벤토리',
    'Max medical': '최대 의료 등급', 'Internal cargo': '내부 화물', 'Max container': '최대 컨테이너', 'Stations': '스테이션', 'Beds': '침대',
    'Medical bed': '의료 침대', 'Weapon racks': '무기 거치대', 'Signature': '신호', 'Effects': '효과', 'Single use': '일회용', 'Reclosable': '다시 닫기',
    'Grade': '등급', 'Capacity': '용량', 'Temperature': '온도', 'Radiation': '방사선', 'Damage reduction': '피해 감소', 'Carrying capacity': '휴대 용량',
    'Weight': '무게', 'Volume': '부피', 'Mass': '질량', 'Length': '길이', 'Width': '너비', 'Height': '높이', 'Fire rate': '연사력', 'Magazine': '탄창',
    'Weapon': '무기', 'Fire modes': '사격 모드', 'Mining': '채굴', 'Consumable': '소모품', 'Armor': '방어구', 'Clothing': '의류', 'Ship': '함선',
    'Vehicle': '차량', 'Overview': '개요', 'Acquisition': '획득 방식', 'Harvesting': '채집', 'Crafting': '제작', 'Salvage': '회수',
    'Hull': '선체', 'Speed': '속도', 'Single': '단발', 'Burst': '점사', 'Rapid': '연사', 'Charge': '충전' };
  var SUB = { 'Mineral': '광물', 'Misc item': '기타 아이템', 'Personal weapon': '개인 화기', 'Drink': '음료', 'Food': '음식',
    'Commodity': '원자재', 'Metal': '금속', 'Ore': '광석', 'Gem': '보석', 'Currency': '화폐', 'Helmet': '헬멧', 'Undersuit': '언더슈트',
    'Backpack': '배낭', 'Arms': '팔 방어구', 'Legs': '다리 방어구', 'Core': '코어 방어구', 'Magazine': '탄창', 'Vehicle weapon': '탑재 무기',
    'Clothing': '의류', 'Hat': '모자', 'Arm armor': '팔 방어구', 'Torso armor': '몸통 방어구', 'Leg armor': '다리 방어구', 'Headgear': '모자',
    'Collection': '컬렉션', 'Device': '장치', 'Unrefined ores': '원광', 'Cargo': '화물', 'Gun': '총기',
    'Shirt': '셔츠', 'Jacket': '재킷', 'Organic': '유기물', 'Container': '용기', 'Medal': '메달' };
  var CELL = { 'Moon': '위성', 'Planet': '행성', 'Asteroid': '소행성', 'Asteroid field': '소행성대', 'Ring': '고리', 'Lagrange point': '라그랑주 점',
    'Station': '정거장', 'Outpost': '전초기지', 'Cave': '동굴', 'Yes': '예', 'No': '아니오' };
  var RARITY = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅', legendary: '전설' };
  function tr(map, s) { return map[s] || s; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString('ko-KR'); }

  /* ========== 데이터 ========== */
  var data = null, loading = null;
  function loadData() {
    if (data) return Promise.resolve(data);
    if (!loading) {
      loading = fetch('data.json?v=' + (document.documentElement.dataset.ver || ''))
        .then(function (r) { return r.json(); })
        .then(function (d) { data = d; return d; });
    }
    return loading;
  }

  /* ========== 내 진행 기록 (이 브라우저에 저장) ========== */
  var STORE_KEY = 'sckr-wikelo-v1';
  var st = { owned: {}, tracked: [], done: [] };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      st.owned = saved.owned || {}; st.tracked = saved.tracked || []; st.done = saved.done || [];
    }
  } catch (_) {}
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (_) {} }, 150);
  }
  function itemKey(it) { return it.page || it.name; }
  function need(it) { var m = String(it.qty || '1').replace(/,/g, '').match(/[\d.]+/); return m ? parseFloat(m[0]) : 1; }
  function unit(it) { return /SCU/i.test(it.qty || '') ? ' SCU' : ''; }
  function owned(key) { return Number(st.owned[key]) || 0; }
  function setOwned(key, v) {
    v = Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
    if (v) st.owned[key] = v; else delete st.owned[key];
    save();
    refresh();
  }
  function isTracked(id) { return st.tracked.indexOf(id) !== -1; }
  function isDone(id) { return st.done.indexOf(id) !== -1; }
  function toggle(list, id) {
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    save();
    refresh();
  }
  // 계약 진행률 (재료별로 필요량까지만 인정해 평균)
  function progress(c) {
    if (!c.orders.length) return { pct: 0, ready: false };
    var sum = 0, ready = true;
    c.orders.forEach(function (o) {
      var n = need(o), h = owned(itemKey(o));
      sum += Math.min(1, h / n);
      if (h < n) ready = false;
    });
    return { pct: Math.round(sum / c.orders.length * 100), ready: ready };
  }

  /* ========== 카드 꾸미기 (★ · 진행률 · 보유 수량) ========== */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.wk-card'));
  cards.forEach(function (card) {
    var id = card.dataset.id;
    var star = document.createElement('button');
    star.type = 'button';
    star.className = 'wk-star';
    star.dataset.track = id;
    card.appendChild(star);
    var bar = document.createElement('div');
    bar.className = 'wk-prog';
    bar.innerHTML = '<div class="wk-prog-bar"><span></span></div><div class="wk-prog-row"><span class="wk-prog-text"></span>' +
      '<button type="button" class="wk-done-btn" data-done="' + id + '"></button></div>';
    card.querySelector('.wk-body').insertBefore(bar, card.querySelector('.wk-cols'));
  });

  function decorateCards() {
    if (!data) return;
    cards.forEach(function (card) {
      var c = data.contracts[card.dataset.id];
      if (!c) return;
      var p = progress(c), t = isTracked(c.id), d = isDone(c.id);
      var star = card.querySelector('.wk-star');
      star.textContent = t ? '★' : '☆';
      star.classList.toggle('on', t);
      star.setAttribute('aria-pressed', String(t));
      star.setAttribute('aria-label', t ? '추적 해제' : '추적하기');
      star.title = t ? '추적 해제' : '플래너에 추적하기';
      card.classList.toggle('is-done', d);
      card.classList.toggle('is-ready', p.ready && !d);
      card.querySelector('.wk-prog-bar span').style.width = (d ? 100 : p.pct) + '%';
      card.querySelector('.wk-prog-text').textContent = d ? '✓ 완료한 계약' : (p.ready ? '✓ 재료 다 모음 — 납품 가능!' : (p.pct ? '재료 ' + p.pct + '% 모음' : '재료 0%'));
      var db = card.querySelector('.wk-done-btn');
      db.textContent = d ? '완료 취소' : '완료 표시';
      db.setAttribute('aria-pressed', String(d));
      // 재료 옆 보유 수량
      card.querySelectorAll('.wk-items:not(.wk-rewards) li').forEach(function (li, i) {
        var o = c.orders[i];
        if (!o) return;
        var h = owned(itemKey(o)), n = need(o);
        var tag = li.querySelector('.wk-have');
        if (!h) { if (tag) tag.remove(); return; }
        if (!tag) { tag = document.createElement('span'); tag.className = 'wk-have mono'; li.appendChild(tag); }
        tag.textContent = fmt(Math.min(h, n)) + '/' + fmt(n);
        tag.classList.toggle('full', h >= n);
      });
    });
  }

  /* ========== 분류 · 검색 · 필터 ========== */
  var tabs = document.querySelectorAll('.wk-tab');
  var search = document.getElementById('wkSearch');
  var groups = document.querySelectorAll('.wk-group');
  var countEl = document.getElementById('wkCount');
  var emptyEl = document.getElementById('wkEmpty');
  var cat = 'all', filters = { tracked: false, ready: false, hideDone: false };

  function apply() {
    var q = (search.value || '').trim().toLowerCase();
    var shown = 0, filtering = q || cat !== 'all' || filters.tracked || filters.ready || filters.hideDone;
    cards.forEach(function (card) {
      var id = card.dataset.id, ok = (cat === 'all' || card.dataset.cat === cat) && (!q || card.dataset.search.indexOf(q) !== -1);
      if (ok && filters.tracked) ok = isTracked(id);
      if (ok && filters.ready) ok = card.classList.contains('is-ready');
      if (ok && filters.hideDone) ok = !isDone(id);
      card.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    groups.forEach(function (g) { g.classList.toggle('is-hidden', !g.querySelector('.wk-card:not(.is-hidden)')); });
    countEl.textContent = filtering ? '계약 ' + shown + '개' : '';
    emptyEl.hidden = shown > 0;
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      cat = t.dataset.cat;
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      apply();
    });
  });
  document.querySelectorAll('.wk-filter').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.filter;
      filters[k] = !filters[k];
      b.setAttribute('aria-pressed', String(filters[k]));
      apply();
    });
  });
  var timer;
  search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
  // "/" 키로 검색창 바로 가기
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !modal.open) {
      e.preventDefault();
      search.focus();
      search.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });

  /* ========== 수량 입력 ========== */
  function stepper(key, n, u) {
    var h = owned(key);
    return '<span class="wk-step" data-key="' + esc(key) + '">' +
      '<button type="button" class="wk-step-btn" data-step="-1" aria-label="1 빼기">−</button>' +
      '<input type="number" class="wk-step-in mono" min="0" step="any" inputmode="decimal" value="' + (h || '') + '" placeholder="0" aria-label="보유 수량">' +
      '<button type="button" class="wk-step-btn" data-step="1" aria-label="1 더하기">+</button>' +
      (n != null ? '<span class="wk-step-need mono">/ ' + fmt(n) + esc(u || '') + '</span>' : '') +
      (n != null ? '<button type="button" class="wk-step-max" data-max="' + n + '" title="필요한 만큼 채우기">MAX</button>' : '') +
      '</span>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.wk-step-btn, .wk-step-max');
    if (!b) return;
    var wrap = b.closest('.wk-step'), key = wrap.dataset.key;
    if (b.dataset.max) setOwned(key, Number(b.dataset.max));
    else setOwned(key, owned(key) + Number(b.dataset.step));
    syncSteppers(key);
  });
  document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('wk-step-in')) return;
    var key = e.target.closest('.wk-step').dataset.key;
    setOwned(key, e.target.value);
    syncSteppers(key);
  });
  function syncSteppers(key) {
    document.querySelectorAll('.wk-step').forEach(function (w) {
      if (w.dataset.key !== key) return;
      var inp = w.querySelector('.wk-step-in');
      if (document.activeElement !== inp) inp.value = owned(key) || '';
      var row = w.closest('[data-need]');
      if (row) row.classList.toggle('full', owned(key) >= Number(row.dataset.need));
    });
  }

  /* ========== 상세 보기 ========== */
  var modal = document.getElementById('wkModal');
  var body = document.getElementById('wkModalBody');
  var backBtn = document.getElementById('wkModalBack');
  var stack = [];

  function itemList(list, kind) {
    return '<ul class="wk-m-items">' + list.map(function (it) {
      var info = it.page && data.items[it.page];
      var thumb = info && info.img ? '<img src="' + esc(info.img.file) + '" alt="" loading="lazy">' : '<span class="wk-m-noimg">' + esc((it.name || '?')[0]) + '</span>';
      var hint = kind === 'orders' ? '<span class="wk-m-go">획득 방법 →</span>' : '<span class="wk-m-go">자세히 →</span>';
      var inner = '<span class="wk-m-thumb">' + thumb + '</span><span class="wk-m-qty mono">' + esc(it.qty) + '</span><span class="wk-m-name">' + itemNameHtml(it.ko, it.name) + '</span>' + (info ? hint : '');
      var btn = info ? '<button type="button" class="wk-m-item" data-item="' + esc(it.page) + '">' + inner + '</button>' : '<div class="wk-m-item">' + inner + '</div>';
      if (kind !== 'orders') return '<li>' + btn + '</li>';
      var n = need(it), key = itemKey(it);
      return '<li class="wk-m-order' + (owned(key) >= n ? ' full' : '') + '" data-need="' + n + '">' + btn +
        '<div class="wk-m-have"><span class="dim">보유</span>' + stepper(key, n, unit(it)) + '</div></li>';
    }).join('') + '</ul>';
  }

  function table(tb) {
    var head = tb.head && tb.head.length ? '<thead><tr>' + tb.head.map(function (h) { return '<th>' + esc(tr(HEAD, h)) + '</th>'; }).join('') + '</tr></thead>' : '';
    var rows = tb.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(tr(CELL, c)) + '</td>'; }).join('') + '</tr>'; }).join('');
    return (tb.caption ? '<div class="wk-m-cap">' + esc(tb.caption.replace(/ System$/, ' 성계')) + '</div>' : '') +
      '<div class="wk-m-table"><table>' + head + '<tbody>' + rows + '</tbody></table></div>' +
      (tb.more ? '<div class="wk-m-more dim">외 ' + tb.more + '곳 더</div>' : '');
  }

  // 계약 이름: 게임 속 한국어 (영어 원본)
  function cKo(c) { return (c.game && c.game.ko) || c.name; }
  function cName(c) { return c.game && c.game.ko ? c.game.ko + ' (' + c.name + ')' : c.name; }
  function cNameHtml(c) {
    return c.game && c.game.ko ? esc(c.game.ko) + ' <span class="wk-en-sub">(' + esc(c.name) + ')</span>' : esc(c.name);
  }
  // 게임 문자열 → HTML (글자 그대로의 \n은 줄바꿈, <EM> 태그는 강조)
  function gameText(s) {
    return esc(String(s || '').split('\\n').join('\n').replace(/\s+$/, ''))
      .replace(/&lt;EM\d&gt;/g, '<b>').replace(/&lt;\/EM\d&gt;/g, '</b>');
  }
  function bilingual(ko, en, cls) {
    if (!ko && !en) return '';
    return '<div class="wk-game-text ' + (cls || '') + '">' + gameText(ko || en) + '</div>' +
      (ko && en ? '<details class="wk-m-orig"><summary>영어 원본 보기</summary><div class="wk-game-text">' + gameText(en) + '</div></details>' : '');
  }

  // 아이템 이름: 한국어 (영어 원본)
  function itemNameHtml(ko, en) { return ko ? esc(ko) + ' <span class="wk-en-sub">(' + esc(en) + ')</span>' : esc(en); }
  function itemNameText(ko, en) { return ko ? ko + ' (' + en + ')' : en; }

  function contractLinks(ids, label) {
    if (!ids || !ids.length) return '';
    return '<div class="wk-m-sec"><h4>' + label + '</h4><div class="wk-m-chips">' + ids.map(function (id) {
      var c = data.contracts[id];
      return c ? '<button type="button" class="wk-m-chip" data-contract="' + id + '">' + (isTracked(id) ? '★ ' : '') + cNameHtml(c) + '</button>' : '';
    }).join('') + '</div></div>';
  }

  function contractActions(c) {
    var t = isTracked(c.id), d = isDone(c.id), p = progress(c);
    return '<div class="wk-m-actions">' +
      '<button type="button" class="btn btn-sm ' + (t ? 'btn-primary' : 'btn-ghost') + '" data-track="' + c.id + '">' + (t ? '★ 추적 중' : '☆ 추적하기') + '</button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-done="' + c.id + '">' + (d ? '✓ 완료함 (취소)' : '완료 표시') + '</button>' +
      '<div class="wk-m-prog"><div class="wk-prog-bar"><span style="width:' + (d ? 100 : p.pct) + '%"></span></div>' +
      '<span class="mono">' + (d ? '완료' : (p.ready ? '납품 가능!' : p.pct + '%')) + '</span></div></div>';
  }

  function renderContract(id) {
    var c = data.contracts[id];
    var img = c.img ? '<div class="wk-m-hero"><img src="' + esc(c.img.file) + '" alt=""></div>' : '';
    var rep = c.rep === 'None' ? '없음' : (data.rep[c.rep] || c.rep) + ' 이상';
    return img +
      '<div class="wk-m-kicker mono">' + esc(data.cats[c.cat] || '') + ' 계약</div>' +
      '<h3 class="wk-m-title" id="wkModalTitle">' + esc(cKo(c)) + (c.game && c.game.ko ? '<span class="wk-m-title-en">' + esc(c.name) + '</span>' : '') + '</h3>' +
      '<div class="wk-m-meta"><span>필요 평판 <b>' + esc(rep) + '</b></span><span>재료 <b>' + c.orders.length + '종</b></span>' +
        (c.game && c.game.rep ? '<span>완료 시 평판 <b>+' + c.game.rep + '</b></span>' : '') + '</div>' +
      '<div class="wk-m-actions-slot">' + contractActions(c) + '</div>' +
      '<div class="wk-m-sec"><h4>어디서 받나요?</h4><div class="wk-where">' +
        '<div><span class="wk-where-k">의뢰인</span><b>위켈로 (Wikelo)</b> · 바누 상인</div>' +
        '<div><span class="wk-where-k">수락 장소</span><b>위켈로 엠포리엄</b> 정거장의 바자(bazaar) — 다시(허스턴 근처) · 셀로(크루세이더 근처) · 킹가(마이크로텍 근처)</div>' +
        '<div><span class="wk-where-k">납품</span>같은 정거장의 화물 엘리베이터 → 보상은 그 정거장 로컬 인벤토리</div>' +
      '</div></div>' +
      (c.game && (c.game.ko_desc || c.game.en_desc) ? '<div class="wk-m-sec"><h4>계약 내용 <small>게임 속 설명 · SC-KR 한국어 패치</small></h4>' + bilingual(c.game.ko_desc, c.game.en_desc, 'wk-contract-text') + '</div>' : '') +
      '<div class="wk-m-sec"><h4>필요 재료 <small>보유 수량을 적어 두면 진행률이 계산돼요 · 이름을 누르면 획득 방법</small></h4>' + itemList(c.orders, 'orders') + '</div>' +
      '<div class="wk-m-sec"><h4>보상</h4>' + itemList(c.rewards, 'rewards') + '</div>' +
      '<p class="wk-m-note dim">재료를 모아 위켈로 엠포리엄의 화물 엘리베이터에 넣으면, 보상은 그 정거장의 로컬 인벤토리로 들어옵니다.</p>';
  }

  function renderItem(key) {
    var it = data.items[key];
    var h = '';
    if (it.img) h += '<div class="wk-m-hero"><img src="' + esc(it.img.file) + '" alt=""></div>';
    var tags = [];
    if (it.subtitle) tags.push(esc(tr(SUB, it.subtitle)));
    if (it.rarity) tags.push('<span class="wk-rar wk-rar-' + esc(it.rarity) + '">' + esc(tr(RARITY, it.rarity)) + '</span>');
    h += '<div class="wk-m-kicker mono">' + tags.join(' · ') + '</div>';
    h += '<h3 class="wk-m-title" id="wkModalTitle">' + itemNameHtml(it.ko_name, it.title) + '</h3>';
    var lead = it.lead_ko || it.lead;
    if (lead) h += '<p class="wk-m-lead">' + esc(lead) + '</p>';

    // 재료라면 보유 수량 + 추적 중 계약 기준 필요량
    if (it.used_in && it.used_in.length) {
      var total = 0, u = '';
      st.tracked.forEach(function (id) {
        var c = data.contracts[id];
        if (!c || isDone(id)) return;
        c.orders.forEach(function (o) { if (itemKey(o) === key) { total += need(o); u = unit(o); } });
      });
      h += '<div class="wk-m-mine"><div><div class="wk-m-subtitle">내 보유 수량</div>' + stepper(key, null) + '</div>' +
        (total ? '<div class="wk-m-mine-need"><span class="dim">추적 중 계약에 필요</span><b class="mono">' + fmt(total) + u + '</b>' +
          '<span class="dim">남음</span><b class="mono">' + fmt(Math.max(0, total - owned(key))) + u + '</b></div>' : '') + '</div>';
    }

    // 획득 방법
    var acq = '';
    if (it.acq && Object.keys(it.acq).length) {
      acq += '<div class="wk-m-acq">' + Object.keys(it.acq).map(function (k) {
        var s = it.acq[k];
        return '<span class="wk-acq wk-acq-' + esc(s) + '"><span aria-hidden="true">' + (ACQ_ICON[k] || '•') + '</span>' + esc(tr(ACQ, k)) + ' <b>' + esc(STATE[s] || s) + '</b></span>';
      }).join('') + '</div>';
    }
    (it.acq_lists || []).forEach(function (l) {
      var t = { 'Contract Lootables': '계약 전리품', 'Deposit one of the following at Wikelo Emporium': '위켈로 엠포리엄에 아래 중 하나를 납품',
        'Lootables': '전리품', 'Contract rewards': '계약 보상', 'Rewards': '보상', 'Purchase': '구매', 'Sources': '출처' }[l.title] || l.title;
      acq += '<div class="wk-m-sub"><div class="wk-m-subtitle">' + esc(t) + '</div><ul class="wk-m-bullets">' + l.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    });
    (it.acq_cards || []).forEach(function (cd) {
      var ct = cd.title.replace(/^[^A-Za-z]+/, '');
      acq += '<div class="wk-m-sub"><div class="wk-m-subtitle">' + esc(tr(CARD, ct)) + (cd.desc ? ' <span class="dim">· ' + esc(cd.desc.replace(/(\d+) locations/, '$1곳').replace(/(\d+) deposits/, '광맥 $1곳').replace(/(\d+) systems?/, '$1개 성계')) + '</span>' : '') + '</div>' +
        cd.tables.map(table).join('') + '</div>';
    });
    (it.harvest || []).forEach(function (tb) {
      acq += '<div class="wk-m-sub"><div class="wk-m-subtitle">채집 위치</div>' + table(tb) + '</div>';
    });
    if (acq) h += '<div class="wk-m-sec"><h4>획득 방법</h4>' + acq + '</div>';
    else if (it.used_in && it.used_in.length) h += '<div class="wk-m-sec"><h4>획득 방법</h4><p class="dim">위키에 획득 방법 정보가 아직 없어요.</p></div>';

    if (it.info && it.info.length) {
      h += '<div class="wk-m-sec"><h4>정보</h4>' + it.info.map(function (s) {
        return (s.label ? '<div class="wk-m-subtitle">' + esc(tr(INFO, s.label)) + '</div>' : '') + '<dl class="wk-m-dl">' +
          s.items.map(function (kv) { return '<div><dt>' + esc(tr(INFO, kv[0])) + '</dt><dd>' + esc(kv[1]) + '</dd></div>'; }).join('') + '</dl>';
      }).join('') + '</div>';
    }
    if (it.desc) {
      h += '<div class="wk-m-sec"><h4>게임 속 설명</h4><p class="wk-m-desc">' + esc(it.desc_ko || it.desc) + '</p>' +
        (it.desc_ko ? '<details class="wk-m-orig"><summary>영문 원문 보기</summary><p>' + esc(it.desc) + '</p></details>' : '') + '</div>';
    }
    if (it.missions && it.missions.length) {
      h += '<div class="wk-m-sec"><h4>얻을 수 있는 미션 <small>눌러서 미션 내용 보기 · 위키 획득 정보 기준</small></h4><div class="wk-missions">' +
        it.missions.map(function (m) {
          var title = m.ko ? esc(m.ko) + (m.en ? ' <span class="wk-en-sub">(' + esc(m.en) + ')</span>' : '') : esc(m.en);
          return '<details class="wk-mission"><summary><span class="wk-mission-title">' + title + '</span>' +
            '<span class="wk-mission-meta">' + esc(m.giver_ko) + (m.giver_en ? ' (' + esc(m.giver_en) + ')' : '') + ' · ' + esc(m.where) + (m.rep ? ' · 평판 +' + m.rep : '') + '</span></summary>' +
            '<div class="wk-mission-body">' + (bilingual(m.ko_desc, m.en_desc) || '<p class="dim">미션 설명이 없어요.</p>') + '</div></details>';
        }).join('') + '</div></div>';
    }
    h += contractLinks(it.used_in, '이 재료가 필요한 계약');
    h += contractLinks(it.reward_of, '이 아이템을 주는 계약');
    var credit = it.img ? '이미지: ' + esc(it.img.credit) + ' (' + esc(it.img.license) + ') · ' : '';
    h += '<p class="wk-m-source dim">' + credit + '내용: Star Citizen Wiki (CC BY-SA 4.0)</p>';
    return h;
  }

  function show(view, push) {
    loadData().then(function () {
      if (push !== false) stack.push(view);
      body.innerHTML = view.type === 'contract' ? renderContract(view.id) : renderItem(view.id);
      body.scrollTop = 0;
      backBtn.hidden = stack.length < 2;
      if (!modal.open) {
        if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
        document.documentElement.classList.add('wk-modal-open');
      }
    }).catch(function () { alert('상세 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); });
  }
  function closeModal() {
    stack = [];
    if (modal.close) modal.close(); else modal.removeAttribute('open');
    document.documentElement.classList.remove('wk-modal-open');
  }
  // 모달 안의 추적/완료 버튼과 진행률만 다시 그림 (스크롤 유지)
  function refreshModal() {
    var view = stack[stack.length - 1];
    if (!modal.open || !view || !data) return;
    if (view.type === 'contract') {
      var slot = body.querySelector('.wk-m-actions-slot');
      if (slot) slot.innerHTML = contractActions(data.contracts[view.id]);
    }
  }

  document.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-track]');
    if (tb) { e.preventDefault(); toggle(st.tracked, tb.dataset.track); return; }
    var db = e.target.closest('[data-done]');
    if (db) { e.preventDefault(); toggle(st.done, db.dataset.done); return; }
    if (e.target.closest('.wk-step')) return;
    var i = e.target.closest('[data-item]');
    if (i) { e.preventDefault(); show({ type: 'item', id: i.getAttribute('data-item') }); return; }
    var c = e.target.closest('[data-contract]');
    if (c) { e.preventDefault(); show({ type: 'contract', id: c.getAttribute('data-contract') }); }
  });
  backBtn.addEventListener('click', function () {
    stack.pop();
    var prev = stack[stack.length - 1];
    if (prev) show(prev, false);
  });
  document.getElementById('wkModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.addEventListener('close', function () { stack = []; document.documentElement.classList.remove('wk-modal-open'); });

  /* ========== 내 계약 플래너 ========== */
  var planBody = document.getElementById('planBody');

  function remaining() {
    // 추적 중이고 완료하지 않은 계약의 재료 합계
    var agg = {}, order = [];
    st.tracked.forEach(function (id) {
      var c = data.contracts[id];
      if (!c || isDone(id)) return;
      c.orders.forEach(function (o) {
        var k = itemKey(o);
        if (!agg[k]) { agg[k] = { key: k, name: o.name, ko: o.ko, page: o.page, need: 0, unit: unit(o), used: [] }; order.push(k); }
        agg[k].need += need(o);
        agg[k].used.push(c.name);
      });
    });
    return order.map(function (k) {
      var a = agg[k];
      a.have = owned(k);
      a.left = Math.max(0, a.need - a.have);
      return a;
    }).sort(function (x, y) { return (y.left > 0) - (x.left > 0) || y.left - x.left; });
  }

  function renderPlanner() {
    if (!data) return;
    var tracked = st.tracked.filter(function (id) { return data.contracts[id]; });
    if (!tracked.length) {
      planBody.innerHTML = '<div class="wk-plan-empty">아직 추적 중인 계약이 없어요. 아래 계약 카드의 <b>☆</b>를 눌러 추가해 보세요.' +
        (Object.keys(st.owned).length ? '<br><span class="dim">기록해 둔 보유 재료 ' + Object.keys(st.owned).length + '종은 그대로 있어요.</span>' : '') + '</div>';
      return;
    }
    var rows = remaining();
    var leftCount = rows.filter(function (r) { return r.left > 0; }).length;
    var readyCount = tracked.filter(function (id) { return !isDone(id) && progress(data.contracts[id]).ready; }).length;
    var doneCount = tracked.filter(isDone).length;

    var chips = tracked.map(function (id) {
      var c = data.contracts[id], p = progress(c), d = isDone(id);
      return '<div class="wk-plan-chip' + (d ? ' is-done' : (p.ready ? ' is-ready' : '')) + '">' +
        '<button type="button" class="wk-plan-chip-name" data-contract="' + id + '" title="' + esc(cName(c)) + '">' + esc(cKo(c)) + '</button>' +
        '<div class="wk-prog-bar"><span style="width:' + (d ? 100 : p.pct) + '%"></span></div>' +
        '<span class="wk-plan-chip-pct mono">' + (d ? '완료' : (p.ready ? '납품 가능' : p.pct + '%')) + '</span>' +
        '<button type="button" class="wk-plan-chip-x" data-track="' + id + '" aria-label="추적 해제">×</button></div>';
    }).join('');

    var table = rows.length ? '<div class="wk-plan-table"><table><thead><tr><th>재료</th><th>필요</th><th>보유</th><th>남음</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var info = r.page && data.items[r.page];
        var thumb = info && info.img ? '<img src="' + esc(info.img.file) + '" alt="" loading="lazy">' : '<span>' + esc(r.name[0]) + '</span>';
        var name = info ? '<button type="button" class="wk-plan-item" data-item="' + esc(r.page) + '" title="획득 방법 보기">' + itemNameHtml(r.ko, r.name) + '</button>' : itemNameHtml(r.ko, r.name);
        return '<tr class="' + (r.left ? '' : 'full') + '" data-need="' + r.need + '">' +
          '<td><div class="wk-plan-name"><span class="wk-m-thumb">' + thumb + '</span><div>' + name + '<div class="wk-plan-used dim">' + esc(r.used.join(' · ')) + '</div></div></div></td>' +
          '<td class="mono">' + fmt(r.need) + esc(r.unit) + '</td>' +
          '<td>' + stepper(r.key, null) + '</td>' +
          '<td class="mono wk-plan-left">' + (r.left ? fmt(r.left) + esc(r.unit) : '✓') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="wk-plan-empty">추적 중인 계약을 모두 완료했어요! 🎉</div>';

    planBody.innerHTML =
      '<div class="wk-plan-stats">' +
        '<div><span class="dim">추적 중</span><b>' + tracked.length + '</b></div>' +
        '<div><span class="dim">납품 가능</span><b class="ok">' + readyCount + '</b></div>' +
        '<div><span class="dim">완료</span><b>' + doneCount + '</b></div>' +
        '<div><span class="dim">더 모을 재료</span><b>' + leftCount + '종</b></div>' +
      '</div>' +
      '<div class="wk-plan-chips">' + chips + '</div>' + table;
  }

  function copyText() {
    var rows = remaining().filter(function (r) { return r.left > 0; });
    var tracked = st.tracked.filter(function (id) { return data.contracts[id] && !isDone(id); });
    var lines = ['[위켈로 계약 플래너 — SC-KR]', '추적 중: ' + tracked.map(function (id) { return cName(data.contracts[id]); }).join(', '), ''];
    if (rows.length) {
      lines.push('더 모을 재료:');
      rows.forEach(function (r) { lines.push('- ' + itemNameText(r.ko, r.name) + ': ' + fmt(r.left) + r.unit + ' (보유 ' + fmt(r.have) + ' / 필요 ' + fmt(r.need) + r.unit + ')'); });
    } else {
      lines.push('필요한 재료를 모두 모았어요!');
    }
    lines.push('', 'https://doku-web.github.io/sc-kr/wikelo/');
    return lines.join('\n');
  }
  function toast(msg) {
    var t = document.querySelector('.wk-toast');
    if (!t) { t = document.createElement('div'); t.className = 'wk-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  document.getElementById('plCopy').addEventListener('click', function () {
    loadData().then(function () {
      var text = copyText();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
        toast('남은 재료 목록을 복사했어요. 디스코드나 메모에 붙여넣으세요.');
      }).catch(function () { prompt('아래 내용을 복사하세요', text); });
    });
  });
  document.getElementById('plExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ app: 'sckr-wikelo', v: 1, savedAt: new Date().toISOString(), data: st }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sckr-wikelo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('백업 파일을 저장했어요. 다른 PC에서 불러오기로 옮길 수 있어요.');
  });
  document.getElementById('plImport').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    f.text().then(function (txt) {
      var j = JSON.parse(txt), d = j && (j.data || j);
      if (!d || typeof d.owned !== 'object') throw new Error('bad');
      if (!confirm('현재 기록을 백업 파일 내용으로 바꿀까요?')) return;
      st.owned = d.owned || {}; st.tracked = d.tracked || []; st.done = d.done || [];
      save(); refresh();
      toast('백업을 불러왔어요.');
    }).catch(function () { alert('백업 파일을 읽지 못했어요.'); });
    this.value = '';
  });
  document.getElementById('plReset').addEventListener('click', function () {
    if (!confirm('보유 수량, 추적, 완료 기록을 모두 지울까요? (되돌릴 수 없어요)')) return;
    st = { owned: {}, tracked: [], done: [] };
    save(); refresh();
  });

  /* ========== 다시 그리기 ========== */
  function refresh() {
    if (!data) return;
    decorateCards();
    renderPlanner();
    refreshModal();
    apply();
  }
  // 다른 탭에서 바꿔도 맞춰 줌
  window.addEventListener('storage', function (e) {
    if (e.key !== STORE_KEY) return;
    try { var d = JSON.parse(e.newValue || '{}'); st.owned = d.owned || {}; st.tracked = d.tracked || []; st.done = d.done || []; } catch (_) {}
    refresh();
  });
  loadData().then(refresh);

  /* ========== 헤더 · 모바일 메뉴 ========== */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-toggle');
  function setOpen(open) {
    header.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }
  menuBtn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
