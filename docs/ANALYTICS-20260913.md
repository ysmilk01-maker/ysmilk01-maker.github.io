# 홈페이지 방문 분석 — 2026-09-13

- Google Analytics 계정: 나인투식스랩 (`407772490`).
- 속성: 나인투식스랩 홈페이지 (`553931592`). 대한민국 시간 / 대한민국 원.
- 웹 스트림: 나인투식스랩 웹사이트 (`15767188918`), `https://ninetosixlab.com`.
- 측정 ID: `G-622TW2X538`.
- 초기 분석 목표: 웹·앱 트래픽 파악, 사용자 참여·유지율.
- 계정 생성 시 선택적 데이터 공유 네 항목은 모두 해제했다.

## 설치 원본과 배포

`wordpress/ntsl-site/ntsl-site.php`의 `wp_head` 훅이 정적 페이지와 워드프레스 블로그에
Google 태그를 한 번 삽입한다. 실제 홈페이지 도메인에서만 활성화하고,
관리·피드·robots·미리보기 요청은 제외한다. `lab/` 게임에는 삽입하지 않는다.

Google 신호 데이터와 광고 개인 최적화 신호는 태그 설정에서 껐다.
기본 페이지 조회와 웹 스트림에서 활성화한 향상된 측정을 사용한다.
방문자의 이름·이메일·전화번호 또는 앱 내부 기록을 별도 이벤트로 보내지 않는다.

2026-09-15부터 홈페이지 안의 실제 이동 행동을 구분하기 위해 두 이벤트를 추가한다.

- `app_open_click`: 홈페이지·앱 상세에서 토스, 원스토어 등 실행 버튼을 누른 경우. 목적지 종류와 버튼 문구만 기록한다.
- `related_content_click`: 블로그 본문에서 같은 사이트의 다른 글·페이지로 이동한 경우. 출발·도착 경로와 링크 문구만 기록한다.

전체 URL의 검색 매개변수나 방문자가 입력한 값은 이벤트에 넣지 않는다. 개인정보처리방침의
「방문 경로와 페이지 이용 현황」 및 「페이지 조회·스크롤·외부 링크 클릭」 안내 범위 안에서 운영한다.

이전 외부 이식 패키지의 플러그인 소스와 빌드 스크립트를 `wordpress/`로 가져왔다.
앞으로 다음 명령을 기준으로 빌드한다. 오래된 외부 패키지로 다시 빌드하면 분석 태그가 빠진다.

```powershell
git pull --rebase
python tools/cache_bust.py --check
python wordpress/build-plugin.py --bump
```

생성된 `wordpress/dist/ntsl-site.zip`을 워드프레스 플러그인 업로드에서 교체하고
WP Super Cache의 캐시를 삭제한다. ZIP과 빌드 출력은 git에서 제외한다.
Site Kit/Head & Footer Code/Rank Math 등에 같은 태그를 추가하지 않는다.
Site Kit은 1.187.0으로 업데이트했으며, 태그는 자체 플러그인에서 관리하므로 비활성 상태로 유지한다.
Google 계정 접근 권한은 Site Kit에 부여하지 않았다.

## 확인 경로와 해석

- Analytics: `https://analytics.google.com/analytics/web/#/a407772490p553931592/reports/intelligenthome`
- 실시간 수집: 홈페이지 방문 후 Analytics의 실시간 보고서에서 `page_view` 확인.
- 공개 페이지: 메인·앱 상세·블로그 HTML에 `ntsl-google-tag`와 `ntsl-analytics-config`가 각각 1개인지 확인.
- 이동 이벤트: 공개 HTML에 `ntsl-analytics-events`가 1개이며 앱 실행 버튼에서 `app_open_click`, 글 본문 내부 링크에서 `related_content_click`이 수집되는지 DebugView로 확인.
- 개인정보처리방침의 홈페이지 방문 분석 항목과 기존 앱 안내를 함께 유지한다.
- 홈페이지 유입은 앱 실행·광고 수익과 같지 않다. 실제 수익 확인에는 서비스 플랫폼 또는 광고 계정의 수익 자료가 필요하다.

## 서치콘솔

2026-09-13 직접 확인: `https://ninetosixlab.com/` 속성에서 `/sitemap_index.xml`은
2026-09-11 제출, 마지막 읽기 2026-09-13, 상태 성공, 발견된 페이지 18개.
이미 정상 제출되어 중복 제출하지 않았다. 발견된 페이지 수를 색인 완료 수로 해석하지 않는다.

사이트맵 인덱스와 robots.txt는 공개 HTTP 200 응답이며 robots.txt에 인덱스 주소가 등록돼 있다.

## 유입 기준선 — 2026-09-15

최근 7일 GA4 홈에서 활성 사용자 15명, 새 사용자 16명, 이벤트 227건이 확인됐다.
Threads와 Facebook 첫 사용자 유입은 각각 1명이다. `tagassistant.google.com` 추천 14세션과
운영자 직접 방문이 포함돼 있어 현재 수치를 순수 외부 유입으로 단정하지 않는다.

GA4와 Search Console 속성은 아직 연결되지 않았다. 연결 후 검색어 → 방문 페이지 →
관련 글·앱 이동을 한 흐름으로 확인한다.
