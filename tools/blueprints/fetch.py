"""청사진 데이터 수집 — Star Citizen Wiki API(api.star-citizen.wiki)에서 청사진·해금 미션을 받아 캐시에 저장.

사용법 (저장소 루트에서):  python tools/blueprints/fetch.py
 - 결과는 tools/blueprints/.cache/ 에 저장되고, 이미 받은 파일은 다시 받지 않습니다 (최신화하려면 폴더 삭제).
 - 서버 부담을 줄이려고 요청 사이에 잠깐 쉽니다. 처음 실행은 10분 정도 걸립니다.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = 'https://api.star-citizen.wiki/api'
UA = 'SC-KR-site-builder/1.0 (https://doku-web.github.io/sc-kr/)'
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
DELAY = 0.2


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # 일시 오류는 잠깐 쉬었다가 다시
            if i == tries - 1:
                raise
            print('  재시도', url, e)
            time.sleep(2 + i * 3)


def cached(path, url):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    data = get(url)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    time.sleep(DELAY)
    return data


def main():
    # 1) 목록
    rows, page = [], 1
    while True:
        q = urllib.parse.urlencode({'page[size]': 200, 'page[number]': page})
        d = cached(os.path.join(CACHE, 'list', 'p%02d.json' % page), API + '/blueprints?' + q)
        rows += d['data']
        if page >= d['meta']['last_page']:
            break
        page += 1
    print('청사진 %d개' % len(rows))

    # 2) 청사진 상세 (해금 미션 · 등급 · 요구 조건)
    missions = set()
    for i, r in enumerate(rows, 1):
        d = cached(os.path.join(CACHE, 'bp', r['uuid'] + '.json'), API + '/blueprints/' + r['uuid'])
        for m in d['data'].get('unlocking_missions') or []:
            mid = (m.get('web_url') or '').rstrip('/').split('/')[-1]
            if mid:
                missions.add(mid)
        if i % 100 == 0:
            print('  상세 %d/%d' % (i, len(rows)))
    print('해금 미션 %d개' % len(missions))

    # 3) 미션 상세 (의뢰인 · 지역 · 평판 · 설명)
    for i, mid in enumerate(sorted(missions), 1):
        cached(os.path.join(CACHE, 'mission', mid + '.json'), API + '/missions/' + mid)
        if i % 50 == 0:
            print('  미션 %d/%d' % (i, len(missions)))
    print('완료')


if __name__ == '__main__':
    sys.exit(main())
