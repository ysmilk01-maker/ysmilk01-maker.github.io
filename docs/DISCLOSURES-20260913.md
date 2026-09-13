# 국내주식 지분공시 화면

2026-09-13 · 코덱스 adsense 작업

## 범위

- 공개 페이지 `/stock-disclosures/`, shortcode `[ntsl_disclosures]`.
- 금융감독원 대량보유 상황보고(data.go.kr 15060630)와 해당 보고서를 찾기 위한 OpenDART 공시검색 D001만 사용.
- 공식 경로 `https://opendart.fss.or.kr/api/majorstock.json`, `list.json`. 이 서비스 명세에는 `_V2` 없음. 사용자에게 확인 결과를 보고한 뒤 진행 승인받음.
- 금융위원회 15094808, 시세·탐욕지수·공매도·일별 수급, 광고 코드는 추가하지 않음.
- 최근 90일 상장사 공시에서 종목/보고자 검색, 비율 증가·감소, 신규 5% 진입, 회사·대표보고자별 최신 5% 이상 보고 조회.
- 전체 현재 주주명부가 아님. 수집 범위와 접수일을 공개 화면에 표시. 특별관계자 등 합산 가능, 증감과 장내 거래를 구분.

## 인증키와 서버

- 워드프레스 `설정 → 지분공시 연결`에서 OpenDART 키를 등록. 공공데이터포털 주식시세 키와 다름.
- 권한 `manage_options`와 nonce 검증. 키는 AES-256-GCM으로 암호화하고 autoload=false 옵션에 저장. 화면에 기존 키를 출력하지 않음.
- 암호화 키는 wp_salt('auth')에서 파생하므로 워드프레스 인증 salt 교체 후에는 OpenDART 키 재등록 필요.
- 외부 설정의 `NTSL_DART_KEY` 상수가 있으면 우선 사용. 어떤 키도 저장소·ZIP·브라우저 JS에 넣지 말 것.
- 공개 REST `GET /wp-json/ntsl/v1/disclosures`는 저장된 공개정보만 반환. 요청으로 기관 API를 호출하지 않음. 임의 URL·회사코드 전달 불가.
- 응답 URL/인증키가 섞일 수 있는 기관 오류 원문은 공개하거나 로그로 저장하지 않음.
- 자체 호출 한도 일 5,000회. 실제 계정 한도는 별도 확인 필요.

## 수집

- 서버 WP-Cron 5분 작업: 목록 100건 한 페이지 또는 회사 2곳씩 처리. 90일 전체 목록 수집 → 회사별 상세 수집 → 완료. 완료 후 1시간이 지나면 새 주기.
- 방문이 없는 호스팅에서는 WP-Cron이 지연될 수 있음. 정확한 정시 수집이 필요하면 호스팅 외부 스케줄러 별도 검토.
- 키 미등록 시 cron 미실행. 관리자 수동 배치 버튼 제공.
- 테이블 `{prefix}ntsl_disclosures`, 별도 상태 옵션 사용. 공유 앱 Supabase는 변경하지 않음.
- 최종보고서(last_reprt_at=Y)를 다시 수집하여 제외된 보고서는 비활성화. 접수번호 기준 갱신. 실패 시 마지막 저장 데이터 유지, 다음 배치에서 재시도.
- 원문에 철회/후속 정정이 표시된 보고서는 신규/증가·감소 판정에서 제외.
- 신규 5%는 `0 <= 보유비율-증감폭 < 5 <= 보유비율 <= 100`, 양수 증감, 수치 존재, 정정 아님일 때만 표시.
- 보유비율 증감은 %p. 결측값은 null로 보존. 최신 보고가 5% 아래이거나 결측이면 과거의 높은 비율로 대체하지 않음.
- 키 미등록/수집 중/조회 오류/0건을 구분. 가상 검증 자료는 공개 번들에 없음.

## 배포와 검증

- `php tests/disclosures-test.php` (OpenSSL 확장 필요): 분류 경계·결측·정정·최신 선택·암호화·오류 redaction 30 assertions.
- PHP 문법 검사 및 `node --check wordpress/ntsl-site/disclosures.js`.
- UI 가상 자료: 검색·필터·상세·페이지 이동, 320/390/1280px 넘침, 콘솔 오류 확인.
- `git pull --rebase` → `python tools/cache_bust.py --check` → `python wordpress/build-plugin.py --bump` → commit/push → ZIP 업로드 → WP Super Cache 삭제.
- 원본 빌드 스크립트 사용. 새 PHP/CSS/JS는 플러그인 루트에 있어 자동 포함.
- 인증키 미등록 상태에서 화면 공개를 사용자가 명시적으로 요청함. 실데이터 수집·정정보고 사례 대조는 키 등록 후 확인해야 하며, 샘플 테스트를 실데이터 검증으로 보고하지 말 것.

## 공식 근거

- https://www.data.go.kr/data/15060630/openapi.do (이용허락범위 제한 없음, LINK형, 개발 자동/운영 심의 표기)
- https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS004&apiId=2019021
- https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
- OpenDART FAQ 「공시정보를 상업적으로 사용해도 되나요?」: 공익/타인 권리를 침해하지 않는 공개·활용, 재배포·재가공 책임은 이용자. 인계 문서의 복제·저장·전송 일괄 금지 설명과 다름.
