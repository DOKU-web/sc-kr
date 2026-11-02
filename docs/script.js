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
      'a11y.skip': '본문으로 건너뛰기',
      'nav.home': '홈', 'nav.features': '패치 소개', 'nav.how': '설치 가이드', 'nav.updates': '업데이트', 'nav.download': '다운로드', 'nav.community': '커뮤니티',
      'nav.crew': '번역팀', 'nav.partners': '파트너', 'nav.reviews': '후기', 'nav.wikelo': '위켈로', 'nav.blueprints': '청사진', 'nav.discord': '디스코드',
      'cta.download': '런처 다운로드', 'cta.discord': '디스코드 참여',
      'hero.title': '우주를 한국어로 경험하다.',
      'hero.lead': '스타시티즌의 세계를 더욱 편리하고 몰입감 있게 경험할 수 있도록 돕는 한국어 패치 및 통합 런처.',
      'hero.download': 'SC-KR 다운로드', 'hero.explore': '주요 기능 살펴보기',
      'dash.label': '최신 버전 정보',
      'meta.launcher': '런처', 'meta.patch': '언어팩', 'meta.size': '파일 크기', 'meta.os': '지원',
      'meta.single': 'exe 단일 파일', 'meta.free': '무료 · 비공식',
      'status.live': '제공 중', 'status.beta': '베타', 'status.soon': '개발 예정', 'status.since': '{n}부터',
      'features.lead': '번역 적용부터 게임 채팅, 커뮤니티까지. 카드를 누르면 자세한 설명을 볼 수 있어요.',
      'features.open': '자세히 보기',
      'modal.close': '닫기', 'modal.guide': '설치 가이드 보기',
      'launcher.title': '켜면 상태부터 보여주는 런처',
      'launcher.lead': '게임 경로를 한 번 지정하면, 런처가 언어팩 상태를 확인하고 버튼 한 번으로 최신 번역을 적용합니다.',
      'launcher.p1.t': '상태 카드', 'launcher.p1.b': '게임 빌드, 언어팩, 파일 상태, 런처 버전을 홈 화면에서 한눈에 확인합니다.',
      'launcher.p2.t': '안전한 업데이트', 'launcher.p2.b': '런처·언어팩 파일은 SHA-256까지 확인한 뒤 적용하고, 실패하면 이전 런처로 돌아갑니다.',
      'launcher.p3.t': '적용 전 미리보기 · 복구', 'launcher.p3.b': '바뀔 내용을 미리 보고, 적용 직전 파일을 보관해 되돌릴 수 있습니다.',
      'launcher.label': 'SC-KR 런처 화면 구성 일러스트',
      'launcher.caption': '화면 구성을 설명하기 위한 일러스트로, 실제 런처 화면과 다를 수 있습니다.',
      'launcher.home': '홈', 'launcher.s.build': '게임 빌드', 'launcher.s.pack': '언어팩', 'launcher.s.file': '파일 상태', 'launcher.s.ok': '정상', 'launcher.s.ver': '런처',
      'launcher.sub': '스타시티즌 한국어 패치', 'launcher.status': '언어팩 상태', 'launcher.applied': '적용 완료',
      'launcher.path': '게임 경로', 'launcher.chat': '한국어 채팅', 'launcher.chatDesc': '한영키로 게임 채팅에 한글 입력',
      'launcher.apply': '자동 다운로드 및 적용',
      'updates.title': '업데이트 내역',
      'updates.lead': '런처와 한국어 패치의 최근 배포 기록입니다. GitHub 릴리스에서 바로 가져옵니다.',
      'updates.tabsLabel': '업데이트 종류', 'updates.all': '전체', 'updates.launcher': '런처', 'updates.pack': '언어팩',
      'updates.kind.launcher': '런처', 'updates.kind.pack': '언어팩', 'updates.kind.other': '릴리스',
      'updates.latest': '최신', 'updates.read': '패치노트 전체 보기', 'updates.allLink': '전체 릴리스 보기',
      'updates.notice': '공지와 개발 소식은 디스코드에 가장 먼저 올라옵니다.',
      'updates.error': '업데이트 내역을 불러오지 못했어요. GitHub 릴리스 페이지에서 확인해 주세요.',
      'updates.empty': '표시할 업데이트가 없어요.',
      'download.title': 'SC-KR 런처 받기',
      'download.lead': '설치 없이 실행하는 exe 파일 하나입니다. 런처가 언어팩을 받아 게임 폴더에 적용합니다.',
      'download.latest': '최신 런처', 'download.guide': '설치 가이드', 'download.notesTitle': '받기 전에 확인해 주세요',
      'download.n1': 'SC-KR은 CIG·RSI와 관련 없는 비공식 커뮤니티 프로젝트이며 무료입니다.',
      'download.n2': '런처가 실행될 때마다 런처와 언어팩의 새 버전을 확인합니다.',
      'download.n3': '새 런처로 바꿀 때는 받은 exe를 기존 파일과 바꾸면 되고, 설정은 그대로 유지됩니다.',
      'download.n4': '게임이 업데이트되면 일부 문장이 영어로 보일 수 있어요. 번역팀이 다음 언어팩에서 채웁니다.',
      'download.history': '이전 버전 · 전체 변경 내역',
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
      'reviews.title': '사용 후기',
      'reviews.lead': '디스코드에서 SC-KR을 써본 분들이 남긴 후기입니다.',
      'reviews.write': '디스코드에서 후기 남기기', 'reviews.more': '후기 더 보기',
      'reviews.how': '디스코드 <code>⭐・사용-후기</code> 채널에서 별점 버튼을 누르세요',
      'reviews.count': '후기 {n}개', 'reviews.rating': '5점 만점에 {n}점',
      'reviews.loading': '후기를 불러오는 중…',
      'reviews.emptyTitle': '아직 후기가 없어요',
      'reviews.emptyBody': '디스코드 후기 채널의 별점 버튼으로 첫 후기를 남겨주세요.',
      'reviews.error': '후기를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.',
      'discord.title': '디스코드에서 함께 플레이해요',
      'discord.lead': '패치노트와 언어팩 배포 소식을 가장 먼저 받고, 같이 비행할 파티도 찾아보세요. 번역 오류나 버그 제보도 디스코드 티켓으로 받고 있어요.',
      'discord.join': '디스코드 참여하기',
      'footer.admin': '관리자 대시보드', 'footer.edit': '콘텐츠 편집', 'footer.photos': '배경 사진',
      'footer.tag': '스타시티즌 한국어 패치 · 통합 런처', 'footer.dev': '개발 · 저작권', 'footer.site': '사이트', 'footer.tools': '도구',
      'footer.usage': '런처와 언어팩은 무료로 배포되며, 게임 파일에 적용하는 것은 이용자 본인의 선택입니다.',
      'footer.disclaimer': 'SC-KR은 비공식 커뮤니티 팬 프로젝트로 Cloud Imperium Games 및 Roberts Space Industries와 관련이 없습니다. Star Citizen®은 Cloud Imperium Rights LLC의 등록 상표입니다.',
      'menu.open': '메뉴 열기', 'menu.close': '메뉴 닫기',
    },
    en: {
      'nav.label': 'Main menu',
      'a11y.skip': 'Skip to content',
      'nav.home': 'Home', 'nav.features': 'Features', 'nav.how': 'Setup guide', 'nav.updates': 'Updates', 'nav.download': 'Download', 'nav.community': 'Community',
      'nav.crew': 'Crew', 'nav.partners': 'Partners', 'nav.reviews': 'Reviews', 'nav.wikelo': 'Wikelo', 'nav.blueprints': 'Blueprints', 'nav.discord': 'Discord',
      'cta.download': 'Download launcher', 'cta.discord': 'Join Discord',
      'hero.title': 'Experience the verse in Korean.',
      'hero.lead': 'A Korean translation patch and all-in-one launcher that makes the world of Star Citizen easier and more immersive to explore.',
      'hero.download': 'Download SC-KR', 'hero.explore': 'Explore features',
      'dash.label': 'Latest versions',
      'meta.launcher': 'Launcher', 'meta.patch': 'Lang pack', 'meta.size': 'Size', 'meta.os': 'Platform',
      'meta.single': 'Single exe file', 'meta.free': 'Free · Unofficial',
      'status.live': 'Available', 'status.beta': 'Beta', 'status.soon': 'Planned', 'status.since': 'Since {n}',
      'features.lead': 'From the translation to game chat and community. Tap a card for the details.',
      'features.open': 'Details',
      'modal.close': 'Close', 'modal.guide': 'See setup guide',
      'launcher.title': 'A launcher that starts with status',
      'launcher.lead': 'Point it at your game folder once. The launcher checks the language pack and applies the latest translation in one click.',
      'launcher.p1.t': 'Status card', 'launcher.p1.b': 'Game build, language pack, file state and launcher version at a glance on the home screen.',
      'launcher.p2.t': 'Safe updates', 'launcher.p2.b': 'Launcher and language pack files are verified by SHA-256 before applying, and a failed update rolls back to the previous launcher.',
      'launcher.p3.t': 'Preview & restore', 'launcher.p3.b': 'See what will change before applying, and roll back to the files kept from right before.',
      'launcher.label': 'Illustration of the SC-KR launcher layout',
      'launcher.caption': 'Illustration of the layout — the real launcher screen may look different.',
      'launcher.home': 'Home', 'launcher.s.build': 'Game build', 'launcher.s.pack': 'Lang pack', 'launcher.s.file': 'Files', 'launcher.s.ok': 'OK', 'launcher.s.ver': 'Launcher',
      'launcher.sub': 'Star Citizen Korean Patch', 'launcher.status': 'Language pack', 'launcher.applied': 'Applied',
      'launcher.path': 'Game path', 'launcher.chat': 'Korean chat', 'launcher.chatDesc': 'Type Hangul in game chat',
      'launcher.apply': 'Download & apply',
      'updates.title': 'Updates',
      'updates.lead': 'Recent launcher and Korean patch releases, pulled straight from GitHub Releases.',
      'updates.tabsLabel': 'Update type', 'updates.all': 'All', 'updates.launcher': 'Launcher', 'updates.pack': 'Lang pack',
      'updates.kind.launcher': 'Launcher', 'updates.kind.pack': 'Lang pack', 'updates.kind.other': 'Release',
      'updates.latest': 'Latest', 'updates.read': 'Full patch notes', 'updates.allLink': 'All releases',
      'updates.notice': 'Announcements and dev news land on Discord first.',
      'updates.error': "Couldn't load updates. Please check the GitHub Releases page.",
      'updates.empty': 'No updates to show.',
      'download.title': 'Get the SC-KR launcher',
      'download.lead': 'A single exe, no installer. The launcher fetches the language pack and applies it to your game folder.',
      'download.latest': 'Latest launcher', 'download.guide': 'Setup guide', 'download.notesTitle': 'Before you download',
      'download.n1': 'SC-KR is a free, unofficial community project, not affiliated with CIG or RSI.',
      'download.n2': 'Each time it starts, the launcher checks for new launcher and language pack versions.',
      'download.n3': 'To update, replace your old exe with the new one — your settings stay as they are.',
      'download.n4': 'After a game update some lines may show in English until the crew fills them in the next pack.',
      'download.history': 'Older versions · full changelog',
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
      'reviews.title': 'Reviews',
      'reviews.lead': 'What players who tried SC-KR said on our Discord.',
      'reviews.write': 'Write a review on Discord', 'reviews.more': 'Show more reviews',
      'reviews.how': 'Press a star button in the reviews channel (<code>⭐・사용-후기</code>)',
      'reviews.count': '{n} reviews', 'reviews.rating': 'Rated {n} out of 5',
      'reviews.loading': 'Loading reviews…',
      'reviews.emptyTitle': 'No reviews yet',
      'reviews.emptyBody': 'Be the first — press a star button in the reviews channel on our Discord.',
      'reviews.error': "Couldn't load reviews. Please check back later.",
      'discord.title': 'Play together on Discord',
      'discord.lead': 'Get patch notes and language pack releases first, and find a crew to fly with. Translation errors and bug reports go through Discord tickets.',
      'discord.join': 'Join the Discord',
      'footer.admin': 'Admin dashboard', 'footer.edit': 'Edit content', 'footer.photos': 'Photos',
      'footer.tag': 'Star Citizen Korean patch · all-in-one launcher', 'footer.dev': 'Developed & © by', 'footer.site': 'Site', 'footer.tools': 'Tools',
      'footer.usage': 'The launcher and language pack are free. Applying them to your game files is your own choice.',
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
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  var ICON_LABELS = {
    download: '다운로드', chat: '채팅', check: '체크', table: '표', refresh: '새로고침', star: '별',
    cursor: '클릭', box: '패키지', globe: '지구', shield: '방패', bolt: '번개', rocket: '로켓', users: '사람들', mic: '마이크', gear: '설정',
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
  /* 기능 상태: 비어 있으면 '제공 중'. 'beta' / 'soon'(개발 예정)만 따로 표시 */
  var STATUS = { live: 'status.live', beta: 'status.beta', soon: 'status.soon' };
  function statusOf(f) { return STATUS[f.status] ? f.status : 'live'; }
  function statusBadge(f, l) {
    var st = statusOf(f);
    return '<span class="badge badge-' + st + '">' + esc(tl(STATUS[st], l)) + '</span>';
  }
  function featureText(f, l) {
    return {
      title: l === 'en' && f.titleEn ? f.titleEn : f.title,
      desc: l === 'en' && f.descEn ? f.descEn : f.desc,
    };
  }

  /* Bento 크기: 첫 카드는 크게(2×2), 다음 4개는 기본, 그 뒤 마지막 줄은 4칸이 꽉 차도록 넓힘.
   * 개수가 바뀌어도(콘텐츠 편집으로 추가/삭제) 빈칸이 생기지 않게 계산합니다. */
  function bentoSizes(n) {
    var sizes = [];
    for (var i = 0; i < n; i++) sizes.push('');
    if (n < 3) return sizes.map(function () { return n === 1 ? 'full' : 'wide'; });
    sizes[0] = 'xl';
    var rest = n - 5;               // 앞의 2줄(큰 카드 + 4개) 다음에 남는 개수
    if (n < 5) {                    // 3~4개: 큰 카드 오른쪽 2줄을 채움
      sizes[1] = 'wide';
      if (n === 3) sizes[2] = 'wide';
      return sizes;
    }
    var tail = rest % 4, start = n - tail;
    if (tail === 1) sizes[start] = 'full';
    else if (tail === 2) { sizes[start] = 'wide'; sizes[start + 1] = 'wide'; }
    else if (tail === 3) sizes[start] = 'wide';
    return sizes;
  }

  function featuresHtml(o) {
    var sizes = bentoSizes(data.features.length);
    return data.features.map(function (f, i) {
      var tx = featureText(f, o.lang);
      var since = f.since ? '<span class="since mono">' + esc(tl('status.since', o.lang).replace('{n}', f.since)) + '</span>' : '';
      var visual = sizes[i] === 'xl' ? '<div class="feature-visual" aria-hidden="true"><span class="orbit o1"></span><span class="orbit o2"></span><span class="planet"></span><span class="file mono">global.ini</span><span class="file mono f2">user.cfg</span></div>' : '';
      return '<article class="feature glass glass-card' + (sizes[i] ? ' is-' + sizes[i] : '') + ' st-' + statusOf(f) + '">' + delBtn(o, 'features', i, f.title) +
        visual +
        '<div class="feature-top"><div class="icon-box">' + iconHtml(f.icon) + '</div>' + statusBadge(f, o.lang) + '</div>' +
        '<h3><button type="button" class="feature-open" data-feature="' + i + '">' + esc(tx.title) + '</button></h3>' +
        '<p>' + esc(tx.desc) + '</p>' +
        '<div class="feature-foot">' + since + '<span class="more" aria-hidden="true">' + esc(tl('features.open', o.lang)) + ' ' + ARROW + '</span></div></article>';
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
      return '<article class="partner glass glass-card">' + delBtn(o, 'partners', i, p.name) +
        '<div class="avatar">' + avatar + '</div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<div class="platform">' + esc(p.platform) + '</div>' + link + '</article>';
    }).join('');
  }

  /* ========== 사용 후기 ========== */
  var REVIEW_PAGE = 6;
  var reviewState = { data: null, error: false, expanded: false };

  function starsHtml(rating) {
    var full = Math.round(rating);
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= full ? 'on' : 'off') + '">★</span>';
    return '<span class="stars" aria-hidden="true">' + s + '</span>';
  }
  function fmt(key, l, n) { return tl(key, l).replace('{n}', n); }

  function reviewsHtml(o) {
    var d = reviewState.data;
    if (!d) {
      var msg = reviewState.error ? 'reviews.error' : 'reviews.loading';
      return '<div class="partners-empty"><span>' + esc(tl(msg, o.lang)) + '</span></div>';
    }
    if (!d.reviews.length) {
      return '<div class="partners-empty"><strong>' + esc(tl('reviews.emptyTitle', o.lang)) + '</strong><span>' + esc(tl('reviews.emptyBody', o.lang)) + '</span></div>';
    }
    var list = reviewState.expanded ? d.reviews : d.reviews.slice(0, REVIEW_PAGE);
    return list.map(function (r) {
      var rating = Math.max(1, Math.min(5, Math.round(Number(r.rating)) || 1));
      return '<article class="review glass">' +
        '<div class="review-top">' + starsHtml(rating) + '<span class="sr-only">' + esc(fmt('reviews.rating', o.lang, rating)) + '</span>' +
        '<time class="mono dim" datetime="' + esc(r.date) + '">' + esc(r.date) + '</time></div>' +
        '<p>' + esc(r.text) + '</p>' +
        '<div class="review-name">' + esc(r.name) + '</div></article>';
    }).join('');
  }

  function renderReviewExtras() {
    var d = reviewState.data;
    var summary = document.getElementById('reviewSummary');
    var more = document.getElementById('reviewMore');
    summary.hidden = !(d && d.count);
    if (d && d.count) {
      var avg = (Number(d.average) || 0).toFixed(1);
      summary.innerHTML = '<div class="review-avg">' + avg + '</div><div>' + starsHtml(Number(avg)) +
        '<span class="sr-only">' + esc(fmt('reviews.rating', lang, avg)) + '</span>' +
        '<div class="dim small-13">' + esc(fmt('reviews.count', lang, d.count)) + '</div></div>';
    }
    more.hidden = !(d && !reviewState.expanded && d.reviews.length > REVIEW_PAGE);
  }

  // 디스코드 봇(cogs/reviews.py)이 reviews 브랜치에 올리는 파일
  function loadReviews() {
    fetch('https://raw.githubusercontent.com/' + GH.owner + '/' + GH.repo + '/reviews/reviews.json', { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return { count: 0, average: 0, reviews: [] }; // 아직 후기 없음
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) {
        reviewState.data = { count: d.count || 0, average: d.average || 0, reviews: Array.isArray(d.reviews) ? d.reviews : [] };
      })
      .catch(function () { reviewState.error = true; })
      .then(renderAll);
    document.getElementById('reviewMore').addEventListener('click', function () {
      reviewState.expanded = true;
      renderAll();
    });
  }

  var RENDERERS = {
    features: { id: 'featuresGrid', html: featuresHtml },
    crew: { id: 'crewList', html: crewHtml },
    partners: { id: 'partnerList', html: partnersHtml },
    reviews: { id: 'reviewList', html: reviewsHtml },
    updates: { id: 'updateList', html: updatesHtml },
  };

  function renderAll() {
    var o = { lang: lang, editable: editable };
    Object.keys(RENDERERS).forEach(function (k) {
      var el = document.getElementById(RENDERERS[k].id);
      if (el) el.innerHTML = RENDERERS[k].html(o);
    });
    renderReviewExtras();
    if (releaseState && releaseState.info) applyRelease(releaseState.info);
    document.dispatchEvent(new CustomEvent('sckr:render'));
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

  /* ========== 버전 · 다운로드 · 업데이트 내역 (GitHub 연동) ==========
   * 릴리스 목록 API 한 번으로 ① 런처 exe 링크·크기 ② 런처/언어팩 날짜 ③ 업데이트 내역을 모두 가져옴.
   * 런처(launcher-v*)와 언어팩(pack-*)이 같은 저장소에 올라가므로, 'latest'가 아니라
   * SC-KR-Launcher.exe가 첨부된 가장 최근 릴리스를 찾아 링크합니다.
   * 버전 번호는 예전처럼 launcher_version.txt / version.txt 를 기준으로 합니다. */
  function withV(v) { return v && !/^v/i.test(v) ? 'v' + v : v; }
  function formatBytes(n) {
    if (!n) return '';
    var mb = n / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(mb >= 100 ? 0 : 1) + ' MB' : Math.ceil(n / 1024) + ' KB';
  }
  function fmtDate(iso, l) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    try {
      return new Intl.DateTimeFormat(l === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: l === 'en' ? 'short' : '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' }).format(d);
    } catch (_) { return iso.slice(0, 10); }
  }
  function releaseKind(rel) {
    var tag = (rel.tag || '').toLowerCase();
    if (/^launcher/.test(tag) || (rel.assets || []).indexOf(GH.assetName) >= 0) return 'launcher';
    if (/^pack/.test(tag) || (rel.assets || []).some(function (a) { return /\.zip$/i.test(a); })) return 'pack';
    return 'other';
  }
  // 패치노트 마크다운 → 소제목 몇 개 + 첫 줄 요약 (HTML로 넣지 않고 텍스트만 사용)
  function summarize(body) {
    var heads = [], bullets = [];
    String(body || '').split(/\r?\n/).forEach(function (line) {
      var clean = line.replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      if (/^##\s+/.test(clean)) heads.push(clean.replace(/^##\s+/, ''));
      else if (/^[-*]\s+/.test(line) && bullets.length < 2) bullets.push(clean.replace(/^[-*]\s+/, ''));
    });
    return { heads: heads.slice(0, 4), lead: bullets[0] || '' };
  }

  var releaseState = { info: null, list: null, error: false, filter: 'all' };

  function applyRelease(info) {
    if (info.launcher) document.querySelectorAll('.js-version').forEach(function (el) { el.textContent = withV(info.launcher); });
    if (info.patch) document.querySelectorAll('.js-patch-version').forEach(function (el) { el.textContent = withV(info.patch); });
    if (info.url) document.querySelectorAll('.js-download').forEach(function (a) { a.href = info.url; });
    if (info.size) {
      document.querySelectorAll('.js-filesize').forEach(function (el) { el.textContent = formatBytes(info.size); });
      document.querySelectorAll('.js-filesize-wrap').forEach(function (el) { el.hidden = false; });
    }
    document.querySelectorAll('.js-launcher-date').forEach(function (el) { el.textContent = fmtDate(info.launcherDate, lang); });
    document.querySelectorAll('.js-patch-date').forEach(function (el) { el.textContent = fmtDate(info.patchDate, lang); });
  }

  function updatesHtml(o) {
    if (!releaseState.list) {
      if (!releaseState.error) return '<article class="update glass skeleton" aria-hidden="true"></article>'.repeat(3);
      return '<div class="partners-empty"><span>' + esc(tl('updates.error', o.lang)) + '</span></div>';
    }
    var f = releaseState.filter;
    var list = releaseState.list.filter(function (r) { return f === 'all' || r.kind === f; }).slice(0, 6);
    if (!list.length) return '<div class="partners-empty"><span>' + esc(tl('updates.empty', o.lang)) + '</span></div>';
    var firstOf = {};
    releaseState.list.forEach(function (r) { if (!firstOf[r.kind]) firstOf[r.kind] = r.tag; });
    return list.map(function (r) {
      var sum = summarize(r.body);
      var url = safeUrl(r.url);
      var isLatest = firstOf[r.kind] === r.tag && r.kind !== 'other';
      var ver = (r.tag || '').replace(/^(launcher|pack)-?/i, '');
      return '<article class="update glass glass-card k-' + r.kind + '">' +
        '<div class="update-top">' +
          '<span class="badge badge-kind">' + esc(tl('updates.kind.' + r.kind, o.lang)) + '</span>' +
          (isLatest ? '<span class="badge badge-live">' + esc(tl('updates.latest', o.lang)) + '</span>' : '') +
          '<time class="mono dim" datetime="' + esc(r.date) + '">' + esc(fmtDate(r.date, o.lang)) + '</time>' +
        '</div>' +
        '<div class="update-ver mono">' + esc(withV(ver)) + '</div>' +
        '<h3>' + esc(r.name || r.tag) + '</h3>' +
        (sum.heads.length ? '<ul class="update-heads">' + sum.heads.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
        (sum.lead ? '<p>' + esc(sum.lead) + '</p>' : '') +
        (url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener"><span>' + esc(tl('updates.read', o.lang)) + '</span>' + ARROW + '</a>' : '') +
        '</article>';
    }).join('');
  }

  function loadRelease() {
    var cacheKey = 'sckr-release:' + GH.owner + '/' + GH.repo;   // editor.js가 업로드 후 지우는 키와 같음
    try {
      var cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (cached && cached.v === 2 && Date.now() - cached.at < 10 * 60 * 1000) {
        releaseState.info = cached.data.info;
        releaseState.list = cached.data.list;
        applyRelease(releaseState.info);
        renderAll();
        return;
      }
    } catch (_) {}

    function raw(file) {
      return fetch('https://raw.githubusercontent.com/' + GH.owner + '/' + GH.repo + '/' + GH.branch + '/' + file, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (txt) { return txt.trim().split(/\s+/)[0] || ''; })
        .catch(function () { return ''; });
    }
    // 목록 API: IP당 시간당 60회 제한 → 10분 캐시
    var releases = fetch('https://api.github.com/repos/' + GH.owner + '/' + GH.repo + '/releases?per_page=20', {
      headers: { Accept: 'application/vnd.github+json' },
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });

    Promise.all([raw(GH.launcherVersionFile), raw(GH.patchVersionFile), releases]).then(function (res) {
      var rels = Array.isArray(res[2]) ? res[2].filter(function (r) { return !r.draft && !r.prerelease; }) : null;
      var launcherRel = null, asset = null, packRel = null;
      (rels || []).forEach(function (r) {
        var a = (r.assets || []).filter(function (x) { return x.name === GH.assetName; })[0];
        if (a && !launcherRel) { launcherRel = r; asset = a; }
        if (!packRel && /^pack/i.test(r.tag_name || '')) packRel = r;
      });
      var info = {
        launcher: res[0] || (launcherRel ? launcherRel.tag_name.replace(/^launcher-?/i, '') : ''),
        patch: res[1] || (packRel ? packRel.tag_name.replace(/^pack-?/i, '') : ''),
        url: asset ? asset.browser_download_url : '',
        size: asset ? asset.size : 0,
        launcherDate: launcherRel ? launcherRel.published_at : '',
        patchDate: packRel ? packRel.published_at : '',
      };
      var list = rels ? rels.map(function (r) {
        var item = {
          tag: r.tag_name, name: r.name, date: r.published_at, url: r.html_url,
          body: String(r.body || '').slice(0, 4000),
          assets: (r.assets || []).map(function (a) { return a.name; }),
        };
        item.kind = releaseKind(item);
        delete item.assets;
        return item;
      }) : null;
      releaseState.info = info;
      releaseState.list = list;
      releaseState.error = !list;
      applyRelease(info);
      renderAll();
      if (list) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ v: 2, at: Date.now(), data: { info: info, list: list } })); } catch (_) {}
      }
    });
  }

  function initUpdateTabs() {
    var tabs = document.querySelectorAll('.tabs [role="tab"]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        releaseState.filter = tab.dataset.filter;
        tabs.forEach(function (b) {
          var on = b === tab;
          b.setAttribute('aria-selected', String(on));
          b.tabIndex = on ? 0 : -1;
        });
        var list = document.getElementById('updateList');
        list.classList.add('swap');
        setTimeout(function () {
          list.innerHTML = updatesHtml({ lang: lang });
          list.classList.remove('swap');
        }, 160);
        document.dispatchEvent(new CustomEvent('sckr:tabs'));
      });
      // 화살표 키로 탭 이동
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var arr = Array.prototype.slice.call(tabs);
        var next = arr[(arr.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + arr.length) % arr.length];
        next.focus(); next.click();
      });
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
    document.querySelectorAll('.section-head, .legend, .tabs, .features, .steps, .crew-panel, .partners, .reviews, .updates, .download-panel, .cta-panel, .showcase-copy, .showcase-frame').forEach(function (el) {
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
  initUpdateTabs();
  loadRelease();
  loadReviews();
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
    t: function (k) { return t(k); },
    lang: function () { return lang; },
    feature: function (i) {
      var f = data.features[i];
      if (!f) return null;
      var tx = featureText(f, lang);
      return { icon: iconHtml(f.icon), title: tx.title, desc: tx.desc, status: statusOf(f), badge: statusBadge(f, lang), since: f.since || '' };
    },
  };
})();
