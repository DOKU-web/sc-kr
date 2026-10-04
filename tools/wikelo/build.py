"""위켈로 페이지 생성기 — Star Citizen Wiki(starcitizen.tools)의 Wikelo 문서를 가져와 docs/wikelo/ 를 만듭니다.

사용법 (저장소 루트에서):  python tools/wikelo/build.py
 - 계약 표, 보상 함선 장비, 재료·보상 아이템 상세(획득 방법 포함), 이미지를 위키 API로 받아 정적 페이지로 생성합니다.
 - 위키 본문과 이미지는 CC BY-SA 4.0 / CC0, 공식 이미지는 CIG 팬 콘텐츠 정책에 따라 사용 — 출처를 자동 표기합니다.
 - 라이선스를 확인할 수 없는 이미지는 쓰지 않습니다.
 - 아이템 요약의 한국어 번역은 tools/wikelo/ko.json (없으면 영어 원문 표시).
 - 위키 문서 원본은 tools/wikelo/.cache/ 에 저장해 재사용합니다. 최신 내용으로 다시 받으려면 이 폴더를 지우세요.
"""
import html as H
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import items as ITEMS  # noqa: E402
import game_text as GAME  # noqa: E402

API = 'https://starcitizen.tools/api.php'
WIKI = 'https://starcitizen.tools'
UA = 'SC-KR-site-builder/1.0 (https://doku-web.github.io/sc-kr/)'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'docs', 'wikelo')
IMG_DIR = os.path.join(OUT, 'img')
CARD_W, ITEM_W = 640, 480

SECTIONS = [  # (위키 섹션 id, 표 순서, 키, 한글 이름, 설명)
    ('Currencies', 0, 'currency', '화폐', '스크립·광물을 위켈로 호의(Wikelo Favor)로 바꾸는 계약. 다른 계약의 재료로 쓰입니다.'),
    ('Weapons', 0, 'weapon', '무기', '위켈로가 손본 특별한 개인 화기.'),
    ('Armor', 0, 'armor', '방어구', '위켈로 전용 도색·개조 방어구와 슈트.'),
    ('Ships_and_vehicles', 0, 'vehicle', '지상 차량', '위켈로 특제 지상 차량.'),
    ('Ships_and_vehicles', 1, 'ship', '함선', '위켈로가 개조해 주는 함선. 대부분 A·B 등급 부품이 장착된 채로 지급됩니다.'),
    ('Other', 0, 'other', '기타', '그 밖의 교환 계약.'),
]
# 자동으로 맞는 이미지를 못 찾는 계약은 직접 지정 (계약 이름: 위키 파일 이름) — 라이선스 확인은 그대로 거칩니다
CARD_IMAGE_OVERRIDES = {   # (파일, 꼬리표: 'reward' = 실제 보상 아이템, 'related' = 관련 이미지)
    'ATLS Cool Metal Color': ('ATLS series paints.jpg', 'related'),
    'ATLS Orange Line': ('ATLS Safety Orange hangar cutout - Stripe BG SCT logo - Isometric.png', 'related'),
    'ATLS Snowland Color': ('ATLS series paints 2.jpg', 'related'),
    'Make ATLS shoot': ('ATLS GEO IKTI Front view pic 2.jpg', 'related'),
    'Make jumpy ATLS shoot': ('ATLS GEO IKTI Jumping view pic 4.jpg', 'reward'),
    'Starfighter Inferno Special': ('Ares Inferno - Front Starboard.jpg', 'reward'),
    'Sneaky Stabber': ('F8C variants and paints x4 flying above clouds.jpg', 'reward'),
    'Where Wolf? Here Wolf': ('L-21 Wolf landed in hangar - cropped.png', 'reward'),
    # 실제 위켈로 개조판 사진 (달 표면 위장 + 코피온 송곳니 = Fun Military Skull 에디션)
    'Fun Military Skull Gun': ('Kopion Tooth Right.png', 'reward'),
    # 화폐 계약: 보상(Wikelo Favor)이 모두 같아서 '내는 재료' 이미지로 구분
    'Trade Merc Scrip for Favors?': ('Scrip star citizen.png', 'order', (0.04, 0.12, 0.50, 0.50)),     # 왼쪽 = 용병 길드 스크립
    'Trade Council Scrip for Favors?': ('Scrip star citizen.png', 'order', (0.50, 0.12, 0.50, 0.50)),  # 오른쪽 = The Council 스크립
    'Trade Worm Parts for Favors?': ('Valakkar.png', 'related'),
    'Turn Things to Favor': ('Carinite.png', 'order'),
}
CAT_KO = {k: ko for _, _, k, ko, _ in SECTIONS}
_SVG = '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">%s</svg>'
CAT_ICON = {
    'currency': _SVG % '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.9-2.5 2s1 1.7 2.5 2 2.5.9 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v1.5M12 16v1.5"/>',
    'weapon': _SVG % '<path d="M3 10h13l2-2h3v4h-3l-1 1H9l-1 4H5l1-4H3Z"/>',
    'armor': _SVG % '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6Z"/>',
    'vehicle': _SVG % '<path d="M4 15h16l-2-5H6Z"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
    'ship': _SVG % '<path d="M12 3c2.5 3 3.5 6.5 3.5 10l3 3v2l-4-1-1 2.5h-3l-1-2.5-4 1v-2l3-3c0-3.5 1-7 3.5-10Z"/><circle cx="12" cy="10" r="1.5"/>',
    'other': _SVG % '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
}
REP_KO = {'None': '없음', 'New Customer': '신규 고객', 'Very Good Customer': '아주 좋은 고객', 'Very Best Customer': '최고의 고객'}


def get(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def clean(x):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', x))).strip()


def esc(x):
    return H.escape(x or '', quote=True)


def original_name(src):
    """'.../200px-Zeus_Mk_II_ES_Wikelo.png.webp?12olm' → 'Zeus_Mk_II_ES_Wikelo.png'"""
    name = urllib.parse.unquote(src.split('?')[0].split('/')[-1])
    name = re.sub(r'^\d+px-', '', name)
    return re.sub(r'(\.(?:png|jpe?g|gif))\.webp$', r'\1', name, flags=re.I)


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def license_ok(lic):
    l = lic.lower().replace('_', ' ').replace('-', ' ')
    return any(k in l for k in ('cc by', 'cc0', 'public domain', 'cloud imperium'))


def credit_of(lic, author):
    if 'cloud imperium' in lic.lower():
        return '© Cloud Imperium Rights LLC'
    return author


# ---------------------------------------------------------------- 위켈로 문서
def parse_cell(cell):
    out = []
    for part in re.split(r'<br\s*/?>', cell or ''):
        text = clean(part)
        if not text:
            continue
        m = re.match(r'^(\d+(?:[.,]\d+)?\s*(?:x|SCU))\s+(.*)$', text)
        qty, name = (m.group(1), m.group(2)) if m else ('', text)
        a = re.search(r'<a href="/[^"]+"[^>]*title="([^"]+)"', part)
        out.append({'qty': qty, 'name': name, 'page': H.unescape(a.group(1)) if a else None})
    return out


def parse_page():
    data = get({'action': 'parse', 'page': 'Wikelo', 'prop': 'text|revid', 'disableeditsection': 1})['parse']
    t = data['text']
    secs = [(m.start(), m.group(1)) for m in re.finditer(r'<h3 id="([^"]+)"', t)]
    contracts, per_sec = [], {}
    for m in re.finditer(r'<table class="wikitable sortable">(.*?)</table>', t, re.S):
        sec = [s for p, s in secs if p < m.start()][-1]
        idx = per_sec.get(sec, 0)
        per_sec[sec] = idx + 1
        rows = re.findall(r'<tr>(.*?)</tr>', m.group(1), re.S)
        hdr = [clean(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)]
        for r in rows[1:]:
            d = dict(zip(hdr, re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)))
            img = re.search(r'<img[^>]+src="([^"]+)"', d.get('Image', ''))
            cat = next((k for s, i, k, *_ in SECTIONS if s == sec and i == idx), 'other')
            contracts.append({
                'id': 'c%d' % (len(contracts) + 1), 'cat': cat, 'name': clean(d['Name']),
                'rep': clean(d.get('Reputation min', '')) or 'None',
                'orders': parse_cell(d.get('Orders')), 'rewards': parse_cell(d.get('Rewards')),
                'image': original_name(img.group(1)) if img else None,
            })
    loadouts = []
    i = t.find('id="Reward_ship_loadouts"')
    m = re.search(r'<table class="wikitable">(.*?)</table>', t[i:], re.S)
    if m:
        rows = re.findall(r'<tr>(.*?)</tr>', m.group(1), re.S)
        hdr = [clean(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)]
        for r in rows[1:]:
            loadouts.append(dict(zip(hdr, [clean(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)])))
    return contracts, loadouts, data.get('revid')


# ---------------------------------------------------------------- 이미지
def save_webp(raw, path, width):
    if not shutil.which('ffmpeg'):
        open(path, 'wb').write(raw)
        return
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(raw)
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-vf', "scale='min(%d,iw)':-2" % width,
                        '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', path], check=True)
    finally:
        os.unlink(tmp.name)


def crop_image(name, box, slug):
    """원본 이미지의 일부(x, y, w, h — 0~1 비율)를 잘라 카드용 WebP로 저장"""
    res = get({'action': 'query', 'titles': 'File:' + name, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata'})
    p = res['query']['pages'][0]
    if 'imageinfo' not in p:
        return None
    ii = p['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    lic = (meta.get('LicenseShortName', {}).get('value') or '').strip()
    if not license_ok(lic):
        return None
    os.makedirs(IMG_DIR, exist_ok=True)
    path = os.path.join(IMG_DIR, 'crop-' + slug + '.webp')
    if not os.path.exists(path) and shutil.which('ffmpeg'):
        req = urllib.request.Request(ii['url'], headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r, tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(r.read())
        x, y, w, h = box
        try:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-vf',
                            "crop=iw*%s:ih*%s:iw*%s:ih*%s,scale='min(%d,iw)':-2" % (w, h, x, y, CARD_W),
                            '-c:v', 'libwebp', '-quality', '78', path], check=True)
        finally:
            os.unlink(tmp.name)
    if not os.path.exists(path):
        return None
    author = clean(meta.get('Artist', {}).get('value', '')) or 'Star Citizen Wiki'
    return {'file': 'img/crop-' + slug + '.webp', 'credit': credit_of(lic, author), 'license': lic,
            'page': WIKI + '/File:' + urllib.parse.quote(name.replace(' ', '_'))}


def fetch_images(names, subdir, width):
    """라이선스 확인 후 WebP 썸네일 저장 → {파일이름: {file, credit, license, page}}"""
    folder = os.path.join(IMG_DIR, subdir) if subdir else IMG_DIR
    os.makedirs(folder, exist_ok=True)
    info, skipped = {}, []
    names = sorted(set(n.replace(' ', '_') for n in names if n))
    for i in range(0, len(names), 40):
        res = get({'action': 'query', 'titles': '|'.join('File:' + n for n in names[i:i + 40]),
                   'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': width})
        for p in res['query']['pages']:
            if 'imageinfo' not in p:
                continue
            ii = p['imageinfo'][0]
            meta = ii.get('extmetadata', {})
            lic = (meta.get('LicenseShortName', {}).get('value') or '').strip()
            name = p['title'].split(':', 1)[1].replace(' ', '_')
            if not license_ok(lic):
                skipped.append(name)
                continue
            author = clean(meta.get('Artist', {}).get('value', '')) or 'Star Citizen Wiki'
            slug = slugify(os.path.splitext(name)[0]) + '.webp'
            path = os.path.join(folder, slug)
            if not os.path.exists(path):
                req = urllib.request.Request(ii.get('thumburl') or ii['url'], headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    save_webp(r.read(), path, width)
            info[name] = {'file': 'img/' + (subdir + '/' if subdir else '') + slug, 'credit': credit_of(lic, author),
                          'license': lic, 'page': WIKI + '/File:' + urllib.parse.quote(name)}
    if skipped:
        print('  라이선스 미확인으로 제외: %d개' % len(skipped))
    return info


# ---------------------------------------------------------------- HTML 조각
def items_html(lst, cls):
    out = []
    for it in lst:
        name = ('%s <span class="wk-en-sub">(%s)</span>' % (esc(it['ko']), esc(it['name']))) if it.get('ko') else esc(it['name'])
        inner = ('<button type="button" class="wk-item-btn" data-item="%s">%s</button>' % (esc(it['page']), name)) if it['page'] else '<span>%s</span>' % name
        out.append('<li><span class="qty mono">%s</span>%s</li>' % (esc(it['qty']), inner))
    return '<ul class="%s">%s</ul>' % (cls, ''.join(out))


def card(c):
    img = c.get('img')
    pic = ('<div class="wk-img"><img src="%s" alt="%s" loading="lazy">%s</div>' % (
        esc(img['file']), esc(c['rewards'][0]['name'] if c['rewards'] else c['name']),
        {'reward': '<span class="wk-img-tag">보상 이미지</span>', 'order': '<span class="wk-img-tag">재료 이미지</span>',
         'related': '<span class="wk-img-tag">관련 이미지</span>'}.get(c.get('img_from'), ''))
        if img else '<div class="wk-img wk-img-empty" aria-hidden="true">%s<span>%s</span></div>' % (CAT_ICON.get(c['cat'], CAT_ICON['other']), esc(CAT_KO.get(c['cat'], ''))))
    ko = (c.get('game') or {}).get('ko')
    search = ' '.join([c['name'], ko or ''] + [x['name'] for x in c['orders'] + c['rewards']]).lower()
    title_html = ('%s<span class="wk-title-en">%s</span>' % (esc(ko), esc(c['name']))) if ko else esc(c['name'])
    rep = '' if c['rep'] == 'None' else '<span class="wk-rep">%s 이상</span>' % esc(REP_KO.get(c['rep'], c['rep']))
    return ('<article class="wk-card" data-id="%s" data-cat="%s" data-search="%s">'
            '<button type="button" class="wk-card-open" data-contract="%s" aria-label="%s 자세히 보기">%s</button>'
            '<div class="wk-body"><h3><button type="button" class="wk-title-btn" data-contract="%s">%s</button></h3>%s'
            '<div class="wk-cols"><div><div class="wk-label">필요 재료 <small>· 눌러서 획득 방법 보기</small></div>%s</div>'
            '<div><div class="wk-label">보상</div>%s</div></div></div></article>') % (
        c['id'], c['cat'], esc(search), c['id'], esc(ko or c['name']), pic, c['id'], title_html, rep,
        items_html(c['orders'], 'wk-items'), items_html(c['rewards'], 'wk-items wk-rewards'))


STOP = {'wikelo', 'special', 'war', 'work', 'sneak', 'speedy', 'savior', 'the', 'and', 'for', 'make', 'want', 'more', 'most', 'mod', 'you', 'ship'}
VEHICLE_TYPES = ('Spacecraft', 'Ground vehicle', 'Gravlev', 'Vehicle')


def _toks(s):
    return set(re.findall(r'[a-z0-9][a-z0-9-]{2,}', (s or '').lower())) - STOP


def main_reward(c, items):
    """보상 중 계약을 대표하는 아이템 (이름이 계약명과 가장 비슷하고, 함선·차량 계약이면 함선·차량 우선)"""
    best, best_sc = None, -1
    for i, r in enumerate(c['rewards']):
        it = r['page'] and items.get(r['page'])
        if not it:
            continue
        sc = len(_toks(c['name']) & _toks(r['name'] + ' ' + it['title'])) * 2
        typ = ' '.join(v for s in it.get('info', []) for k, v in s['items'] if k == 'Type')
        if c['cat'] in ('ship', 'vehicle') and any(t in typ for t in VEHICLE_TYPES):
            sc += 10
        if re.search(r'magazine|battery|blueprint', r['name'], re.I):
            sc -= 5   # 탄창·설계도는 대표 보상이 아님
        sc -= i * 0.01   # 동점이면 앞쪽
        if sc > best_sc:
            best, best_sc = r, sc
    return best


def asset_version():
    """wikelo.js·css·data.json 내용으로 만든 버전 값 (바뀌면 브라우저가 새로 받음)"""
    import hashlib
    h = hashlib.md5()
    for name in ('wikelo.js', 'wikelo.css', 'planner.css', 'data.json'):
        path = os.path.join(OUT, name)
        if os.path.exists(path):
            h.update(open(path, 'rb').read())
    return h.hexdigest()[:8]


# ---------------------------------------------------------------- 빌드
def build():
    print('위키에서 Wikelo 문서 가져오는 중...')
    contracts, loadouts, revid = parse_page()
    print('  계약 %d개, 보상 함선 장비 %d개' % (len(contracts), len(loadouts)))

    # 아이템 상세
    ko = json.load(open(os.path.join(HERE, 'ko.json'), encoding='utf-8'))
    ko_desc = json.load(open(os.path.join(HERE, 'ko_desc.json'), encoding='utf-8'))
    roles = {}
    for c in contracts:
        for kind in ('orders', 'rewards'):
            for it in c[kind]:
                if it['page']:
                    roles.setdefault(it['page'], {'orders': [], 'rewards': []})[kind].append(c['id'])
    print('아이템 문서 %d개 정리 중 (처음 실행은 몇 분 걸립니다)...' % len(roles))
    items = {}
    for page in sorted(roles):
        d = ITEMS.fetch_html(get, page)
        if not d:
            continue
        it = ITEMS.parse_item(d['html'], d['title'])
        it['key'] = page
        it['wiki'] = WIKI + '/' + urllib.parse.quote(d['title'].replace(' ', '_'))
        if page in ko:
            it['lead_ko'] = ko[page]
        if it.get('desc') in ko_desc:
            it['desc_ko'] = ko_desc[it['desc']]
        it['used_in'] = roles[page]['orders']
        it['reward_of'] = roles[page]['rewards']
        items[page] = it

    gt = GAME.GameText()
    if gt.ok:
        # 아이템 이름: 한국어 패치 이름 (한국어 (영어 원본) 으로 표시)
        for c in contracts:
            for it in c['orders'] + c['rewards']:
                ko = gt.item_ko(it['name'])
                if ko:
                    it['ko'] = ko
        for page, it in items.items():
            ko = gt.item_ko(it['title']) or gt.item_ko(page)
            if ko:
                it['ko_name'] = ko
        for page, it in items.items():
            ms = gt.missions_for(page)
            if ms:
                it['missions'] = ms
        for c in contracts:
            g = gt.contract(c['name'])
            if g:
                c['game'] = g
        print('  게임 문자열: 계약 %d/%d개 한글 제목, 재료 획득 미션 %d개 연결' % (
            sum(1 for c in contracts if c.get('game')), len(contracts), sum(1 for it in items.values() if it.get('missions'))))
    else:
        print('  게임 문자열(global.ini)을 찾지 못해 한글 계약 제목은 건너뜀:', GAME.KO_INI)

    print('이미지 확인/저장 중...')
    hero_img = 'Wikelo_Hologram_-_Alpha_4.1.0.jpg'
    card_imgs = fetch_images([c['image'] for c in contracts] + [hero_img], '', CARD_W)
    item_imgs = fetch_images([it.get('image') for it in items.values()], 'items', ITEM_W)
    for it in items.values():
        img = item_imgs.get((it.get('image') or '').replace(' ', '_'))
        it['img'] = img
        it.pop('image', None)
    for c in contracts:
        own = card_imgs.get((c['image'] or '').replace(' ', '_'))
        c['img'], c['img_own'] = own, bool(own)
        c['img_from'] = 'own' if own else None
        main = main_reward(c, items)
        if not own and main and items[main['page']].get('img'):   # 계약 이미지가 없으면 '대표 보상'의 이미지
            c['img'], c['img_from'] = items[main['page']]['img'], 'reward'
        if not c['img']:   # 그래도 없으면 보상과 이름이 가장 비슷한 재료 이미지 (예: 개조 전 기본 총기)
            words = _toks(' '.join(r['name'] for r in c['rewards'] + [{'name': c['name']}]))
            best, score = None, -1
            for o in c['orders']:
                img = o['page'] and items.get(o['page'], {}).get('img')
                if not img:
                    continue
                sc = len(words & _toks(o['name']))
                if sc > score:
                    best, score = img, sc
            if best and score >= 1:   # 이름이 겹치는 재료만 (관련 없는 이미지는 쓰지 않음)
                c['img'], c['img_from'] = best, 'order'
        if not c['img']:   # 마지막: 전체 아이템 중 이름이 가장 많이 겹치는 이미지 (예: Ares Inferno → Ares Ion)
            best, score = None, 0
            for it in items.values():
                if it.get('img'):
                    sc = len(words & _toks(it['title'] + ' ' + it['key']))
                    if sc > score:
                        best, score = it['img'], sc
            if best and score >= 1:
                c['img'], c['img_from'] = best, 'related'
    over = fetch_images([o[0] for o in CARD_IMAGE_OVERRIDES.values() if len(o) == 2], '', CARD_W)
    card_imgs.update(over)
    for c in contracts:
        o = CARD_IMAGE_OVERRIDES.get(c['name'])
        if not o:
            continue
        img = over.get(o[0].replace(' ', '_')) if len(o) == 2 else crop_image(o[0], o[2], slugify(c['name']))
        if img:
            c['img'], c['img_from'] = img, o[1]
            m = main_reward(c, items)
            if o[1] == 'reward' and m and not items[m['page']].get('img'):   # 실제 보상 사진이면 아이템 상세에도 사용
                items[m['page']]['img'] = img
            card_imgs.setdefault(o[0].replace(' ', '_'), {k: v for k, v in img.items() if k != 'file'} | {'file': img['file']})
    n_img = sum(1 for c in contracts if c['img'])
    print('  카드 이미지 %d/%d, 아이템 이미지 %d/%d' % (n_img, len(contracts), sum(1 for i in items.values() if i['img']), len(items)))

    # 데이터 파일 (상세 보기용)
    os.makedirs(OUT, exist_ok=True)
    data = {
        'contracts': {c['id']: {k: c.get(k) for k in ('id', 'cat', 'name', 'rep', 'orders', 'rewards', 'img', 'game')} for c in contracts},
        'items': items,
        'rep': REP_KO,
        'cats': {k: ko_ for _, _, k, ko_, _ in SECTIONS},
    }
    with open(os.path.join(OUT, 'data.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    # 페이지
    counts = {k: sum(1 for c in contracts if c['cat'] == k) for _, _, k, *_ in SECTIONS}
    tabs = '<button type="button" class="wk-tab" aria-pressed="true" data-cat="all">전체 <span>%d</span></button>' % len(contracts)
    tabs += ''.join('<button type="button" class="wk-tab" aria-pressed="false" data-cat="%s">%s <span>%d</span></button>' % (k, ko_, counts[k])
                    for _, _, k, ko_, _ in SECTIONS if counts.get(k))
    groups = ''
    for _, _, key, ko_, desc in SECTIONS:
        cs = [c for c in contracts if c['cat'] == key]
        if cs:
            groups += ('<section class="wk-group" data-cat="%s"><div class="wk-group-head"><h2>%s</h2><p>%s</p></div>'
                       '<div class="wk-grid">%s</div></section>') % (key, esc(ko_), esc(desc), ''.join(card(c) for c in cs))

    lo_cols = ['Mission', 'Reward ship', 'Loadout class', 'Power plant', 'Shield generator', 'Quantum drive', 'Cooler']
    lo_ko = ['계약', '보상 함선', '장비 등급', '파워 플랜트', '실드 발생기', '퀀텀 드라이브', '쿨러']
    lo_rows = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % esc(r.get(k, '')) for k in lo_cols) for r in loadouts)

    all_imgs = {**card_imgs, **item_imgs}
    credits = ''.join('<li><a href="%s" target="_blank" rel="noopener">%s</a> — %s, %s</li>' % (
        esc(v['page']), esc(k.replace('_', ' ')), esc(v['credit']), esc(v['license'])) for k, v in sorted(all_imgs.items()))
    hero = card_imgs.get(hero_img)

    tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
    page = (tpl.replace('{{HERO_IMG}}', esc(hero['file']) if hero else '')
               .replace('{{TABS}}', tabs).replace('{{GROUPS}}', groups)
               .replace('{{LOADOUT_HEAD}}', ''.join('<th>%s</th>' % h for h in lo_ko)).replace('{{LOADOUT_ROWS}}', lo_rows)
               .replace('{{TOTAL}}', str(len(contracts))).replace('{{CREDITS}}', credits)
               .replace('{{UPDATED}}', date.today().isoformat()).replace('{{REVID}}', str(revid or ''))
               .replace('{{VER}}', asset_version()))
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    print('완료: docs/wikelo/index.html, data.json')


if __name__ == '__main__':
    sys.exit(build())
