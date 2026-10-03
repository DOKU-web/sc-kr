"""위켈로 계약에 나오는 아이템(재료·보상) 상세 정보 수집 — build.py에서 사용.

각 위키 문서에서 뽑는 것
 - 이미지(+라이선스), 부제, 희귀도, 정보 상자(제조사·크기·종류 등)
 - 첫 문단 요약, 게임 내 설명
 - 획득 방법(채굴/채집/구매/전리품/제작/후원 여부), 상점·채굴지·전리품 표, 직접 적힌 획득 목록
"""
import html as H
import json
import os
import re
import time

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')


def _clean(x):
    x = re.sub(r'<sup[^>]*class="[^"]*reference[^"]*".*?</sup>', '', x, flags=re.S)
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()


def fetch_html(get, title):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, re.sub(r'[^A-Za-z0-9]+', '_', title)[:120] + '.json')
    if os.path.exists(path):
        return json.load(open(path, encoding='utf-8'))
    r = get({'action': 'parse', 'page': title, 'prop': 'text', 'redirects': 1, 'disableeditsection': 1})
    data = {'title': r['parse']['title'], 'html': r['parse']['text']} if 'parse' in r else None
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    time.sleep(0.25)   # 위키 서버 배려
    return data


def _section(t, sid):
    i = t.find('id="%s"' % sid)
    if i < 0:
        return ''
    j = t.find('<div class="mw-heading mw-heading2"', i + 10)
    return t[i:j if j > 0 else None]


def _tables(seg, max_rows=12):
    out = []
    for m in re.finditer(r'<table[^>]*>(.*?)</table>', seg, re.S):
        body = m.group(1)
        cap = re.search(r'<caption>(.*?)</caption>', body, re.S)
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S)
        if not rows:
            continue
        head = [_clean(h) for h in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)]
        data = []
        for r in rows[1:]:
            cells = [_clean(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)]
            if not any(cells):
                continue
            if '<td' not in r and not data:   # 제목 행이 두 줄인 표: 아래 줄을 머리글로
                head = cells
                continue
            data.append(cells)
        if data:
            out.append({'caption': _clean(cap.group(1)) if cap else '', 'head': head,
                        'rows': data[:max_rows], 'more': max(0, len(data) - max_rows)})
    return out


def parse_item(html, title):
    t = re.sub(r'<style.*?</style>', '', html, flags=re.S)
    t = re.sub(r'<link [^>]*>', '', t)
    item = {'title': title}

    # 정보 상자
    box = re.search(r'<div class="t-infobox[ "].*?(?=<p>|<div class="mw-heading)', t, re.S)
    if box:
        b = box.group(0)
        img = re.search(r'<span class="pageimage"[^>]*><a href="/File:([^"]+)"', b)
        if img:
            item['image'] = H.unescape(img.group(1))
        sub = re.search(r'class="t-infobox-subtitle">(.*?)</div>', b, re.S)
        if sub:
            item['subtitle'] = _clean(sub.group(1))
        rar = re.search(r'rarity-badge--([a-z]+)', b)
        if rar:
            item['rarity'] = rar.group(1)
        info = [{'label': '', 'items': []}]
        for sec in re.finditer(r'<div class="t-infobox-section-label"[^>]*>(.*?)</div>|<dl class="t-infobox-section-items[^"]*">(.*?)</dl>', b, re.S):
            if sec.group(1) is not None:
                info.append({'label': _clean(sec.group(1)), 'items': []})
                continue
            for it in re.finditer(r'<dt class="t-infobox-item-label">(.*?)</dt><dd class="t-infobox-item-content">(.*?)</dd>', sec.group(2), re.S):
                k, v = _clean(it.group(1)), _clean(it.group(2))
                if k and v and len(v) < 120:
                    info[-1]['items'].append([k, v])
        SKIP = ('Metadata', 'External sites', 'Cargo dimensions', 'Dimensions', 'Development', 'Cost', 'Lore')
        for s in info:   # 같은 항목 중복 제거
            seen, uniq = set(), []
            for k, v in s['items']:
                if k not in seen:
                    seen.add(k)
                    uniq.append([k, v])
            s['items'] = uniq[:10]
        info = [s for s in info if s['items'] and s['label'] not in SKIP]
        item['info'] = info[:4]

    # 첫 문단 요약
    body = t[box.end():] if box else t
    for p in re.findall(r'<p>(.*?)</p>', body, re.S):
        txt = _clean(p)
        if len(txt) > 20:
            item['lead'] = txt
            break

    # 게임 내 설명
    d = _section(t, 'Description')
    if d:
        txt = _clean(re.sub(r'^.*?</h2>', '', d, flags=re.S))
        txt = re.sub(r'\s*\d+\.\d+\.\d+-[A-Z]+\.\d+\s*$', '', txt)   # 끝의 빌드 번호 제거
        if txt:
            item['desc'] = txt

    # 획득 방법
    a = _section(t, 'Acquisition')
    if a:
        flags = {}
        for m in re.finditer(r'<div class="t-entity-availability-summary-item[^"]*" data-state="(\w+)"><dt[^>]*>.*?</span>([^<]+)</dt>', a, re.S):
            flags[m.group(2).strip()] = m.group(1)
        item['acq'] = flags
        cards = []
        for m in re.finditer(r'<div class="t-card t-collapsible-card">(.*?)(?=<div class="t-card t-collapsible-card">|$)', a, re.S):
            c = m.group(1)
            title_m = re.search(r'class="t-card&#95;&#95;title">(.*?)</div>', c, re.S)
            desc_m = re.search(r'class="t-card&#95;&#95;description">(.*?)</div>', c, re.S)
            ctitle = _clean(title_m.group(1)) if title_m else ''
            cdesc = _clean(desc_m.group(1)) if desc_m else ''
            tables = _tables(c)
            if tables or (cdesc and 'No ' not in cdesc):
                cards.append({'title': ctitle, 'desc': cdesc, 'tables': tables})
        item['acq_cards'] = cards
        # 직접 적힌 목록 (예: Contract Lootables)
        lists = []
        for m in re.finditer(r'<h[34][^>]*>(.*?)</h[34]>.*?<ul>(.*?)</ul>', a, re.S):
            lis = [_clean(li) for li in re.findall(r'<li>(.*?)</li>', m.group(2), re.S)]
            if lis:
                lists.append({'title': _clean(m.group(1)), 'items': lis[:15]})
        item['acq_lists'] = lists

    # 채집 위치 표 (문서에 따로 있는 경우)
    hv = _section(t, 'Harvest_locations')
    if hv:
        item['harvest'] = _tables(hv)
    return item
