"""게임 문자열(global.ini)에서 위켈로 계약 · 재료 획득 미션의 한국어/영어 이름과 설명을 가져옵니다 — build.py에서 사용.

 - 한국어: SC-KR 한국어 패치 (sc-kr-patch-admin/global.ini) — 게임 속 번역과 같은 문구
 - 영어:   게임 설치 폴더의 english/global.ini
 경로는 환경 변수 SCKR_KO_INI / SCKR_EN_INI 로 바꿀 수 있습니다. 파일이 없으면 이 기능만 건너뜁니다.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
KO_INI = os.environ.get('SCKR_KO_INI') or os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))), 'sc-kr-patch-admin', 'global.ini')
EN_INI = os.environ.get('SCKR_EN_INI') or r'C:\Program Files\Roberts Space Industries\StarCitizen\LIVE\data\Localization\english\global.ini'

# 위키 계약 이름과 게임 키가 자동으로 안 맞는 경우 (새 계약이라 영어 파일에 없거나, 도색 3종이 한 계약을 공유)
CONTRACT_KEYS = {
    'Too Much Gun': 'TheCollector_Recipes_Title_aparGatlingGun',
    'Heavy and Bright': 'TheCollector_Recipes_Title_SuperHeavyCombat',
    'Clipper Fight Now': 'TheCollector_Recipes_Title_DrakeClipper',
    'ATLS Cool Metal Color': 'TheCollector_Menu_Title_WalkerSk',
    'ATLS Orange Line': 'TheCollector_Menu_Title_WalkerSk',
    'ATLS Snowland Color': 'TheCollector_Menu_Title_WalkerSk',
}

# 게임 데이터의 키 오타로 제목·설명 키가 다른 경우
DESC_KEYS = {'TheCollector_Ships_F8C_Milt_TItle': 'TheCollector_Ships_F8C_Mil_Desc'}

# 재료를 얻을 수 있는 미션 (위키의 획득 정보 기준) — 재료 위키 문서 이름: [(미션 키 접두어, 의뢰인 한글, 의뢰인 영문, 지역)]
_HYPERION = [('Hockrow_FacilityDelve_P3M1', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설 (Pyro)')]
_ONYX = [('Hockrow_FacilityDelve_P1M1', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P1M2', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P1M3', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P2M1', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P2M2', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P2M3', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설'),
         ('Hockrow_FacilityDelve_P2M4', '호크로우 기관', 'Hockrow Agency', 'ASD 오닉스 시설')]
_SMUGGLERS = [('Kaboos_Intro', '인터섹', 'InterSec', '닉스(Nyx) 성계'),
              ('Kaboos_Mission', '인터섹', 'InterSec', '닉스(Nyx) 성계')]
MATERIAL_MISSIONS = {
    'Vanduul Plating': _SMUGGLERS,
    'Vanduul Metal': _SMUGGLERS,
    'ASD Secure Drive': _ONYX,
    **{'RCMBNT-%s-%d' % (t, n): _HYPERION for t in ('PWL', 'RGL', 'XTL') for n in (1, 2, 3)},
}


def _load(path):
    d = {}
    if not os.path.exists(path):
        return d
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        for line in f:
            if '=' in line:
                k, v = line.rstrip('\r\n').split('=', 1)
                d[k.split(',')[0]] = v   # 'key,P=...' 형식도 같은 키로
    return d


def _strip(s):
    return re.sub(r'\s*<EM\d>\[[^<]*\]</EM\d>', '', s or '').strip()


def _rep(s):
    m = re.search(r'\[(\d+)\s*(?:Rep|평판)\]', s or '')
    return int(m.group(1)) if m else None


def _norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


class GameText:
    def __init__(self):
        self.ko = _load(KO_INI)
        self.en = _load(EN_INI)
        self.ok = bool(self.ko)

    def _pick(self, *keys):
        for k in keys:
            if k in self.ko or k in self.en:
                return k
        return None

    def _entry(self, title_key, desc_key, en_fallback=''):
        ko_t, en_t = self.ko.get(title_key, ''), self.en.get(title_key, '')
        return {
            'key': title_key,
            'ko': _strip(ko_t) or None,
            'en': _strip(en_t) or en_fallback or None,
            'rep': _rep(en_t) or _rep(ko_t),
            'ko_desc': self.ko.get(desc_key) if desc_key else None,
            'en_desc': self.en.get(desc_key) if desc_key else None,
        }

    def contract(self, name):
        """위키 계약 이름 → 게임 속 한국어/영어 제목·설명"""
        if not self.ok:
            return None
        key = CONTRACT_KEYS.get(name)
        if not key:
            want = _norm(name)
            for k in set(self.en) | set(self.ko):
                if re.match(r'(?i)^TheCollector.*title', k) and _norm(_strip(self.en.get(k, ''))) == want:
                    key = k
                    break
        if not key:
            return None
        cands = [re.sub(r'_T[Ii]tle$', '_Desc', key), re.sub(r'_T[Ii]tle$', '_Dec', key),
                 key.replace('_Title_', '_Desc_'), key.replace('_Title_', '_'), re.sub(r'_T[Ii]tle(_\d+)$', r'_Desc\1', key)]
        desc = DESC_KEYS.get(key) or self._pick(*[k for k in cands if k != key])
        return self._entry(key, desc, name)

    def missions_for(self, item_key):
        """재료 → 얻을 수 있는 미션 목록"""
        out = []
        if not self.ok:
            return out
        for prefix, giver_ko, giver_en, where in MATERIAL_MISSIONS.get(item_key, []):
            tkey = self._pick(prefix + '_Title', prefix + '_title')
            if not tkey:
                continue
            dkey = self._pick(prefix + '_Description', prefix + '_desc', prefix + '_Desc')
            e = self._entry(tkey, dkey)
            e.update({'giver_ko': giver_ko, 'giver_en': giver_en, 'where': where})
            out.append(e)
        return out
