/*
 * 스크롤에 맞춰 한 번만 올라오게 한다.
 *
 * 한 번 올라온 것은 다시 감추지 않는다 — 위아래로 스크롤할 때마다 글이
 * 깜빡이면 읽는 사람이 피곤하다. 그래서 들어온 요소는 관찰을 끊는다.
 *
 * 메인과 상세 페이지가 같이 쓰므로 파일로 뺐다.
 */
(function () {
  var items = document.querySelectorAll('.rise');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('in');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  items.forEach(function (el, i) {
    // 같은 무대 안에서는 위에서부터 차례로 — 한꺼번에 뜨면 순서가 안 읽힌다
    el.style.transitionDelay = (Math.min(i % 7, 5) * 0.06) + 's';
    io.observe(el);
  });

  // 첫 화면은 스크롤을 기다리지 않는다
  requestAnimationFrame(function () {
    document.querySelectorAll('.hero .rise').forEach(function (el) {
      el.classList.add('in');
    });
  });
})();
