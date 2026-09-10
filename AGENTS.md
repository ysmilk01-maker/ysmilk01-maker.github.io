# 나인투식스랩 홈페이지 — 작업 안내

이 저장소는 https://ysmilk01-maker.github.io 다. `main` 에 푸시하면 GitHub Pages 가
1~2분 안에 그대로 내보낸다. 빌드 단계도, 프레임워크도, npm 도 없다. HTML·CSS·JS
파일이 곧 사이트다.

혼자 만드는 1인 스튜디오의 사이트다. 토스 미니앱 세 개와 웹 게임 세 개를 소개한다. 코드에 있는
한국어 주석은 장식이 아니라 「왜 이렇게 했는지」의 기록이다 — 고칠 때 주석이 말하는
이유가 여전히 맞는지 먼저 읽고, 바뀌면 주석도 같이 바꾼다.

## 파일이 하는 일

| 파일 | 역할 |
| --- | --- |
| `index.html` | 메인. 로고 연출 → 첫 화면(글 + 유리 조형물) → 앱 격자 → 만드는 방식 → 꼬리말 |
| `apps/*.html` | **생성 파일.** `tools/build_pages.py` 가 만든다. 손으로 고치지 않는다 |
| `tools/build_pages.py` | 상세 페이지의 내용과 틀(소개 6개 + 기존 사주 주소 유지). 글을 고치려면 여기 `APPS` 를 고치고 `python tools/build_pages.py` |
| `tools/detail.css` | 상세 페이지 전용 CSS. 빌드가 `style.css` 의 「상세 페이지 · 본문」 표식 아래에 갈아 끼운다 |
| `style.css` | 전체 스타일. `:root` 토큰이 색·글꼴·크기의 유일한 출처 |
| `site.js` | 등장 연출. GSAP 이 있으면 GSAP, 없으면 IntersectionObserver. 메인·상세 공용 |
| `app.js` | 상세의 실시간 랭킹. Supabase 공개 뷰를 읽어 채운다. 못 읽으면 구역을 뺀다 |
| `privacy.html` | 개인정보처리방침 |
| `img/` | 앱 스크린샷(`*.png` 1170×2532), 스토어 샷(`shots/*.webp`), 첫 화면 조형물(`hero/*.webp`), 게임 실제 화면(`games/*.webp`) |
| `lab/` | **건드리지 않는다.** 슈팅게임·스도쿠 웹 빌드가 사는 곳이고 다른 작업 흐름이 쓴다 |
| `threads-*.html` | 쓰레드 API 앱 등록용 정적 페이지. 손댈 일 없음 |

## 지켜야 하는 것

**기술**
- 의존성은 GSAP 3.15.0 (jsDelivr, 버전 고정) 하나. 새 라이브러리는 넣지 않는다.
  GSAP 이 안 실려도 페이지가 그대로 돌아야 한다 — `site.js` 의 두 갈래 구조를 깨지 말 것
- `prefers-reduced-motion: reduce` 에서는 모든 움직임이 멈추고 내용은 다 보여야 한다
- 색은 `:root` 토큰만 쓴다. 새 색이 필요하면 토큰을 추가한다. 캡션·안내 글자는
  `--muted-dim`(검정 위 4.94:1) — 이보다 어두운 글자색을 만들지 않는다
- 키보드: `outline: none` 금지. GSAP 에서 `autoAlpha` 금지(visibility: hidden 이
  포커스를 막는다) — `opacity` 만 쓴다. 인터랙티브 요소의 누르는 영역은 24px 이상
- 이미지는 커밋 전에 WebP 로 줄인다. 원본 PNG(수 MB)는 커밋하지 않는다
- 상세 페이지 랭킹은 Supabase 공개 뷰 `ranking`·`krx_ranking` 을 publishable key 로
  읽기만 한다. 쓰는 코드는 만들지 않는다. 키는 앱 번들에도 있는 공개 값이다

**글**
- 존댓말, 짧게, 한 문장에 하나. 「~할 수 있습니다」보다 「~합니다」
- 투자 조언·수익 보장·종목 추천에 해당하는 말은 쓰지 않는다. 코인·주식 앱 페이지의
  「알아둘 것」 절은 이 이유로 있다 — 줄이지 말 것
- 앱에 없는 기능이나 없는 실적을 쓰지 않는다. 숫자는 실측한 것만
- 영어 라벨을 섞지 않는다(예: "SCROLL" 같은 것)

**디자인**
- 검정 바탕, Pretendard, `word-break: keep-all`. 앱마다 색이 하나씩 있고(`--coin`
  `--krx` `--saju` `--ai` `--sudoku` `--beatwave` `--shooter`) 그 색은 그 앱의 카드·페이지 안에서만 켠다
- 구역은 얇은 선 하나로 나눈다. 카드를 겹겹이 쌓지 않는다
- 움직임은 「있어야 이유가 설명되는」 것만. 고빈도 인터랙션엔 150ms 이하

## 공통 파일 버전 갱신

`style.css`·`site.js`·`app.js`를 바꾼 뒤에는 아래 명령을 실행한다. 파일 내용의
SHA-256 앞 12자리를 `?v=`에 붙여 인앱 브라우저가 새 파일을 받게 한다.

```bash
python tools/cache_bust.py
```

상세 내용이나 `tools/detail.css`를 고쳤다면 `python tools/build_pages.py`를 실행한다.
이 빌드는 CSS를 합친 뒤 버전 갱신까지 한다. 메인·개인정보·모든 상세 페이지가 대상이며
`lab/`과 외부 CDN 주소는 건드리지 않는다. 같은 내용이면 버전도 그대로다.

푸시 직전, `git pull --rebase` 뒤에도 `python tools/cache_bust.py --check`로 확인한다.
이 명령은 파일을 고치지 않으며, 갱신이 필요하면 종료 코드 1을 돌려준다.

## 고치고 나서 확인하는 법

```bash
# 로컬 서버 (원하는 포트)
python -m http.server 8770 --bind 127.0.0.1
```

Playwright CLI 가 깔려 있다(`playwright-cli`). 헤드리스라 사용자 브라우저를 안 건드린다.

```bash
playwright-cli -s=chk open http://127.0.0.1:8770/index.html
playwright-cli -s=chk resize 390 844          # 폰
playwright-cli -s=chk screenshot --filename=out.png
playwright-cli -s=chk console error           # 반드시 0
playwright-cli -s=chk close
```

푸시 전 체크리스트:
- [ ] `python tools/cache_bust.py --check` 통과
- [ ] 콘솔 오류·경고 0 (메인 + 상세 하나)
- [ ] 320·390·1280px 에서 가로 넘침 0
- [ ] Tab 만으로 앱 카드까지 닿고 포커스 링이 보인다
- [ ] `prefers-reduced-motion: reduce` 에서 내용이 다 보인다
- [ ] 새 글자색이 있으면 대비를 실측했다(4.5:1)
- [ ] `apps/*.html` 을 고쳤다면 `tools/build_pages.py` 를 고친 것이다
- [ ] 저장소 안에 `.playwright-cli/`·스크린샷이 남아 있지 않다

## 커밋

한국어. 제목 한 줄에 무엇을, 본문에 왜를. `main` 에 바로 푸시한다 — 1인 프로젝트라
브랜치를 안 쓴다. 다른 작업 흐름이 `lab/` 을 같은 저장소에 푸시하므로 푸시 전에
`git pull --rebase` 를 한다.

## 지금 상태와 남은 일

`docs/STATUS.md` 에 있다. 시작하기 전에 읽는다.
