# SC-KR 웹사이트 V2 — Premium Glass UI

`docs/`(GitHub Pages)를 빌드 없는 정적 사이트 구조 그대로 리디자인했습니다.
React/Framer Motion으로 옮기지 않은 이유는 `editor.js`(콘텐츠 편집)가 `docs/index.html`을 GitHub API로 직접 고쳐 커밋하는 구조라서입니다. 빌드 단계가 생기면 이 기능이 깨집니다.
애니메이션은 CSS transition/animation과 IntersectionObserver, View Transitions API로 구현했습니다.

## 바뀐 파일

| 파일 | 내용 |
|---|---|
| `docs/styles.css` | 디자인 시스템 전체 재작성 (토큰, Glass, 버튼, 내비, Bento, 모달, 반응형, 모션). 서브페이지가 쓰는 변수·클래스 이름은 유지 |
| `docs/index.html` | 섹션 재구성: Hero → 기능 Bento → 런처 쇼케이스 → 설치 → 업데이트 → 다운로드 → 커뮤니티(번역팀·파트너·후기·디스코드) → 푸터 |
| `docs/script.js` | 문구(KO/EN) 추가, Bento 크기 계산, 기능 상태 배지, 릴리스 목록 연동(업데이트 내역·날짜·다운로드 링크), 탭 필터 |
| `docs/ui.js` (신규) | 내비 활성 표시·스크롤 반응, 기능 상세 모달, 카드 포인터 조명, 히어로 패럴랙스 |
| `docs/editor.js` | 기능 추가 폼에 `상태`(제공 중/베타/개발 예정), `추가된 버전` 선택 항목 |
| `docs/wikelo/index.html`, `docs/blueprints/index.html` | 새 메뉴 구성으로 내비 통일, 캐시 버전 갱신 (본문 수정 없음) |
| `docs/sitemap.xml` | lastmod 갱신 |

## 유지한 것

- 다운로드: 모든 `.js-download` 링크의 기본값은 그대로 `releases/latest/download/SC-KR-Launcher.exe`. 릴리스 API가 응답하면 **SC-KR-Launcher.exe가 첨부된 가장 최근 릴리스**의 링크로 바꿉니다. 언어팩(`pack-*`) 릴리스가 'latest'가 되는 경우에도 깨지지 않습니다.
- 버전 표시: 예전처럼 `launcher_version.txt` / `version.txt`가 기준입니다.
- 콘텐츠 편집: `features-data` / `crew-data` / `partners-data` JSON 블록과 `<!--static:…-->` 블록 형식이 같습니다. 저장 정규식을 시뮬레이션해 결과가 동일한지 확인했습니다.
- 관리자 패널, 비밀번호 게이트, 릴리스 업로드, 후기(reviews 브랜치), 배경음, 별 배경(space.js), KO/EN 전환, SEO 메타·JSON-LD·canonical, 비공식 고지.
- API 호출: 릴리스 API를 2번(latest, 목록)이 아니라 **1번**만 부르고 10분간 캐시합니다. 기존 캐시 키를 그대로 써서 업로드 후 캐시를 지우는 동작도 유지됩니다.

## 콘텐츠 추가 (기능 카드 3개)

릴리스 노트에서 확인된 기능만 추가했습니다: 커뮤니티·파티 모집(v5.0), 친구·1:1 채팅 번역(v5.0), 음성 명령(v4.4).
모두 '제공 중'입니다. '개발 예정' 기능은 현재 없습니다. 필요하면 콘텐츠 편집에서 상태를 골라 추가하면 됩니다.

## 디자인 토큰 (styles.css `:root`)

- 색상: Background `#080D16`, Surface `#101A29`, Primary `#68D9FF`, Secondary `#7B8CFF`, Text `#F3F7FC` / `#A9B7C8`, Border `rgba(255,255,255,.12)`
- 모서리: 8 / 12 / 20(카드) / 26(패널) / 32(대형 패널) / pill
- 간격: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
- 모션: `--ease-out: cubic-bezier(.22,1,.36,1)`, 160 / 320 / 640ms

## 컴포넌트 클래스

- `.glass`: 반투명 유리 + 그라데이션 테두리 + 상단 하이라이트
- `.glass-strong`: 더 진하고 큰 패널
- `.glass-card`: 호버 시 떠오름, 테두리 빛, 빛 스윕, 포인터 반사광
- `.btn-primary` / `.btn-glass` / `.btn-ghost` × `.btn-sm` / `.btn-lg`
- `.badge-live` / `.badge-beta` / `.badge-soon`
- `.tabs`(움직이는 인디케이터), `.modal`(`<dialog>`), `.reveal`(스크롤 등장, 그리드는 자식 순차 등장), `.seq`(히어로 순차 등장)

## 애니메이션 원칙

transform과 opacity만 움직이고, 반복 애니메이션은 기존 배경(성운)과 로딩 스켈레톤뿐입니다.
`prefers-reduced-motion`이면 모든 등장 효과, 패럴랙스, 페이지 전환을 끕니다. 터치 기기에서는 포인터 조명과 패럴랙스 포인터 효과를 끄고, 모바일에서는 블러 강도와 그림자를 줄입니다.
backdrop-filter를 지원하지 않는 브라우저에서는 불투명 표면(`--glass-solid`)으로 바뀝니다.

## 확인한 것 (Headless Chromium)

- 1440 / 1280 / 1024 / 820 / 390px 레이아웃, 가로 스크롤 0
- 실시간 GitHub 데이터: 런처 v5.5 · 언어팩 v3.3 · 62.3 MB · 업데이트 6건
- 모바일 메뉴 열고 닫기, 모달(클릭·Esc·닫기), 업데이트 탭 필터, KO/EN 전환, 스크롤 연동 내비
- 편집 모드: 폼 표시, 삭제 버튼이 모달 대신 확인창을 엶
- 동작 줄이기 모드, axe-core WCAG 2 A/AA 위반 0건
- JS 콘솔 오류 0건 (작업 환경에서 Google Fonts/YouTube가 막혀 생긴 네트워크 오류 제외)

## 확인하지 못한 것

- 실제 iOS Safari·Firefox 기기
- 실제 폰트(IBM Plex/Sora) 적용 상태 (작업 환경에서 Google Fonts가 막혀 대체 폰트로 렌더링)
- 실제 콘텐츠 저장 커밋

## 추가로 있으면 좋은 에셋

1. **실제 런처 스크린샷** (가로 1600×1000 이상, webp): `docs/img/launcher-screenshot.webp`에 넣고 `index.html`의 `.mock` 블록을 주석에 적힌 `<img>`로 바꾸면 됩니다. 지금은 "실제 화면과 다를 수 있음"이라고 표시한 일러스트입니다.
2. 히어로용 우주선·행성 이미지: 사용 권한이 확인된 것이어야 합니다 (CIG 팬 키트 조건 확인 필요). 지금은 NASA 퍼블릭 도메인 사진을 씁니다.
3. og-image 새 디자인 (1200×630)

## 로컬 실행 · 배포

```bash
cd docs && python3 -m http.server 8000   # http://localhost:8000
```

배포는 기존과 같습니다. `main`에 머지하면 GitHub Pages(`docs/`)가 1~2분 뒤 반영합니다. 빌드는 필요 없습니다.
