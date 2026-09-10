/*
 * 등장 연출.
 *
 * 두 갈래다. GSAP 이 실려 있으면 그쪽으로 — 첫 화면 제목이 낱말 단위로
 * 올라오고, 스크롤에 맞춰 첫 화면이 뒤로 물러나고, 카드 속 폰이 스크롤과
 * 다른 속도로 움직인다. GSAP 이 안 실렸거나(CDN 이 막힌 곳) 움직임을 줄여
 * 달라고 했으면 예전 그대로 IntersectionObserver 로 한 번씩만 올린다.
 *
 * 한 번 올라온 것은 다시 감추지 않는다 — 위아래로 스크롤할 때마다 글이
 * 깜빡이면 읽는 사람이 피곤하다.
 *
 * 메인과 상세 페이지가 같이 쓰므로 파일로 뺐다.
 */
(function () {
  var items = document.querySelectorAll('.rise');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var useGsap = !reduce && gsap && window.ScrollTrigger;

  if (reduce || (!useGsap && !('IntersectionObserver' in window))) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('in');
    return;
  }

  /*
   * 첫 화면은 스크롤을 기다리지 않는다.
   *
   * 다만 로고 연출이 도는 동안에는 미룬다. 덮개 뒤에서 제목이 이미 다
   * 올라와 있으면, 덮개가 걷혔을 때 아무 일도 안 일어난 정지 화면이 된다.
   * 연출이 끝나는 순간에 맞춰 올려야 두 장면이 이어진다.
   */
  var boot = document.getElementById('boot');
  var booting = document.documentElement.classList.contains('boot-on') && boot;
  var raiseHero = useGsap ? setupGsap() : setupObserver();

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
    raiseHero();
  }

  boot.addEventListener('animationend', function (e) {
    // 덮개 자신의 사라지는 동작이 끝났을 때만 — 안쪽 조각들의 끝은 무시한다
    if (e.target === boot) endBoot();
  });

  /* 애니메이션 이벤트를 못 받는 경우가 있어 시간으로도 한 번 더 건다 */
  setTimeout(endBoot, 2600);

  /* ---------- GSAP 이 없을 때 ---------- */

  function setupObserver() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    document.addEventListener('focusin', function (e) {
      var el = e.target.closest ? e.target.closest('.rise') : null;
      if (el) el.classList.add('in');
    });

    items.forEach(function (el, i) {
      // 같은 무대 안에서는 위에서부터 차례로 — 한꺼번에 뜨면 순서가 안 읽힌다
      el.style.transitionDelay = (Math.min(i % 7, 5) * 0.06) + 's';
      io.observe(el);
    });

    /*
     * 다음 프레임에 올린다. 지금 바로 클래스를 붙이면 시작 상태가 한 번도
     * 그려지지 않아 전환이 생략되고 그냥 켜진 것처럼 보인다.
     *
     * 다만 배경 탭에서는 requestAnimationFrame 이 오지 않는 경우가 있어
     * 타이머로 한 번 더 건다. 두 번 붙어도 같은 클래스라 문제가 없다.
     */
    return function () {
      var go = function () {
        document.querySelectorAll('.hero .rise').forEach(function (el) {
          el.classList.add('in');
        });
      };
      requestAnimationFrame(go);
      setTimeout(go, 250);
    };
  }

  /* ---------- GSAP 이 있을 때 ---------- */

  function setupGsap() {
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);

    // 이 클래스가 붙으면 CSS 쪽 transition 이 꺼진다 — 둘이 같이 움직이면 늦고 끊긴다
    document.documentElement.classList.add('gsap');

    var ease = 'power3.out';
    var heroRise = gsap.utils.toArray('.hero .rise');
    var rest = gsap.utils.toArray('.rise').filter(function (el) {
      return heroRise.indexOf(el) === -1;
    });

    /*
     * 시작 상태를 인라인으로 박아 둔다. CSS 값과 같지만 GSAP 이 읽기 쉽다.
     *
     * autoAlpha 가 아니라 opacity 다. autoAlpha 는 visibility: hidden 을 같이 걸어서
     * 아직 안 올라온 카드는 키보드 Tab 이 건너뛴다 — 그러면 키보드로는 앱에
     * 닿을 길이 없다. 투명하기만 하면 포커스는 받고, 아래 focusin 이 바로 드러낸다.
     */
    if (heroRise.length) gsap.set(heroRise, { opacity: 0, y: 26 });
    if (rest.length) gsap.set(rest, { opacity: 0, y: 26 });
    var phones = gsap.utils.toArray('.phone.rise');
    if (phones.length) gsap.set(phones, { y: 38, scale: 0.965 });

    /*
     * 첫 화면 밖의 것은 스크롤로 들어올 때 한 번만.
     *
     * 같은 프레임에 걸린 것끼리 묶어서(batch) 위에서부터 차례로 올린다.
     */
    ScrollTrigger.batch(rest, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: ease,
          overwrite: true
        });
      }
    });

    /* 키보드 포커스가 아직 안 올라온 요소에 들어오면 기다리지 않고 바로 올린다 */
    document.addEventListener('focusin', function (e) {
      var el = e.target.closest ? e.target.closest('.rise') : null;
      if (el) gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: ease, overwrite: true });
    });

    /*
     * 카드 속 폰.
     *
     * 카드가 화면을 지나는 동안 폰이 살짝 반대로 움직인다. transform 을
     * 직접 잡으면 hover 때 올라가는 CSS 와 싸우므로 변수(--py)만 돌린다.
     */
    gsap.utils.toArray('.tile').forEach(function (tile) {
      var img = tile.querySelector('.tile-phone img');
      if (!img) return;
      gsap.fromTo(img, { '--py': '22px' }, {
        '--py': '-22px',
        ease: 'none',
        scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* 첫 화면이 없는 페이지(상세)는 여기까지 — 위쪽 요소들도 batch 가 올린다 */
    var hero = document.querySelector('.hero');
    if (!hero) {
      return function () {};
    }

    /*
     * 스크롤하면 첫 화면이 뒤로 물러난다.
     *
     * 글이 아래 무대보다 느리게 올라가며 옅어진다. 배경 빛은 그보다 더
     * 느리게. 그래서 겹이 생긴다 — 앞의 것이 먼저 가고 뒤의 것이 남는다.
     */
    var sculpt = hero.querySelector('.sculpt');
    var layers = sculpt ? gsap.utils.toArray(sculpt.querySelectorAll('img')) : [];
    var depth = function (el) { return parseFloat(el.getAttribute('data-depth')) || 1; };

    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    })
      .to(hero.querySelector('.hero-text'), { y: 140, opacity: 0, ease: 'none' }, 0)
      .to(hero.querySelector('.light'), { y: 90, ease: 'none' }, 0)
      .to(layers, {
        // 앞에 있는 조각일수록 빨리 흩어진다
        y: function (i, el) { return -80 * depth(el); },
        opacity: 0,
        ease: 'none'
      }, 0);

    /*
     * 조형물.
     *
     * 세 겹의 움직임이 서로 다른 속성을 쓴다. 떠다니기는 y·rotation, 마우스
     * 따라가기는 xPercent·yPercent, 스크롤 흩어짐은 위의 y 스크럽. 같은 속성을
     * 둘이 건드리면 하나가 다른 하나를 지운다.
     */
    if (layers.length) gsap.set(layers, { opacity: 0, scale: 0.72, transformOrigin: '50% 50%' });

    function floatLayers() {
      layers.forEach(function (el, i) {
        var d = depth(el);
        gsap.to(el, {
          y: '+=' + (9 + 7 * d),
          rotation: (i % 2 ? 1 : -1) * 1.6 * d,
          duration: 4.2 + i * 0.7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        });
      });
    }

    /* 마우스가 있는 기기에서만 — 손가락 화면에서는 따라갈 포인터가 없다 */
    if (layers.length && window.matchMedia('(hover: hover)').matches) {
      var qx = layers.map(function (el) { return gsap.quickTo(el, 'xPercent', { duration: 0.9, ease: 'power3' }); });
      var qy = layers.map(function (el) { return gsap.quickTo(el, 'yPercent', { duration: 0.9, ease: 'power3' }); });
      hero.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5;
        var ny = e.clientY / window.innerHeight - 0.5;
        layers.forEach(function (el, i) {
          var d = depth(el);
          qx[i](nx * 16 * d);
          qy[i](ny * 12 * d);
        });
      });
    }

    /* 스크롤 안내선 — 위에서 아래로 한 번씩 흘러내린다 */
    var cue = hero.querySelector('.scroll-cue');
    var cueLine = cue && cue.querySelector('span');
    if (cueLine) {
      gsap.fromTo(cueLine,
        { scaleY: 0, transformOrigin: 'top' },
        { scaleY: 1, duration: 1.3, ease: 'power2.inOut', repeat: -1, repeatDelay: 0.5 });
    }

    /*
     * 안내선은 스크롤을 조금만 해도 사라진다.
     *
     * 등장 트윈(0→1)과 같은 요소를 건드리므로 등장이 끝난 뒤에 건다. 먼저
     * 걸면 스크롤 위치 0 에서 "사라진 상태"를 그려 버려 등장이 지워진다.
     */
    function fadeCueOnScroll() {
      if (!cue) return;
      gsap.to(cue, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '25% top', scrub: true }
      });
    }

    /*
     * 제목은 낱말로 쪼개서 아래에서 올라온다.
     *
     * 낱말마다 덮개(mask)가 있어 잘린 채로 올라오다 드러난다. 그냥 올리는 것과
     * 달리 글자가 "나타나는" 순서가 생긴다. SplitText 가 없으면 한 덩이로.
     */
    var title = hero.querySelector('h1');
    var words = null;
    if (SplitText && title) {
      try {
        var split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w' });
        words = split.words;
        gsap.set(words, { yPercent: 110 });
      } catch (e) {
        words = null;
      }
    }

    return function () {
      var tl = gsap.timeline({ defaults: { ease: ease }, onComplete: fadeCueOnScroll });
      tl.to(hero.querySelector('.eyebrow'), { opacity: 1, y: 0, duration: 0.7 }, 0);
      if (words) {
        tl.set(title, { opacity: 1, y: 0 }, 0.1)
          .to(words, { yPercent: 0, duration: 0.95, stagger: 0.07, ease: 'power4.out' }, 0.1);
      } else {
        tl.to(title, { opacity: 1, y: 0, duration: 0.9 }, 0.1);
      }
      tl.to(hero.querySelector('.sub'), { opacity: 1, y: 0, duration: 0.8 }, 0.45)
        .to(hero.querySelector('.cta'), { opacity: 1, y: 0, duration: 0.8 }, 0.6)
        .to(hero.querySelector('.scroll-cue'), { opacity: 1, y: 0, duration: 0.8 }, 0.9);
      if (layers.length) {
        // 뒤에서 앞으로 한 겹씩 서고, 다 서면 떠다니기 시작
        tl.to(layers, { opacity: 1, scale: 1, duration: 1.3, stagger: 0.09, ease: 'power3.out', onComplete: floatLayers }, 0.25);
      }
    };
  }
})();
