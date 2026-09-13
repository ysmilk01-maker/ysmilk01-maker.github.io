/* 공개 화면은 서버 캐시만 읽는다. 기관 API, 인증키, 사용자 추적 코드는 포함하지 않는다. */
(() => {
  'use strict';
  const root = document.getElementById('ntsl-disclosures');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const results = $('nd-results');
  let payload = null, kind = 'all', page = 1;
  const pageSize = 12;
  const labels = { increase: '지분 증가', decrease: '지분 감소', unchanged: '비율 변동 없음', correction: '정정보고', unknown: '수치 확인 필요' };
  const date = s => /^\d{8}$/.test(s || '') ? `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}` : '확인 필요';
  const number = n => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ko-KR', {maximumFractionDigits: 4}) : '—';
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  const latest = rows => {
    const seen = new Set();
    return [...rows].sort((a,b) => (b.date+b.receipt).localeCompare(a.date+a.receipt)).filter(r => {
      const k = r.corp_code + '|' + r.reporter;
      if (seen.has(k)) return false;
      seen.add(k);
      return r.valid_ratio && r.ratio >= 5 && !r.withdrawn && !r.superseded;
    });
  };
  function empty(title, text, link = false) {
    const box = node('div', undefined, 'nd-empty');
    box.append(node('h3',title),node('p',text));
    if (link) { const a = node('a','금융감독원 공시 원문에서 확인하기 ↗'); a.href = 'https://dart.fss.or.kr/'; a.target = '_blank'; a.rel = 'noopener'; box.append(a); }
    results.replaceChildren(box);
  }
  function row(r) {
    const article = node('article', undefined, 'nd-row');
    const head = node('div', undefined, 'nd-row-head'); const company = node('div');
    company.append(node('h3',r.company),node('p',`${r.stock_code || '종목코드 확인 필요'} · 접수 ${date(r.date)}`,'nd-company-meta'));
    head.append(company,node('span',r.crossed_five ? '신규 5% 진입' : labels[r.change] || labels.unknown,'nd-badge'));
    const metrics = node('dl',undefined,'nd-row-data');
    const delta = r.delta === null ? '—' : `${r.delta > 0 ? '+' : ''}${number(r.delta)}%p`;
    for (const [label,value] of [['대표보고자',r.reporter || '확인 필요'],['보유비율',r.valid_ratio ? `${number(r.ratio)}%` : '—'],['이전 보고 대비',delta]]) {
      const d=node('div'); d.append(node('dt',label),node('dd',value)); metrics.append(d);
    }
    const detail=node('details'); detail.append(node('summary','보고사유·이전 비율·원문 확인'));
    const body=node('div',undefined,'nd-detail-body');
    body.append(node('p',`보고구분: ${r.type || '확인 필요'} · ${r.report_name || '대량보유 상황보고'}`));
    body.append(node('p',`이전 보유비율(기재 증감으로 계산): ${r.previous !== null && r.previous >= 0 && r.previous <= 100 ? number(r.previous)+'%' : '확인 필요'}`));
    body.append(node('p',`보유 주식등의 수: ${r.quantity || '미제공'} · 증감 수량: ${r.quantity_delta || '미제공'}`));
    body.append(node('p',`보고사유: ${r.reason || '상세 수치 또는 사유가 아직 제공되지 않았습니다. 원문을 확인하세요.'}`));
    if (r.correction) body.append(node('p','정정보고입니다. 새로운 매수·매도 또는 신규 5% 진입으로 집계하지 않습니다.'));
    if (r.withdrawn || r.superseded) body.append(node('p','철회 또는 후속 정정 표시가 있습니다. 유효한 최신 원문을 확인하세요.'));
    if (/^\d{14}$/.test(r.receipt)) { const a=node('a','DART 공시 원문 열기 ↗'); a.href='https://dart.fss.or.kr/dsaf001/main.do?rcpNo='+r.receipt; a.target='_blank'; a.rel='noopener'; body.append(a); }
    detail.append(body); article.append(head,metrics,detail); return article;
  }
  function render() {
    if (!payload) return;
    const query=$('nd-query').value.trim().toLocaleLowerCase('ko-KR');
    const days=Number($('nd-days').value);
    const end = /^\d{8}$/.test(payload.end || '') ? payload.end : new Date().toISOString().slice(0,10).replaceAll('-','');
    const since=new Date(`${end.slice(0,4)}-${end.slice(4,6)}-${end.slice(6,8)}T00:00:00Z`); since.setUTCDate(since.getUTCDate()-days+1);
    const start=since.toISOString().slice(0,10).replaceAll('-','');
    const periodRows=payload.rows.filter(r => r.date >= start && r.date <= end);
    const ready=payload.configured || payload.rows.length>0;
    [['nd-count-all',periodRows.length],['nd-count-up',periodRows.filter(r=>r.change==='increase').length],['nd-count-down',periodRows.filter(r=>r.change==='decrease').length],['nd-count-new',periodRows.filter(r=>r.crossed_five).length]].forEach(([id,n])=>$(id).textContent=ready?number(n):'—');
    let list=kind==='holders' ? latest(payload.rows).filter(r=>r.date>=start && r.date<=end) : periodRows;
    if (kind==='new') list=list.filter(r=>r.crossed_five);
    else if (kind!=='all' && kind!=='holders') list=list.filter(r=>r.change===kind);
    list=list.filter(r=>[r.company,r.stock_code,r.reporter].some(x=>(x||'').toLocaleLowerCase('ko-KR').includes(query)));
    list.sort((a,b)=>(b.date+b.receipt).localeCompare(a.date+a.receipt));
    const pages=Math.max(1,Math.ceil(list.length/pageSize)); page=Math.min(page,pages);
    $('nd-period').textContent=ready?`${date(start)} ~ ${date(end)} 접수 공시 · 요약 수치는 검색어 적용 전`:'최근 90일 접수 공시를 대상으로 합니다.';
    $('nd-results-count').textContent=ready?`검색 결과 ${number(list.length)}건`:'공시 데이터 연결 전';
    $('nd-filter-help').textContent=kind==='holders'?'수집한 90일 공시에서 회사·대표보고자별 최신 보고를 먼저 선택합니다. 현재 전체 주주명부가 아닙니다.':'최근 공시부터 표시합니다. 정정보고와 상세 수치 미제공 건도 구분해 보여줍니다.';
    if (!ready) empty('공시 데이터 연결을 준비하고 있습니다','화면과 검색 기능은 준비되었습니다. 금융감독원 데이터 연결 후 실제 공시가 표시됩니다. 아래 안내에서 지분공시를 읽는 방법을 먼저 확인하세요.',true);
    else if (!list.length) empty(payload.collecting?'공시를 수집하고 있습니다':'조건에 맞는 공시가 없습니다',payload.collecting?'초기 수집 또는 갱신 중입니다. 수집이 진행되면 결과가 표시됩니다.':'종목명·대표보고자 또는 접수 기간을 바꿔 보세요. 공시가 없다는 사실만으로 해당 보유자가 없다고 판단할 수는 없습니다.');
    else results.replaceChildren(...list.slice((page-1)*pageSize,page*pageSize).map(row));
    $('nd-page').textContent=ready?`${page} / ${pages}`:'—'; $('nd-prev').disabled=page<=1 || !list.length; $('nd-next').disabled=page>=pages;
    results.setAttribute('aria-busy','false');
  }
  $('nd-search-form').addEventListener('submit',e=>{e.preventDefault();page=1;render();});
  $('nd-days').addEventListener('change',()=>{page=1;render();});
  root.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;page=1;root.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
  $('nd-reset').addEventListener('click',()=>{$('nd-query').value='';$('nd-days').value='90';kind='all';page=1;root.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.kind==='all')));render();$('nd-query').focus();});
  $('nd-prev').addEventListener('click',()=>{page--;render();$('nd-list-title').scrollIntoView({block:'start'});});
  $('nd-next').addEventListener('click',()=>{page++;render();$('nd-list-title').scrollIntoView({block:'start'});});
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
  fetch(root.dataset.endpoint,{credentials:'same-origin',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('http');return r.json();}).then(data=>{
    if(!Array.isArray(data.rows))throw new Error('format');
    payload=data;
    let status=!data.configured?'데이터 연결 준비 중 · 실제 공시는 아직 표시하지 않습니다.':data.collecting?'공시 수집 중 · 결과가 일부만 표시될 수 있습니다.':`마지막 수집 완료 ${data.finished || '확인 중'} (한국시간)`;
    if(data.error)status+=' · 갱신이 지연되고 있습니다. 저장된 공시의 접수일을 확인하세요.';
    if(data.truncated)status+=' · 표시 한도를 넘어 일부 공시가 생략되었습니다.';
    $('nd-status').textContent=status;render();
  }).catch(()=>{$('nd-status').textContent='공시 데이터 연결 상태를 확인하지 못했습니다.';$('nd-results-count').textContent='조회 오류';results.setAttribute('aria-busy','false');empty('지금은 데이터를 불러오지 못했습니다','잠시 후 페이지를 다시 열어 주세요. 조회 오류를 공시 0건으로 표시하지 않습니다.',true);}).finally(()=>clearTimeout(timer));
})();
