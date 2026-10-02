/* SC-KR 우주 배경 — 반짝이는 별 3겹(스크롤 시 서로 다른 속도로 이동) + 가끔 지나가는 별똥별
 * 기기에서 '동작 줄이기'를 켠 경우 움직임 없이 별만 그립니다. 탭이 숨겨지면 멈춥니다. */
(function () {
  'use strict';

  var canvas = document.getElementById('spaceCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 깊이별 별 레이어: 개수(화면 100만 px당), 크기, 스크롤 시차
  var LAYERS = [
    { density: 260, size: [0.4, 0.9], alpha: [0.25, 0.6], parallax: 0.04 },
    { density: 110, size: [0.7, 1.3], alpha: [0.4, 0.85], parallax: 0.10 },
    { density: 28, size: [1.1, 1.9], alpha: [0.6, 1.0], parallax: 0.20 },
  ];
  var TINTS = ['255,255,255', '200,225,255', '169,156,255', '150,230,255', '255,236,210'];

  var W = 0, H = 0, dpr = 1, stars = [], meteors = [], nextMeteor = 0, running = false, raf = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (!running) draw(performance.now());
  }

  // 별은 화면보다 세로로 넉넉한 영역에 뿌려 두고, 스크롤 시차만큼 감아 돌림
  function seed() {
    stars = [];
    var area = W * H / 1e6;
    LAYERS.forEach(function (L, li) {
      var n = Math.round(L.density * area);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          tw: rand(0.6, 2.2),            // 반짝임 속도
          ph: Math.random() * Math.PI * 2,
          c: TINTS[Math.random() < 0.7 ? 0 : (1 + Math.floor(Math.random() * (TINTS.length - 1)))],
          p: L.parallax,
          glow: li === 2 && Math.random() < 0.35,
        });
      }
    });
  }

  function spawnMeteor(now) {
    var fromLeft = Math.random() < 0.5;
    var angle = rand(0.35, 0.6);           // 아래로 기울어진 각도 (라디안)
    var speed = rand(700, 1000);
    meteors.push({
      x: fromLeft ? rand(-0.1, 0.5) * W : rand(0.5, 1.1) * W,
      y: rand(-0.05, 0.35) * H,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(angle) * speed,
      len: rand(90, 160),
      born: now,
      life: rand(700, 1100),
    });
    nextMeteor = now + rand(5000, 11000);
  }

  var last = 0;
  function draw(now) {
    var dt = last ? Math.min(50, now - last) / 1000 : 0;
    last = now;
    var sy = window.scrollY || 0;
    var t = now / 1000;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = (s.y - sy * s.p) % H;
      if (y < 0) y += H;
      var a = reduce ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
      if (s.glow) {
        var g = ctx.createRadialGradient(s.x, y, 0, s.x, y, s.r * 5);
        g.addColorStop(0, 'rgba(' + s.c + ',' + (a * 0.5) + ')');
        g.addColorStop(1, 'rgba(' + s.c + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + s.c + ',' + a + ')';
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduce) {
      if (!nextMeteor) nextMeteor = now + rand(2000, 5000);
      if (now > nextMeteor) spawnMeteor(now);
      for (var m = meteors.length - 1; m >= 0; m--) {
        var M = meteors[m];
        var k = (now - M.born) / M.life;
        if (k >= 1) { meteors.splice(m, 1); continue; }
        M.x += M.vx * dt;
        M.y += M.vy * dt;
        var sp = Math.hypot(M.vx, M.vy);
        var tx = M.x - M.vx / sp * M.len, ty = M.y - M.vy / sp * M.len;
        var fade = Math.sin(Math.PI * k);
        var grad = ctx.createLinearGradient(M.x, M.y, tx, ty);
        grad.addColorStop(0, 'rgba(220,240,255,' + (0.9 * fade) + ')');
        grad.addColorStop(1, 'rgba(160,200,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(M.x, M.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }

    if (running) raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(draw);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  // 동작 줄이기 모드에서는 스크롤할 때만 다시 그림
  if (reduce) window.addEventListener('scroll', function () { draw(performance.now()); }, { passive: true });

  resize();
  start();
})();
