/* 위켈로 페이지 — 분류 탭, 검색, 상세 보기(계약 · 아이템 · 획득 방법), 모바일 메뉴 */
(function () {
  'use strict';

  /* ========== 분류 · 검색 ========== */
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
    groups.forEach(function (g) { g.classList.toggle('is-hidden', !g.querySelector('.wk-card:not(.is-hidden)')); });
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
    'Vehicle': '차량', 'Overview': '개요', 'Acquisition': '획득 방식', 'Mining': '채굴', 'Harvesting': '채집', 'Crafting': '제작', 'Salvage': '회수', 'Hull': '선체', 'Speed': '속도', 'Single': '단발', 'Burst': '점사', 'Rapid': '연사', 'Charge': '충전' };
  var SUB = { 'Mineral': '광물', 'Misc item': '기타 아이템', 'Personal weapon': '개인 화기', 'Drink': '음료', 'Food': '음식',
    'Commodity': '원자재', 'Metal': '금속', 'Ore': '광석', 'Gem': '보석', 'Currency': '화폐', 'Helmet': '헬멧', 'Undersuit': '언더슈트',
    'Backpack': '배낭', 'Arms': '팔 방어구', 'Legs': '다리 방어구', 'Core': '코어 방어구', 'Magazine': '탄창', 'Vehicle weapon': '탑재 무기',
    'Clothing': '의류', 'Hat': '모자', 'Arm armor': '팔 방어구', 'Torso armor': '몸통 방어구', 'Leg armor': '다리 방어구', 'Headgear': '모자', 'Collection': '컬렉션', 'Device': '장치', 'Unrefined ores': '원광', 'Cargo': '화물', 'Gun': '총기', 'Shirt': '셔츠', 'Jacket': '재킷', 'Organic': '유기물', 'Container': '용기', 'Medal': '메달' };
  var RARITY = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅', legendary: '전설' };
  var CELL = { 'Moon': '위성', 'Planet': '행성', 'Asteroid': '소행성', 'Asteroid field': '소행성대', 'Ring': '고리', 'Lagrange point': '라그랑주 점',
    'Station': '정거장', 'Outpost': '전초기지', 'Cave': '동굴', 'Yes': '예', 'No': '아니오' };
  function tr(map, s) { return map[s] || s; }

  /* ========== 상세 보기 ========== */
  var modal = document.getElementById('wkModal');
  var body = document.getElementById('wkModalBody');
  var backBtn = document.getElementById('wkModalBack');
  var data = null, loading = null, stack = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function loadData() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch('data.json?v=' + (document.documentElement.dataset.ver || '')).then(function (r) { return r.json(); }).then(function (d) { data = d; return d; });
    return loading;
  }

  function itemList(list, kind) {
    return '<ul class="wk-m-items">' + list.map(function (it) {
      var info = it.page && data.items[it.page];
      var thumb = info && info.img ? '<img src="' + esc(info.img.file) + '" alt="" loading="lazy">' : '<span class="wk-m-noimg">' + esc((it.name || '?')[0]) + '</span>';
      var hint = kind === 'orders' ? '<span class="wk-m-go">획득 방법 →</span>' : '<span class="wk-m-go">자세히 →</span>';
      var inner = '<span class="wk-m-thumb">' + thumb + '</span><span class="wk-m-qty mono">' + esc(it.qty) + '</span><span class="wk-m-name">' + esc(it.name) + '</span>' + (info ? hint : '');
      return '<li>' + (info ? '<button type="button" class="wk-m-item" data-item="' + esc(it.page) + '">' + inner + '</button>' : '<div class="wk-m-item">' + inner + '</div>') + '</li>';
    }).join('') + '</ul>';
  }

  function table(tb) {
    var head = tb.head && tb.head.length ? '<thead><tr>' + tb.head.map(function (h) { return '<th>' + esc(tr(HEAD, h)) + '</th>'; }).join('') + '</tr></thead>' : '';
    var rows = tb.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(tr(CELL, c)) + '</td>'; }).join('') + '</tr>'; }).join('');
    return (tb.caption ? '<div class="wk-m-cap">' + esc(tb.caption.replace(/ System$/, ' 성계')) + '</div>' : '') +
      '<div class="wk-m-table"><table>' + head + '<tbody>' + rows + '</tbody></table></div>' +
      (tb.more ? '<div class="wk-m-more dim">외 ' + tb.more + '곳 더</div>' : '');
  }

  function contractLinks(ids, label) {
    if (!ids || !ids.length) return '';
    return '<div class="wk-m-sec"><h4>' + label + '</h4><div class="wk-m-chips">' + ids.map(function (id) {
      var c = data.contracts[id];
      return c ? '<button type="button" class="wk-m-chip" data-contract="' + id + '">' + esc(c.name) + '</button>' : '';
    }).join('') + '</div></div>';
  }

  function renderContract(id) {
    var c = data.contracts[id];
    var img = c.img ? '<div class="wk-m-hero"><img src="' + esc(c.img.file) + '" alt=""></div>' : '';
    var rep = c.rep === 'None' ? '없음' : (data.rep[c.rep] || c.rep) + ' 이상';
    return img +
      '<div class="wk-m-kicker mono">' + esc(data.cats[c.cat] || '') + ' 계약</div>' +
      '<h3 class="wk-m-title" id="wkModalTitle">' + esc(c.name) + '</h3>' +
      '<div class="wk-m-meta"><span>필요 평판 <b>' + esc(rep) + '</b></span><span>재료 <b>' + c.orders.length + '종</b></span></div>' +
      '<div class="wk-m-sec"><h4>필요 재료 <small>눌러서 어디서 구하는지 보기</small></h4>' + itemList(c.orders, 'orders') + '</div>' +
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
    h += '<h3 class="wk-m-title" id="wkModalTitle">' + esc(it.title) + '</h3>';
    var lead = it.lead_ko || it.lead;
    if (lead) h += '<p class="wk-m-lead">' + esc(lead) + '</p>';

    // 획득 방법
    var acq = '';
    if (it.acq && Object.keys(it.acq).length) {
      acq += '<div class="wk-m-acq">' + Object.keys(it.acq).map(function (k) {
        var st = it.acq[k];
        return '<span class="wk-acq wk-acq-' + esc(st) + '"><span aria-hidden="true">' + (ACQ_ICON[k] || '•') + '</span>' + esc(tr(ACQ, k)) + ' <b>' + esc(STATE[st] || st) + '</b></span>';
      }).join('') + '</div>';
    }
    (it.acq_lists || []).forEach(function (l) {
      var t = l.title === 'Contract Lootables' ? '계약 전리품' : l.title;
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

    // 정보
    if (it.info && it.info.length) {
      h += '<div class="wk-m-sec"><h4>정보</h4>' + it.info.map(function (s) {
        return (s.label ? '<div class="wk-m-subtitle">' + esc(tr(INFO, s.label)) + '</div>' : '') + '<dl class="wk-m-dl">' +
          s.items.map(function (kv) { return '<div><dt>' + esc(tr(INFO, kv[0])) + '</dt><dd>' + esc(kv[1]) + '</dd></div>'; }).join('') + '</dl>';
      }).join('') + '</div>';
    }
    if (it.desc) h += '<div class="wk-m-sec"><h4>게임 속 설명 <small>영문 원문</small></h4><p class="wk-m-desc">' + esc(it.desc) + '</p></div>';

    h += contractLinks(it.used_in, '이 재료가 필요한 계약');
    h += contractLinks(it.reward_of, '이 아이템을 주는 계약');
    var credit = it.img ? '이미지: ' + esc(it.img.credit) + ' (' + esc(it.img.license) + ') · ' : '';
    h += '<p class="wk-m-source dim">' + credit + '내용: Star Citizen Wiki (CC BY-SA 4.0)</p>';
    return h;
  }

  function show(view, push) {
    loadData().then(function () {
      if (push !== false) stack.push(view);
      var html = view.type === 'contract' ? renderContract(view.id) : renderItem(view.id);
      body.innerHTML = html;
      body.scrollTop = 0;
      backBtn.hidden = stack.length < 2;
      if (!modal.open) {
        if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
        document.documentElement.classList.add('wk-modal-open');
      }
    }).catch(function () {
      alert('상세 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    });
  }
  function closeModal() {
    stack = [];
    if (modal.close) modal.close(); else modal.removeAttribute('open');
    document.documentElement.classList.remove('wk-modal-open');
  }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-contract]');
    var i = e.target.closest('[data-item]');
    if (i) { e.preventDefault(); show({ type: 'item', id: i.getAttribute('data-item') }); }
    else if (c) { e.preventDefault(); show({ type: 'contract', id: c.getAttribute('data-contract') }); }
  });
  backBtn.addEventListener('click', function () {
    stack.pop();
    var prev = stack[stack.length - 1];
    if (prev) show(prev, false);
  });
  document.getElementById('wkModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });   // 바깥 클릭
  modal.addEventListener('close', function () { stack = []; document.documentElement.classList.remove('wk-modal-open'); });

  // 카드에 마우스를 올리면 상세 데이터 미리 불러오기
  document.querySelector('.wk-grid') && document.addEventListener('pointerover', function once(e) {
    if (e.target.closest('.wk-card')) { loadData(); document.removeEventListener('pointerover', once); }
  });

  /* ========== 헤더 · 모바일 메뉴 ========== */
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
