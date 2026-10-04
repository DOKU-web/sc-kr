"""청사진 결과물 이미지 — Star Citizen Wiki(starcitizen.tools) 문서의 대표 이미지를 이름으로 찾아 작은 WebP 썸네일로 저장.

build.py에서 사용합니다. 라이선스(CC BY-SA / CC0 / Cloud Imperium 공식 이미지)를 확인한 것만 씁니다.
결과: docs/blueprints/img/<slug>.webp, 매핑은 tools/blueprints/.cache/images.json 에 저장해 재사용.
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

API = 'https://starcitizen.tools/api.php'
UA = 'SC-KR-site-builder/1.0 (https://doku-web.github.io/sc-kr/)'
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'docs', 'blueprints', 'img')
WIDTH = 240


def get(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if i == 3:
                raise
            time.sleep(2 + i * 3)


def license_ok(lic):
    l = (lic or '').lower().replace('_', ' ').replace('-', ' ')
    return any(k in l for k in ('cc by', 'cc0', 'public domain', 'cloud imperium'))


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:80]


def find_images(names):
    """이름 → {file, credit, license} (이미지 없는 이름은 빠짐)"""
    path = os.path.join(CACHE, 'images.json')
    known = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    todo = sorted(set(n for n in names if n and n not in known))
    print('  이미지 찾기: %d개 (이전 결과 %d개 재사용)' % (len(todo), len(known)))
    # 1) 문서 대표 이미지
    page_img = {}
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        r = get({'action': 'query', 'titles': '|'.join(batch), 'prop': 'pageimages', 'piprop': 'name', 'redirects': 1})
        q = r.get('query', {})
        alias = {}
        for x in q.get('normalized', []) + q.get('redirects', []):
            alias[x['to']] = alias.get(x['from'], x['from'])
        for p in q.get('pages', []):
            src = alias.get(p['title'], p['title'])
            src = alias.get(src, src)
            if p.get('pageimage'):
                page_img[src] = p['pageimage']
        time.sleep(0.2)
    # 2) 라이선스 확인 + 썸네일 주소
    files = sorted(set(page_img.values()))
    info = {}
    for i in range(0, len(files), 50):
        r = get({'action': 'query', 'titles': '|'.join('File:' + f for f in files[i:i + 50]),
                 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': WIDTH})
        for p in r['query']['pages']:
            if 'imageinfo' not in p:
                continue
            ii = p['imageinfo'][0]
            meta = ii.get('extmetadata', {})
            lic = (meta.get('LicenseShortName', {}).get('value') or '').strip()
            if license_ok(lic):
                artist = re.sub(r'<[^>]+>', '', meta.get('Artist', {}).get('value', '')).strip()
                info[p['title'].split(':', 1)[1].replace(' ', '_')] = {
                    'thumb': ii.get('thumburl') or ii['url'], 'license': lic,
                    'credit': '© Cloud Imperium Rights LLC' if 'cloud imperium' in lic.lower() else (artist or 'Star Citizen Wiki')}
        time.sleep(0.2)
    for n in todo:
        f = page_img.get(n)
        known[n] = info.get(f.replace(' ', '_')) if f else None
        if known[n]:
            known[n]['wikifile'] = f
    json.dump(known, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    return {n: known[n] for n in names if known.get(n)}


def download(found):
    """썸네일을 WebP로 저장 → {이름: 'img/xxx.webp'}"""
    os.makedirs(OUT, exist_ok=True)
    out, by_file = {}, {}
    for n, e in found.items():
        name = slug(e['wikifile'].rsplit('.', 1)[0]) + '.webp'
        path = os.path.join(OUT, name)
        if name not in by_file and not os.path.exists(path):
            try:
                req = urllib.request.Request(e['thumb'], headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=60) as r, tempfile.NamedTemporaryFile(delete=False) as tmp:
                    tmp.write(r.read())
                if shutil.which('ffmpeg'):
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-vf', "scale='min(%d,iw)':-2" % WIDTH,
                                    '-c:v', 'libwebp', '-quality', '70', path], check=True)
                else:
                    shutil.copy(tmp.name, path)
                os.unlink(tmp.name)
                time.sleep(0.1)
            except Exception as ex:
                print('   이미지 실패', n, ex)
                continue
        by_file[name] = 1
        out[n] = 'img/' + name
    return out
