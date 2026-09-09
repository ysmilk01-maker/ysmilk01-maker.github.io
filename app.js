/*
 * 상세 페이지의 살아 있는 숫자.
 *
 * 코인·주식 앱의 랭킹은 Supabase 뷰(ranking, krx_ranking)로 공개돼 있고
 * 앱이 읽는 것과 똑같은 공개 키로 읽는다. 홈페이지가 앱과 같은 숫자를 보여야
 * "지금 켜져 있는 앱"이라는 말이 빈말이 안 된다.
 *
 * 못 읽으면(차단·오프라인) 그 구역을 통째로 접는다. 빈 표를 남기지 않는다.
 */
(function () {
  var box = document.querySelector('[data-rank]');
  if (!box) return;

  var BASE = 'https://qzimykxyvmoripifqmbi.supabase.co/rest/v1/';
  var KEY = 'sb_publishable__fSxVVDLeoed3LeIlB6cTQ_Vrc68mPl';
  var view = box.getAttribute('data-rank');
  var headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };

  function get(path, extra) {
    var h = {};
    for (var k in headers) h[k] = headers[k];
    for (var e in extra || {}) h[e] = extra[e];
    return fetch(BASE + path, { headers: h }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json().then(function (json) { return { json: json, res: r }; });
    });
  }

  function fmtRoi(v) {
    var n = Math.round(v * 10) / 10;
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    return Math.floor(s / 86400) + '일 전';
  }

  /* 숫자는 0에서 올라온다 — GSAP 이 있을 때만. 없으면 그냥 쓴다 */
  function countTo(el, target, format) {
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = format(target);
      return;
    }
    var o = { v: 0 };
    window.gsap.to(o, {
      v: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: function () { el.textContent = format(o.v); },
      onComplete: function () { el.textContent = format(target); }
    });
  }

  Promise.all([
    get(view + '?select=rank,nickname,roi,trades&order=rank.asc&limit=5',
      { Prefer: 'count=exact', Range: '0-4' }),
    /* 마지막 거래 시각은 뷰에 updated_at 이 있을 때만 — 없는 뷰(주식)는 data-last="no" 로 표시해 두어 헛요청을 안 낸다 */
    box.getAttribute('data-last') === 'no'
      ? Promise.resolve({ json: [] })
      : get(view + '?select=updated_at&order=updated_at.desc&limit=1').catch(function () { return { json: [] }; })
  ]).then(function (r) {
    var rows = r[0].json;
    var range = r[0].res.headers.get('content-range') || '';
    var total = parseInt(range.split('/')[1], 10);
    if (!rows.length || !(total > 0)) throw new Error('empty');
    var last = r[1].json[0] && r[1].json[0].updated_at;

    var players = box.querySelector('[data-n="players"]');
    var top = box.querySelector('[data-n="top"]');
    var lastEl = box.querySelector('[data-n="last"]');
    var tbody = box.querySelector('tbody');

    tbody.innerHTML = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var cls = row.roi > 0 ? 'up' : row.roi < 0 ? 'down' : '';
      tr.innerHTML =
        '<td class="r">' + row.rank + '</td>' +
        '<td class="n"></td>' +
        '<td class="p ' + cls + '">' + fmtRoi(row.roi) + '</td>' +
        '<td class="t">' + row.trades + '회</td>';
      tr.querySelector('.n').textContent = row.nickname; // 닉네임은 텍스트로만
      tbody.appendChild(tr);
    });

    box.hidden = false;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();

    countTo(players, total, function (v) { return Math.round(v) + '명'; });
    countTo(top, rows[0].roi, fmtRoi);
    if (lastEl) {
      if (last) lastEl.textContent = ago(last);
      else lastEl.parentNode.parentNode.removeChild(lastEl.parentNode); // 칸 자체를 뺀다
    }
  }).catch(function () {
    box.parentNode.removeChild(box);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
})();
