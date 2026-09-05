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

  /*
   * 첫 화면은 스크롤을 기다리지 않는다.
   *
   * 다만 로고 연출이 도는 동안에는 미룬다. 덮개 뒤에서 제목이 이미 다
   * 올라와 있으면, 덮개가 걷혔을 때 아무 일도 안 일어난 정지 화면이 된다.
   * 연출이 끝나는 순간에 맞춰 올려야 두 장면이 이어진다.
   */
  var boot = document.getElementById('boot');
  var booting = document.documentElement.classList.contains('boot-on') && boot;

  /*
   * 다음 프레임에 올린다. 지금 바로 클래스를 붙이면 시작 상태가 한 번도
   * 그려지지 않아 전환이 생략되고 그냥 켜진 것처럼 보인다.
   *
   * 다만 배경 탭에서는 requestAnimationFrame 이 오지 않는 경우가 있어
   * 타이머로 한 번 더 건다. 두 번 붙어도 같은 클래스라 문제가 없다.
   */
  function raiseHero() {
    var go = function () {
      document.querySelectorAll('.hero .rise').forEach(function (el) {
        el.classList.add('in');
      });
    };
    requestAnimationFrame(go);
    setTimeout(go, 250);
  }

  if (!booting) {
    raiseHero();
    return;
  }

  var done = false;
  function endBoot() {
    if (done) return;
    done = true;
    document.documentElement.classList.remove('boot-on');
    document.documentElement.classList.add('boot-done');
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    try {
      sessionStorage.setItem('n2s-boot', '1');
    } catch (e) {
      /* 저장 못 하면 다음 화면에서 한 번 더 볼 뿐이다 */
    }
    raiseHero();
  }

  boot.addEventListener('animationend', function (e) {
    // 덮개 자신의 사라지는 동작이 끝났을 때만 — 안쪽 조각들의 끝은 무시한다
    if (e.target === boot) endBoot();
  });

  /* 애니메이션 이벤트를 못 받는 경우가 있어 시간으로도 한 번 더 건다 */
  setTimeout(endBoot, 2600);
})();
