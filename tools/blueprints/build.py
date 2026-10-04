"""청사진 페이지 생성기 — fetch.py로 받은 캐시를 site용 데이터(docs/blueprints/*.json)와 페이지로 만듭니다.

사용법 (저장소 루트에서):
  python tools/blueprints/fetch.py   # 데이터 받기 (처음/게임 패치 후)
  python tools/blueprints/build.py   # 페이지 만들기

 - 데이터: Star Citizen Wiki API (api.star-citizen.wiki) — 게임 파일에서 추출한 청사진·미션 정보
 - 한국어: SC-KR 한국어 패치 global.ini (sc-kr-patch-admin) + 게임의 english/global.ini
 - 파일을 셋으로 나눠 첫 로딩을 가볍게 합니다:
     bp.json         목록·검색·필터에 필요한 것 (첫 화면에서 받음)
     bp-detail.json  품질 슬롯·스탯 변화 (상세를 처음 열 때 받음)
     missions.json   미션 브리핑 원문 (미션을 처음 펼칠 때 받음)
"""
import glob
import hashlib
import html as H
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CACHE = os.path.join(HERE, '.cache')
OUT = os.path.join(ROOT, 'docs', 'blueprints')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'wikelo'))
from game_text import _load, KO_INI, EN_INI  # noqa: E402

# ---------------------------------------------------------------- 분류
CATS = [  # (키, 한글, 해당 output.type 접두어)
    ('fps', '개인 화기', ('WeaponPersonal',)),
    ('attach', '부착물·탄창', ('WeaponAttachment',)),
    ('armor', '방어구·의류', ('Char_Armor', 'Char_Clothing')),
    ('shipwpn', '함선 무기', ('WeaponGun',)),
    ('shipcomp', '함선 부품', ('PowerPlant', 'Cooler', 'Shield', 'Radar', 'QuantumDrive')),
    ('utility', '채굴·회수·유틸', ('WeaponMining', 'MiningModifier', 'SalvageModifier', 'SalvageHead', 'TractorBeam', 'DockingCollar')),
    ('other', '기타', ()),
]
TYPE_KO = {
    'FPS Weapon': '개인 화기', 'Weapon Attachment': '부착물', 'Weapon Gun': '함선 무기', 'Power Plant': '파워 플랜트',
    'Cooler': '쿨러', 'Shield': '실드 발생기', 'Radar': '레이더', 'Quantum Drive': '퀀텀 드라이브', 'Weapon Mining': '채굴 레이저',
    'Mining Modifier': '채굴 모듈', 'Salvage Modifier': '회수 모듈', 'Salvage Head': '회수 헤드', 'Tractor Beam': '트랙터 빔',
    'Docking Collar': '도킹 칼라', 'Container': '컨테이너', 'Cargo': '화물', 'Misc': '기타',
    'Helmet (Armor)': '헬멧', 'Torso (Armor)': '몸통', 'Arms (Armor)': '팔', 'Legs (Armor)': '다리', 'Backpack (Armor)': '배낭',
    'Undersuit (Armor)': '언더슈트', 'Jacket': '재킷', 'Legs': '하의', 'Shirt': '셔츠', 'Shoes': '신발',
}
WEIGHT_KO = {'Light': '경량', 'Medium': '중형', 'Heavy': '중장갑', 'Small': '소형', 'Large': '대형', 'LightArmor': '경량'}
MISSION_TYPE_KO = {
    'Mercenary': '용병', 'Bounty Hunter': '현상금 사냥', 'Delivery': '배달', 'Investigation': '조사', 'Salvage': '회수',
    'Mining': '채굴', 'Hauling': '운송', 'Maintenance': '정비', 'Escort': '호위', 'Recovery': '회수', 'Research': '연구',
    'Courier': '배달', 'Collection': '수집', 'Search': '수색', 'Racing': '레이스', 'Personal': '개인', 'Assassination': '암살',
    'Defend': '방어', 'Priority': '우선', 'ECN Alert': 'ECN 경보', 'Ship Mining': '함선 채굴', 'Hand Mining': '손 채굴',
    'Refueling': '급유', 'Hauling - Interstellar': '성간 운송', 'Hauling - Planetary': '행성 운송', 'Hauling - Local': '근거리 운송',
    'Battaglia': '바타글리아', 'Wikelo - Vehicles': '위켈로 - 차량', 'Wikelo - Ships': '위켈로 - 함선', 'Wikelo': '위켈로',
    'Vehicle Mining': '차량 채굴', 'Medical': '의료', 'Repair': '수리', 'Smuggling': '밀수', 'Rescue': '구조',
}


def cat_of(t):
    for key, _, prefixes in CATS:
        if any(t.startswith(p) for p in prefixes):
            return key
    return 'other'


# ---------------------------------------------------------------- 한국어 이름
def strip_tags(s):
    s = re.sub(r'\s*<EM\d>.*?</EM\d>', '', s or '')
    return re.sub(r'~mission\(([A-Za-z]+)[^)]*\)', r'[\1]', s).strip()   # ~mission(TargetName) → [TargetName]


class Names:
    """패치 global.ini의 '한국어(English) · 제조사 · 크기' 형식을 풀어서 이름 사전을 만듦"""

    def __init__(self):
        self.ko = _load(KO_INI)
        self.en = _load(EN_INI)
        self.ko_lower = {k.lower(): v for k, v in self.ko.items()}
        self.by_en = {}
        for k, v in self.ko.items():
            kl = k.lower()
            if not (kl.startswith('item_name') or kl.startswith('items_commodities_')) or kl.endswith(('_desc', '_short')):
                continue
            ko, en, _ = self.split(v)
            if ko and en:
                self.by_en.setdefault(en.lower(), ko)
        # 미션 제목: 영어 제목 → 키 → 한국어
        self.title_keys = {}
        for k, v in self.en.items():
            if re.search(r'(?i)title', k):
                self.title_keys.setdefault(strip_tags(v).lower(), []).append(k)

    @staticmethod
    def split(v):
        """'옴니스키 III 대포([E-S1] Omnisky III Cannon) · Amon & Reese Co. · 사이즈S1' → (한글, 영문, [부가])
        영어 원본은 맨 뒤의 괄호 묶음(중첩 괄호 포함)."""
        from game_text import _split_ko_en
        parts = (v or '').split(' · ')
        ko, en = _split_ko_en(parts[0])
        return ko, en, parts[1:]

    def item(self, cls, en_name):
        v = self.ko_lower.get(('item_name' + (cls or '')).lower())
        if v:
            ko, _, extra = self.split(v)
            if ko:
                return ko, extra
        return self.by_en.get((en_name or '').lower()), []

    @staticmethod
    def res_key(name):
        n = (name or '').lower()
        ore = '(ore)' in n or '(raw)' in n
        base = re.sub(r'\((ore|raw)\)', '', n)
        return 'items_commodities_' + re.sub(r'[^a-z0-9]+', '_', base).strip('_') + ('_ore' if ore else '')

    def resource(self, name):
        v = self.ko_lower.get(self.res_key(name))
        ko = self.split(v)[0] if v else None
        return ko or self.by_en.get((name or '').lower())

    def resource_desc(self, name):
        v = self.ko_lower.get(self.res_key(name) + '_desc')
        return re.sub(r'\(.*$', '', v, flags=re.S).strip() if v else None

    def resource_locations(self, name):
        """자원 설명 끝의 'Locations:' 목록 (패치 설명에 영어 원문으로 들어 있음)"""
        key = self.res_key(name)
        for v in (self.ko_lower.get(key + '_desc'), self.en.get(key + '_desc')):
            if v and 'Locations:' in v:
                block = v.split('Locations:', 1)[1].split('<EM3>', 1)[0]
                locs = [x.strip(' -') for x in block.replace('\\n', '\n').split('\n') if x.strip(' -')]
                locs = [re.sub(r'[\)<].*$', '', x).strip() for x in locs]
                return [x for x in locs if x][:24]
        return []

    def mission(self, title):
        keys = self.title_keys.get(strip_tags(title).lower(), [])
        for k in keys:
            if k in self.ko:
                ko = strip_tags(self.ko[k])
                desc = None
                for dk in (re.sub(r'(?i)title', 'Description', k), re.sub(r'(?i)title', 'Desc', k), re.sub(r'(?i)title', 'desc', k)):
                    if dk != k and dk in self.ko:
                        desc = self.ko[dk]
                        break
                return ko, desc
        return None, None


# ---------------------------------------------------------------- 빌드
def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def build():
    rows = [r for f in sorted(glob.glob(os.path.join(CACHE, 'list', 'p*.json'))) for r in load_json(f)['data']]
    if not rows:
        sys.exit('먼저 python tools/blueprints/fetch.py 를 실행하세요.')
    names = Names()
    print('청사진 %d개, 한국어 사전 %d개' % (len(rows), len(names.ko)))

    ing_index, ings = {}, []          # 재료 사전
    ms_index, ms_list, ms_desc = {}, [], {}
    bps, details = [], {}
    labels = set()

    def ing_id(name, kind):
        key = (kind, name)
        if key not in ing_index:
            ing_index[key] = len(ings)
            e = {'n': name, 'kind': kind}
            ko = names.resource(name) if kind == 'resource' else names.item(None, name)[0]
            if ko:
                e['k'] = ko
            if kind == 'resource':
                loc = names.resource_locations(name)
                if loc:
                    e['loc'] = loc
                desc = names.resource_desc(name)
                if desc:
                    e['desc'] = desc
            ings.append(e)
        return ing_index[key]

    def mission_id(mid):
        if mid in ms_index:
            return ms_index[mid]
        path = os.path.join(CACHE, 'mission', mid + '.json')
        if not os.path.exists(path):
            return None
        m = load_json(path)
        m = m.get('data', m)
        ko, ko_desc = names.mission(m.get('title'))
        fac = m.get('faction') or {}
        pre = m.get('reputation_prerequisite') or {}
        e = {
            'n': strip_tags(m.get('title')), 'type': m.get('mission_type'), 'giver': m.get('mission_giver') or fac.get('name'),
            'fac': fac.get('name'), 'law': fac.get('lawful'), 'ill': bool(m.get('illegal')),
            'sys': [s.get('name') if isinstance(s, dict) else s for s in (m.get('star_systems') or [])],
            'rep': m.get('reputation_amount'), 'min': (pre.get('min_standing') or {}).get('name'),
            'share': m.get('shareable'), 'once': m.get('once_only'),
            'time': m.get('time_to_complete_minutes'),
            'enemy': [m.get('enemy_count_min'), m.get('enemy_count_max')] if m.get('enemy_count_max') else None,
            'scope': m.get('reward_scope'),
        }
        area = re.search(r'Area of Operation:\s*([^\n\\]+)', m.get('description') or '')
        if area:
            e['area'] = area.group(1).strip()
        # 성계: star_systems → 내부 이름(…_Nyx_…) → 브리핑의 작전 지역 순으로 판단
        systems = [s for s in ('Stanton', 'Pyro', 'Nyx') if s in e['sys']]
        if not systems:
            hint = (m.get('debug_name') or '') + ' ' + (e.get('area') or '')
            systems = [s for s in ('Stanton', 'Pyro', 'Nyx') if re.search(r'(?i)(^|[_\s])' + s + r'([_\s]|$)', hint)]
        e['sys'] = systems
        # 미션이 뜨는 장소 (Availability)
        locs, seen = [], set()
        for loc in ((m.get('merged_locations') or {}).get('Availability') or []) if isinstance(m.get('merged_locations'), dict) else []:
            nm = loc.get('name')
            if nm and nm not in seen and nm.replace(' System', '') not in ('Stanton', 'Pyro', 'Nyx'):
                seen.add(nm)
                locs.append(nm)
        if locs:
            e['at'] = locs[:10]
            if len(locs) > 10:
                e['atn'] = len(locs)
        if ko:
            e['k'] = ko
        ms_index[mid] = len(ms_list)
        ms_list.append({k: v for k, v in e.items() if v not in (None, [], '')})
        ms_desc[ms_index[mid]] = {'ko': ko_desc, 'en': m.get('description')}
        return ms_index[mid]

    skipped = 0
    for r in rows:
        if re.search(r'(?i)placeholder', (r.get('output_name') or '') + ' ' + ((r.get('output') or {}).get('name') or '')):
            skipped += 1   # 게임 데이터의 미완성 항목
            continue
        dpath = os.path.join(CACHE, 'bp', r['uuid'] + '.json')
        d = load_json(dpath)['data'] if os.path.exists(dpath) else r
        out = d.get('output') or {}
        t = out.get('type') or ''
        ko, extra = names.item(d.get('output_class'), d.get('output_name'))
        bp = {
            'u': d['uuid'][:8], 'n': d.get('output_name') or out.get('name') or re.sub(r'^BP_CRAFT_', '', d.get('key') or '').replace('_', ' '), 'c': cat_of(t), 't': out.get('type_label'),
            'w': out.get('sub_type'), 'g': out.get('grade'), 'tm': d.get('craft_time_seconds'),
            'i': [[ing_id(x['name'], x['kind']), x.get('quantity_scu') if x.get('quantity_scu') is not None else x.get('quantity'),
                   1 if x.get('quantity_scu') is not None else 0] for x in d.get('ingredients') or []],
        }
        if ko:
            bp['k'] = ko
        if extra:
            bp['x'] = [re.sub(r'\s+', ' ', strip_tags(x)) for x in extra][:2]
        if d.get('is_available_by_default'):
            bp['d'] = 1
        ms = []
        for m in d.get('unlocking_missions') or []:
            mid = (m.get('web_url') or '').rstrip('/').split('/')[-1]
            idx = mission_id(mid) if mid else None
            if idx is not None:
                ms.append([idx, m.get('chance')])
        if ms:
            bp['m'] = ms
            regions = sorted({s for idx, _ in ms for s in ms_list[idx].get('sys', [])}, key=['Stanton', 'Pyro', 'Nyx'].index)
            if regions:
                bp['r'] = regions
        bps.append(bp)

        # 상세: 품질 슬롯과 스탯 변화
        slots = []
        for a in (d.get('aspects') or {}).get('aspects') or []:
            inp = a.get('input') or {}
            mods = []
            for mo in a.get('modifiers') or []:
                rg = mo.get('modifier_range') or {}
                mods.append([mo.get('label'), rg.get('at_min_quality'), rg.get('at_max_quality'), mo.get('better_when')])
                labels.add(mo.get('label'))
            labels.add(a.get('name'))
            slots.append({'s': a.get('name'), 'in': ing_id(inp['name'], inp['kind']) if inp.get('name') else None,
                          'q': inp.get('quantity_scu') if inp.get('quantity_scu') is not None else inp.get('quantity'),
                          'scu': 1 if inp.get('quantity_scu') is not None else 0, 'mq': inp.get('min_quality'), 'mod': mods})
        dis = d.get('dismantle') or {}
        details[bp['u']] = {k: v for k, v in {
            'slots': slots, 'dt': dis.get('time_seconds'), 'eff': dis.get('efficiency'),
            'ret': [[ing_id(x['name'], 'resource'), x.get('quantity_scu')] for x in d.get('dismantle_returns') or []],
        }.items() if v}

    if skipped:
        print('  미완성(PLACEHOLDER) 항목 %d개 제외' % skipped)

    # 결과물 이미지 (위키 문서 대표 이미지, 라이선스 확인)
    import images as IMG
    found = IMG.find_images([b['n'] for b in bps])
    files = IMG.download(found)
    for b in bps:
        f = files.get(b['n'])
        if f:
            b['im'] = f
            details.setdefault(b['u'], {})['ic'] = [found[b['n']]['credit'], found[b['n']]['license'], found[b['n']]['wikifile']]
    print('  이미지 %d/%d개' % (sum(1 for b in bps if b.get('im')), len(bps)))
    counts = {}
    for b in bps:
        counts[b['c']] = counts.get(b['c'], 0) + 1
    os.makedirs(OUT, exist_ok=True)
    meta = {'cats': [[k, ko, counts.get(k, 0)] for k, ko, _ in CATS if counts.get(k)], 'typeKo': TYPE_KO, 'weightKo': WEIGHT_KO,
            'mtypeKo': MISSION_TYPE_KO, 'version': rows[0].get('game_version'), 'built': date.today().isoformat()}
    files = {
        'bp.json': {'meta': meta, 'bps': bps, 'ing': ings, 'ms': ms_list},
        'bp-detail.json': details,
        'missions.json': ms_desc,
    }
    for name, obj in files.items():
        with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        print('  %s %.0f KB' % (name, os.path.getsize(os.path.join(OUT, name)) / 1024))
    print('  미션 %d개 (한글 제목 %d개), 재료 %d종 (한글 %d종), 한글 아이템 이름 %d/%d' % (
        len(ms_list), sum(1 for m in ms_list if m.get('k')), len(ings), sum(1 for i in ings if i.get('k')),
        sum(1 for b in bps if b.get('k')), len(bps)))
    with open(os.path.join(HERE, '.labels.json'), 'w', encoding='utf-8') as f:
        json.dump(sorted(x for x in labels if x), f, ensure_ascii=False, indent=0)
    write_page(meta, len(bps))


def write_page(meta, total):
    h = hashlib.md5()
    for name in ('blueprints.js', 'blueprints.css', 'bp.json'):
        p = os.path.join(OUT, name)
        if os.path.exists(p):
            h.update(open(p, 'rb').read())
    tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
    page = (tpl.replace('{{VER}}', h.hexdigest()[:8]).replace('{{TOTAL}}', str(total))
               .replace('{{GAMEVER}}', H.escape(meta.get('version') or '')).replace('{{UPDATED}}', meta['built']))
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    print('완료: docs/blueprints/index.html')


if __name__ == '__main__':
    sys.exit(build())
