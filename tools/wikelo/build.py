"""위켈로 페이지 생성기 — Star Citizen Wiki(starcitizen.tools)의 Wikelo 문서를 가져와 docs/wikelo/ 를 만듭니다.

사용법 (저장소 루트에서):  python tools/wikelo/build.py
 - 계약 표, 보상 함선 장비, 이미지(라이선스·작성자 포함)를 위키 API로 받아 정적 HTML로 생성합니다.
 - 위키 본문과 이미지는 CC BY-SA 4.0 — 페이지 하단에 출처/작성자를 자동으로 표기합니다.
 - 라이선스를 확인할 수 없는 이미지는 받지 않고 빈 칸으로 둡니다.
"""
import html as H
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date

API = 'https://starcitizen.tools/api.php'
WIKI = 'https://starcitizen.tools'
UA = 'SC-KR-site-builder/1.0 (https://doku-web.github.io/sc-kr/)'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs', 'wikelo')
IMG_DIR = os.path.join(OUT, 'img')
THUMB_W = 640
OK_LICENSES = ('cc-by-sa', 'cc-by', 'cc0', 'public domain', 'pd')

SECTIONS = [  # (위키 섹션 id, 표 순서, 키, 한글 이름, 설명)
    ('Currencies', 0, 'currency', '화폐', '스크립·광물을 위켈로 호의(Wikelo Favor)로 바꾸는 계약. 다른 계약의 재료로 쓰입니다.'),
    ('Weapons', 0, 'weapon', '무기', '위켈로가 손본 특별한 개인 화기.'),
    ('Armor', 0, 'armor', '방어구', '위켈로 전용 도색·개조 방어구와 슈트.'),
    ('Ships_and_vehicles', 0, 'vehicle', '지상 차량', '위켈로 특제 지상 차량.'),
    ('Ships_and_vehicles', 1, 'ship', '함선', '위켈로가 개조해 주는 함선. 대부분 A·B 등급 부품이 장착된 채로 지급됩니다.'),
    ('Other', 0, 'other', '기타', '그 밖의 교환 계약.'),
]
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
    """'200px-Zeus_Mk_II_ES_Wikelo.png.webp' → 'Zeus_Mk_II_ES_Wikelo.png'"""
    name = urllib.parse.unquote(src.split('?')[0].split('/')[-1])
    name = re.sub(r'^\d+px-', '', name)
    name = re.sub(r'(\.(?:png|jpe?g|gif))\.webp$', r'\1', name, flags=re.I)
    return name


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
            items = lambda c: [clean(x) for x in re.split(r'<br\s*/?>', c or '') if clean(x)]
            img = re.search(r'<img[^>]+src="([^"]+)"', d.get('Image', ''))
            link = re.search(r'href="([^"]+)"', d.get('Name', ''))
            contracts.append({
                'sec': sec, 'idx': idx, 'name': clean(d['Name']),
                'url': WIKI + H.unescape(link.group(1)) if link else None,
                'rep': clean(d.get('Reputation min', '')) or 'None',
                'orders': items(d.get('Orders')), 'rewards': items(d.get('Rewards')),
                'image': original_name(img.group(1)) if img else None,
            })
    # 보상 함선 장비 표
    loadouts = []
    i = t.find('id="Reward_ship_loadouts"')
    m = re.search(r'<table class="wikitable">(.*?)</table>', t[i:], re.S)
    if m:
        rows = re.findall(r'<tr>(.*?)</tr>', m.group(1), re.S)
        hdr = [clean(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)]
        for r in rows[1:]:
            loadouts.append(dict(zip(hdr, [clean(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)])))
    return contracts, loadouts, data.get('revid')


def fetch_images(names):
    """이미지 라이선스·작성자 확인 후 썸네일 저장. {원본이름: {file, author, license, page}}"""
    os.makedirs(IMG_DIR, exist_ok=True)
    info = {}
    names = sorted(set(n for n in names if n))
    for i in range(0, len(names), 40):
        batch = names[i:i + 40]
        res = get({'action': 'query', 'titles': '|'.join('File:' + n for n in batch),
                   'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': THUMB_W})
        for p in res['query']['pages']:
            if 'imageinfo' not in p:
                continue
            ii = p['imageinfo'][0]
            meta = ii.get('extmetadata', {})
            lic = (meta.get('LicenseShortName', {}).get('value') or meta.get('License', {}).get('value') or '').strip()
            author = clean(meta.get('Artist', {}).get('value', '')) or 'Star Citizen Wiki'
            name = p['title'].split(':', 1)[1].replace(' ', '_')
            if not any(k in lic.lower().replace(' ', '-').replace('_', '-') for k in OK_LICENSES) and not any(k in lic.lower() for k in OK_LICENSES):
                print('  건너뜀 (라이선스 미확인):', name, repr(lic))
                continue
            url = ii.get('thumburl') or ii['url']
            slug = re.sub(r'[^A-Za-z0-9_-]+', '-', os.path.splitext(name)[0]).strip('-').lower() + '.webp'
            path = os.path.join(IMG_DIR, slug)
            if not os.path.exists(path):
                req = urllib.request.Request(url, headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    raw = r.read()
                save_webp(raw, path)
            info[name] = {'file': 'img/' + slug, 'author': author, 'license': lic,
                          'page': WIKI + '/File:' + urllib.parse.quote(name)}
    return info


def save_webp(raw, path):
    """ffmpeg로 최대 너비 THUMB_W, 품질 78 WebP로 압축 (ffmpeg 없으면 원본 그대로 저장)"""
    import shutil, subprocess, tempfile
    if not shutil.which('ffmpeg'):
        open(path, 'wb').write(raw)
        return
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(raw)
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-vf', "scale='min(%d,iw)':-2" % THUMB_W,
                        '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', path], check=True)
    finally:
        os.unlink(tmp.name)


def qty_item(s):
    m = re.match(r'^(\d+(?:\.\d+)?\s*(?:x|SCU))\s+(.*)$', s)
    return (m.group(1), m.group(2)) if m else ('', s)


def items_html(lst, cls):
    out = []
    for s in lst:
        q, it = qty_item(s)
        out.append('<li><span class="qty mono">%s</span><span>%s</span></li>' % (esc(q), esc(it)))
    return '<ul class="%s">%s</ul>' % (cls, ''.join(out))


def card(c, img):
    rep = REP_KO.get(c['rep'], c['rep'])
    pic = ('<div class="wk-img"><img src="%s" alt="%s" loading="lazy"></div>' % (esc(img['file']), esc(c['rewards'][0] if c['rewards'] else c['name']))
           if img else '<div class="wk-img wk-img-empty" aria-hidden="true"><span>W</span></div>')
    search = ' '.join([c['name']] + c['orders'] + c['rewards']).lower()
    rep_badge = '' if c['rep'] == 'None' else '<span class="wk-rep">%s 이상</span>' % esc(rep)
    title = ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (esc(c['url']), esc(c['name']))) if c['url'] else esc(c['name'])
    return ('<article class="wk-card" data-cat="%s" data-search="%s">%s<div class="wk-body">'
            '<h3>%s</h3>%s'
            '<div class="wk-cols"><div><div class="wk-label">필요 재료</div>%s</div>'
            '<div><div class="wk-label">보상</div>%s</div></div></div></article>') % (
        c['cat'], esc(search), pic, title, rep_badge, items_html(c['orders'], 'wk-items'), items_html(c['rewards'], 'wk-items wk-rewards'))


def build():
    print('위키에서 Wikelo 문서 가져오는 중...')
    contracts, loadouts, revid = parse_page()
    for c in contracts:
        for sec, idx, key, *_ in SECTIONS:
            if c['sec'] == sec and c['idx'] == idx:
                c['cat'] = key
        c.setdefault('cat', 'other')
    print('  계약 %d개, 보상 함선 장비 %d개' % (len(contracts), len(loadouts)))
    hero_img = 'Wikelo_Hologram_-_Alpha_4.1.0.jpg'
    print('이미지 확인/저장 중...')
    imgs = fetch_images([c['image'] for c in contracts] + [hero_img])
    print('  이미지 %d개 사용' % len(imgs))

    counts = {k: sum(1 for c in contracts if c['cat'] == k) for _, _, k, *_ in SECTIONS}
    tabs = '<button type="button" class="wk-tab" aria-pressed="true" data-cat="all">전체 <span>%d</span></button>' % len(contracts)
    tabs += ''.join('<button type="button" class="wk-tab" aria-pressed="false" data-cat="%s">%s <span>%d</span></button>' % (k, ko, counts[k])
                    for _, _, k, ko, _ in SECTIONS if counts.get(k))
    groups = ''
    for _, _, key, ko, desc in SECTIONS:
        cs = [c for c in contracts if c['cat'] == key]
        if not cs:
            continue
        groups += ('<section class="wk-group" data-cat="%s"><div class="wk-group-head"><h2>%s</h2><p>%s</p></div>'
                   '<div class="wk-grid">%s</div></section>') % (key, esc(ko), esc(desc), ''.join(card(c, imgs.get(c['image'])) for c in cs))

    lo_cols = ['Mission', 'Reward ship', 'Loadout class', 'Power plant', 'Shield generator', 'Quantum drive', 'Cooler']
    lo_ko = ['계약', '보상 함선', '장비 등급', '파워 플랜트', '실드 발생기', '퀀텀 드라이브', '쿨러']
    lo_rows = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % esc(r.get(k, '')) for k in lo_cols) for r in loadouts)

    credits = ''.join('<li><a href="%s" target="_blank" rel="noopener">%s</a> — %s, %s</li>' % (
        esc(v['page']), esc(k.replace('_', ' ')), esc(v['author']), esc(v['license'])) for k, v in sorted(imgs.items()))
    hero = imgs.get(hero_img)

    tpl = open(os.path.join(os.path.dirname(__file__), 'template.html'), encoding='utf-8').read()
    page = (tpl.replace('{{HERO_IMG}}', esc(hero['file']) if hero else '')
               .replace('{{TABS}}', tabs).replace('{{GROUPS}}', groups)
               .replace('{{LOADOUT_HEAD}}', ''.join('<th>%s</th>' % h for h in lo_ko)).replace('{{LOADOUT_ROWS}}', lo_rows)
               .replace('{{TOTAL}}', str(len(contracts))).replace('{{CREDITS}}', credits)
               .replace('{{UPDATED}}', date.today().isoformat())
               .replace('{{REVID}}', str(revid or '')))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    print('완료: docs/wikelo/index.html')


if __name__ == '__main__':
    sys.exit(build())
