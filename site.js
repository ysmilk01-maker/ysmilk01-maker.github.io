/*
 * 등장 연출.
 *
 * 본문은 GSAP 또는 IntersectionObserver 로 한 번씩 드러낸다.
 * 동작 줄이기에서는 처음부터 모두 보인다. 메인 제목은 CSS, 입체 조형물은
 * 파일 아래의 WebGL 렌더러가 맡아 CDN 로딩 여부와 관계없이 표시한다.
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

    // 메인의 실시간 3D 연출은 아래 전용 렌더러가 맡는다.
    return function () {};
  }
})();

/* 실제 입체 메시를 WebGL로 그린다. 외부 엔진·텍스처 다운로드 없이 약 1만 삼각형.
 * 화면 밖·숨긴 탭·동작 줄이기·일시정지에서는 렌더 루프를 멈춘다.
 * WebGL 미지원/컨텍스트 손실 때는 기존 유리 이미지를 즉시 보여준다. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero--kinetic');
  if (!hero) return;
  var art = hero.querySelector('.kinetic-art');
  var canvas = hero.querySelector('canvas');
  var toggle = hero.querySelector('.motion-toggle');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var paused = false, inView = true, lost = false, frame = 0, last = 0, clock = 0;
  var targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  var velocityX = 0, velocityY = 0;
  var gl, program, uniforms = {}, meshes = [];
  toggle.hidden = reduce.matches;

  function syncMotion() {
    var stopped = paused || reduce.matches;
    hero.classList.toggle('is-paused', stopped);
    hero.classList.toggle('is-offscreen', !inView || document.hidden);
    toggle.hidden = reduce.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('.motion-label').textContent = paused ? '움직임 재생하기' : '움직임 멈추기';
    toggle.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (gl && !lost) {
      draw();
      if (!stopped && inView && !document.hidden) frame = requestAnimationFrame(tick);
    }
  }
  toggle.addEventListener('click', function () { paused = !paused; syncMotion(); });
  reduce.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting; syncMotion();
  }, { threshold: 0 }).observe(hero);
  hero.addEventListener('pointermove', function (event) {
    if (!fine.matches || reduce.matches || paused || event.pointerType === 'touch') return;
    var rect = hero.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width - .5;
    targetY = (event.clientY - rect.top) / rect.height - .5;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { targetX = targetY = 0; });

  var vertex = [
    'attribute vec3 aPosition; attribute vec3 aNormal;',
    'uniform vec2 uTilt; uniform float uAngle; uniform float uAspect; uniform float uScale; uniform vec3 uOffset;',
    'varying vec3 vNormal; varying vec3 vPosition;',
    'vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}',
    'vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}',
    'vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}',
    'vec3 turn(vec3 p){return rz(ry(rx(p,.62+uTilt.y),uAngle+uTilt.x),-.24);}',
    'void main(){vec3 p=turn(aPosition*uScale)+uOffset;vPosition=p;vNormal=turn(aNormal);',
    'float z=7.0-p.z;gl_Position=vec4(p.x*2.75/uAspect,p.y*2.75,1.002*z-.2002,z);}'
  ].join('\n');
  var fragment = [
    'precision highp float; varying vec3 vNormal; varying vec3 vPosition;',
    'vec3 environment(vec3 r){',
    'float panel=exp(-pow((r.x+r.y*.23-.23)/.13,2.0))*smoothstep(-.45,.1,r.y);',
    'float rim=exp(-pow((r.y-r.x*.54+.14)/.045,2.0));',
    'float wide=pow(max(0.0,dot(r,normalize(vec3(-.6,.8,.5)))),12.0);',
    'return vec3(.006,.009,.027)+vec3(.8,.87,1.0)*panel*3.8+vec3(.24,.18,1.0)*rim*.8+vec3(.45,.55,1.0)*wide*.9;',
    '}',
    'void main(){vec3 n=normalize(vNormal);vec3 v=normalize(vec3(0.,0.,7.)-vPosition);',
    'float facing=max(dot(n,v),0.0);float fresnel=pow(1.0-facing,3.0);',
    'vec3 reflected=reflect(-v,n);vec3 refracted=refract(-v,n,1.0/1.46);',
    'float tint=clamp(.48+vPosition.y*.18+vPosition.x*.12,0.0,1.0);',
    'vec3 blue=vec3(.009,.025,.36);vec3 violet=vec3(.075,.008,.30);',
    'vec3 color=mix(violet,blue,tint);',
    'float diffuse=max(dot(n,normalize(vec3(-.7,.9,1.6))),0.0);',
    'color*=.24+diffuse*.72;',
    'color+=environment(reflected)*(.44+.72*fresnel);',
    'color+=environment(refracted)*vec3(.11,.10,.25)*.42;',
    'color+=vec3(.028,.05,.25)*pow(1.0-facing,1.7);',
    'color=color/(color+vec3(1.0));color=pow(color,vec3(.4545));',
    'gl_FragColor=vec4(color,1.0);}'
  ].join('\n');

  function shader(type, source) {
    var s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('shader unavailable'); }
    return s;
  }
  function normal(a) { var l = Math.hypot(a[0],a[1],a[2]) || 1; return a.map(function (v) { return v/l; }); }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function point(t) { var r = 1.29 + .42*Math.cos(3*t); return [r*Math.cos(2*t),r*Math.sin(2*t),.59*Math.sin(3*t)]; }
  function makeMesh(sphere) {
    var positions=[], normals=[], indices=[];
    var steps=sphere?32:192, sides=sphere?20:28;
    for (var i=0;i<=steps;i++) {
      var t=i/steps*Math.PI*2;
      var p=point(t), p1=point(t+.001), p0=point(t-.001);
      var tangent=normal(p1.map(function(v,k){return v-p0[k];}));
      var radial=normal(cross(tangent,[0,0,1])); var binormal=normal(cross(radial,tangent));
      for (var j=0;j<=sides;j++) {
        var a=j/sides*Math.PI*2, n, pos;
        if (sphere) { var b=j/sides*Math.PI; n=[Math.cos(t)*Math.sin(b),Math.cos(b),Math.sin(t)*Math.sin(b)]; pos=n; }
        else { n=radial.map(function(v,k){return v*Math.cos(a)+binormal[k]*Math.sin(a);}); var radius=.325*(1+.08*Math.cos(3*t)); pos=p.map(function(v,k){return v+n[k]*radius;}); }
        positions.push.apply(positions,pos); normals.push.apply(normals,n);
        if (i<steps && j<sides) { var k=i*(sides+1)+j; indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2); }
      }
    }
    function buffer(type, data) { var b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b; }
    return {position:buffer(gl.ARRAY_BUFFER,new Float32Array(positions)),normal:buffer(gl.ARRAY_BUFFER,new Float32Array(normals)),index:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices)),count:indices.length};
  }
  function resize() {
    if (!gl || lost) return;
    var r=canvas.getBoundingClientRect(); var dpr=Math.min(devicePixelRatio || 1,innerWidth<700?1.35:1.7);
    var size=Math.min(1300,Math.max(1,Math.round(r.width*dpr)));
    var h=Math.max(1,Math.round(size*r.height/(r.width||1)));
    if(canvas.width!==size || canvas.height!==h){canvas.width=size;canvas.height=h;}
    gl.viewport(0,0,canvas.width,canvas.height); draw();
  }
  function renderMesh(mesh,scale,x,y,z,angle) {
    var p=gl.getAttribLocation(program,'aPosition'),n=gl.getAttribLocation(program,'aNormal');
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
    gl.uniform1f(uniforms.uScale,scale);gl.uniform3f(uniforms.uOffset,x,y,z);gl.uniform1f(uniforms.uAngle,angle);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
  }
  function draw() {
    if(!gl || lost || !program || !meshes.length) return;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.uniform1f(uniforms.uAspect,canvas.width/canvas.height);
    gl.uniform2f(uniforms.uTilt,pointerX*.4,pointerY*.32);
    var angle=-.36+clock*.105;
    renderMesh(meshes[0],1,0,Math.sin(clock*.4)*.055,0,angle);
    renderMesh(meshes[1],.14,-1.64,-1.45+Math.sin(clock*.7)*.1,.3,angle);
    renderMesh(meshes[1],.085,1.30,1.69+Math.cos(clock*.5)*.06,-.2,angle);
  }
  function tick(now) {
    frame=0;
    var dt=last?Math.min((now-last)/1000,.033):.016;last=now;clock+=dt;
    // 질량 1, 강성 100, 감쇠 10. 방향을 바꿀 때에도 현재 속도를 이어간다.
    velocityX+=(100*(targetX-pointerX)-10*velocityX)*dt; pointerX+=velocityX*dt;
    velocityY+=(100*(targetY-pointerY)-10*velocityY)*dt; pointerY+=velocityY*dt;
    draw();
    if(!paused && !reduce.matches && inView && !document.hidden && !lost) frame=requestAnimationFrame(tick);
  }
  function fallback() { lost=true;art.dataset.renderer='poster';if(frame)cancelAnimationFrame(frame);frame=0; }
  function init() {
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
      if(!gl) return;
      lost=false;
      var vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('program unavailable');
      ['uTilt','uAngle','uAspect','uScale','uOffset'].forEach(function(n){uniforms[n]=gl.getUniformLocation(program,n);});
      meshes=[makeMesh(false),makeMesh(true)];gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      resize();art.dataset.renderer='webgl';syncMotion();
    } catch(e) { fallback(); }
  }
  canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();fallback();});
  canvas.addEventListener('webglcontextrestored',init);
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize',resize,{passive:true});
  init();syncMotion();
})();
