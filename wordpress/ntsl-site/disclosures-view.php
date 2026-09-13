<?php if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div id="ntsl-disclosures" data-endpoint="<?php echo esc_url( rest_url( 'ntsl/v1/disclosures' ) ); ?>">
    <header class="nd-intro">
        <p class="nd-eyebrow">공시로 읽는 주식 보유 변화</p>
        <h2>누가 지분을 늘리고,<br>누가 줄였을까요?</h2>
        <p>금융감독원 대량보유 상황보고에서 종목과 대표보고자를 찾아보세요.<br class="nd-desktop"> 보유비율, 이전 보고 대비 변화, 5% 진입 여부를 함께 확인합니다.</p>
        <p class="nd-caption">주가·실시간 수급이 아닌 <strong>보고서에 기재된 주식등의 보유 정보</strong>입니다. 특별관계자 등의 합산이 포함될 수 있습니다.</p>
    </header>
    <div class="nd-status" role="status" aria-live="polite" id="nd-status">공시 데이터 연결 상태를 확인하고 있습니다.</div>
    <dl class="nd-metrics" aria-label="조회 기간 내 공시 요약">
        <div><dt>수집 공시</dt><dd id="nd-count-all">—</dd></div>
        <div><dt>보유비율 증가</dt><dd id="nd-count-up">—</dd></div>
        <div><dt>보유비율 감소</dt><dd id="nd-count-down">—</dd></div>
        <div><dt>새로 5% 진입</dt><dd id="nd-count-new">—</dd></div>
    </dl>
    <section class="nd-browser" aria-labelledby="nd-list-title">
        <div class="nd-section-heading"><h2 id="nd-list-title">지분공시 찾아보기</h2><p id="nd-period" class="nd-caption">최근 90일 접수 공시를 대상으로 합니다.</p></div>
        <form id="nd-search-form" class="nd-search" role="search">
            <div><label for="nd-query">종목명·종목코드·대표보고자</label><input id="nd-query" type="search" placeholder="종목 또는 보고자 이름 검색" maxlength="100" autocomplete="off"></div>
            <div><label for="nd-days">접수 기간</label><select id="nd-days"><option value="90">최근 90일</option><option value="30">최근 30일</option><option value="7">최근 7일</option></select></div>
            <button type="submit" class="nd-primary">검색</button>
        </form>
        <div class="nd-filters" role="group" aria-label="공시 분류">
            <button type="button" data-kind="all" aria-pressed="true">전체 공시</button>
            <button type="button" data-kind="holders" aria-pressed="false">5% 이상 보고</button>
            <button type="button" data-kind="increase" aria-pressed="false">지분 증가</button>
            <button type="button" data-kind="decrease" aria-pressed="false">지분 감소</button>
            <button type="button" data-kind="new" aria-pressed="false">신규 5% 진입</button>
        </div>
        <p id="nd-filter-help" class="nd-caption">최근 공시부터 표시합니다. 정정보고와 상세 수치 미제공 건도 구분해 보여줍니다.</p>
        <div class="nd-results-heading"><p id="nd-results-count" aria-live="polite">데이터 확인 중</p><button type="button" id="nd-reset" class="nd-text-button">검색 초기화</button></div>
        <div id="nd-results" aria-busy="true"></div>
        <div class="nd-pagination" aria-label="결과 페이지"><button type="button" id="nd-prev" disabled>이전</button><span id="nd-page">—</span><button type="button" id="nd-next" disabled>다음</button></div>
        <noscript><p>검색과 필터에는 자바스크립트가 필요합니다. 아래 금융감독원 원문 링크에서 공시를 확인할 수 있습니다.</p></noscript>
    </section>
    <section class="nd-guide" aria-labelledby="nd-guide-title">
        <h2 id="nd-guide-title">숫자를 읽기 전에 확인하세요</h2>
        <div class="nd-guide-grid">
            <div><h3>보유비율과 증감폭은 다릅니다</h3><p>보유비율의 단위는 %, 증감폭의 단위는 %p입니다. 변화는 이전 보고 대비이며, 오늘 하루의 순매수·순매도를 뜻하지 않습니다.</p></div>
            <div><h3>신규 진입은 이전 수치로 확인합니다</h3><p>공시의 보유비율에서 증감폭을 뺀 이전 비율이 5% 미만이고 이번 비율이 5% 이상인 보고를 분류합니다. 정정보고와 비교 수치가 없는 보고는 제외합니다.</p></div>
            <div><h3>주주 전체 목록은 아닙니다</h3><p>최근 90일에 수집한 공시가 조회 대상입니다. ‘5% 이상 보고’는 이 범위에서 회사·대표보고자별 가장 최근 보고를 확인합니다. 기간 내 공시가 없는 보유자는 표시되지 않을 수 있습니다.</p></div>
            <div><h3>증가했다고 매수한 것은 아닐 수 있습니다</h3><p>보유비율은 주식 수 변화 외에도 총 발행주식 수, 특별관계자 변동 등에 영향을 받을 수 있습니다. 상세 보기를 열어 보고사유와 원문을 확인하세요.</p></div>
        </div>
        <details class="nd-method"><summary>데이터 출처와 수집·분류 기준</summary>
            <p>출처는 금융감독원 OpenDART의 대량보유 상황보고입니다. 공시검색(D001)으로 접수번호와 종목을 찾고, 대량보유 상황보고의 보유비율·증감·보고사유를 연결합니다. 코스피·코스닥·코넥스 상장사를 대상으로 합니다.</p>
            <p>공시 접수일과 실제 보유 변동일은 다릅니다. 원문에 정정·철회 표시가 있으면 원문을 우선 확인하세요. 수집 중에는 결과가 일부만 표시될 수 있으며, 정정 전 보고서는 다음 목록 갱신 때 제외됩니다.</p>
            <p>수집 작업은 서버에서 순차 실행합니다. 갱신 지연이나 오류가 있으면 마지막으로 수집된 정보를 표시합니다. 개인·기관의 동명이인이나 대표보고자 변경은 자동으로 같은 주체라고 합치지 않습니다.</p>
            <p>종목 추천이나 투자 판단을 제공하지 않습니다. 이 화면의 분류는 보고서 수치를 읽기 위한 보조 정보입니다.</p>
        </details>
        <p class="nd-sources"><a href="https://www.data.go.kr/data/15060630/openapi.do" target="_blank" rel="noopener">공공데이터 이용 안내 ↗</a><a href="https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS004&amp;apiId=2019021" target="_blank" rel="noopener">금융감독원 데이터 명세 ↗</a><a href="https://dart.fss.or.kr/" target="_blank" rel="noopener">DART 공시 원문 검색 ↗</a></p>
    </section>
</div>
