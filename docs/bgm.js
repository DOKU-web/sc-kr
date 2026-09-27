/* SC-KR 배경음
 * 기본은 켜짐. 브라우저가 클릭 전 소리 재생을 막기 때문에, 방문자의 첫 클릭/터치/키 입력 순간 재생을 시작합니다.
 * 헤더 버튼으로 끄면 그 방문자에게는 다음 방문에도 꺼진 상태로 유지되고, 재생 위치도 기억합니다.
 * 곡: "Jellyfish in Space" — Kevin MacLeod (incompetech.com), CC BY 4.0 (푸터에 출처 표기) */
(function () {
  'use strict';

  var SRC = 'bgm.mp3';
  var VOLUME = 0.35;       // 0 ~ 1
  var FADE_MS = 1500;
  var PREF_KEY = 'sckr-bgm';
  var POS_KEY = 'sckr-bgm-pos';

  var btn = document.getElementById('bgmToggle');
  var dock = document.getElementById('bgmDock');
  if (!btn || !dock) return;

  var audio = null, playing = false, pending = false, fadeTimer = null, posTimer = null;

  function isKo() { return document.documentElement.lang !== 'en'; }
  function savePref(on) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (_) {} }
  function loadPref() { try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch (_) { return true; } }  // 기본 켜짐
  function savePos() { if (audio) { try { localStorage.setItem(POS_KEY, String(Math.floor(audio.currentTime))); } catch (_) {} } }
  function loadPos() { try { return parseInt(localStorage.getItem(POS_KEY), 10) || 0; } catch (_) { return 0; } }

  function setUi(on, showDock) {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    var label = on ? (isKo() ? '배경음 끄기' : 'Mute background music') : (isKo() ? '배경음 켜기' : 'Play background music');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    dock.hidden = !(showDock === undefined ? on : showDock);
  }

  function fadeTo(target, done) {
    clearInterval(fadeTimer);
    var startVol = audio.volume, t0 = Date.now();
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / FADE_MS);
      audio.volume = startVol + (target - startVol) * k;
      if (k >= 1) { clearInterval(fadeTimer); if (done) done(); }
    }, 50);
  }

  function ensureAudio() {
    if (audio) return;
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    var pos = loadPos();
    if (pos) audio.addEventListener('loadedmetadata', function () {
      if (pos < audio.duration) audio.currentTime = pos;
    }, { once: true });
    audio.addEventListener('error', function () {
      playing = false;
      setUi(false);
      if (window.SCKR && SCKR.toast) SCKR.toast(isKo() ? '배경음을 불러오지 못했습니다.' : 'Could not load background music.');
    });
  }

  function start() {
    ensureAudio();
    playing = true;
    setUi(true);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { playing = false; setUi(false); });
    fadeTo(VOLUME);
    clearInterval(posTimer);
    posTimer = setInterval(savePos, 5000);
  }

  function stop() {
    playing = false;
    setUi(false);
    clearInterval(posTimer);
    if (!audio) return;
    savePos();
    fadeTo(0, function () { if (!playing) audio.pause(); });
  }

  /* ========== 첫 상호작용 대기 ========== */
  function clearPending() {
    pending = false;
    btn.classList.remove('pending');
    window.removeEventListener('pointerdown', resume, true);
    window.removeEventListener('keydown', resume, true);
    window.removeEventListener('touchstart', resume, true);
  }
  function resume(e) {
    if (e && e.target && e.target.closest && e.target.closest('#bgmToggle, #bgmDock')) return; // 버튼은 아래에서 처리
    clearPending();
    if (!playing) start();
  }

  btn.addEventListener('click', function () {
    if (pending) { clearPending(); setUi(false); savePref(false); return; }   // 재생 전에 끄기
    if (playing) { stop(); savePref(false); } else { start(); savePref(true); }
  });
  // 곡 이름 표시를 눌러도 끄기
  dock.addEventListener('click', function () { stop(); savePref(false); btn.focus(); });

  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setUi(playing || pending, playing); });
  });
  window.addEventListener('pagehide', savePos);
  // 탭을 숨기면 쉬고, 돌아오면 이어서
  document.addEventListener('visibilitychange', function () {
    if (!playing || !audio) return;
    if (document.hidden) { savePos(); audio.pause(); } else { audio.play().catch(function () {}); }
  });

  setUi(false);
  if (loadPref()) {
    pending = true;
    btn.classList.add('pending');
    setUi(true, false);   // 버튼은 켜짐으로 보이되, 재생 전이라 곡 이름은 숨김
    window.addEventListener('pointerdown', resume, true);
    window.addEventListener('keydown', resume, true);
    window.addEventListener('touchstart', resume, true);
  }
})();
