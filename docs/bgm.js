/* SC-KR 배경음 — YouTube 공식 임베드 플레이어 사용
 * 기본은 켜짐: 페이지가 열리면 바로 재생을 시작합니다.
 *  - 브라우저가 소리 있는 자동재생을 허용하면(이 사이트에서 자주 재생한 방문자 등) 그대로 소리와 함께 재생
 *  - 막히면 음소거 상태로 먼저 재생하고, 방문자의 첫 클릭/터치/키 입력 순간 소리를 켭니다
 * 헤더 버튼으로 끄면 그 방문자에게는 다음 방문에도 꺼진 상태로 유지되고, 재생 위치도 기억합니다.
 * YouTube 정책상 플레이어를 숨길 수 없어서, 재생 중에는 화면 구석에 작은 플레이어가 보입니다. */
(function () {
  'use strict';

  var VIDEO_ID = 'MLK-GoRQetE';   // [Playlist] 스타시티즌할때 듣는 노래 — AUTUMM
  var VOLUME = 35;                // 0 ~ 100
  var PREF_KEY = 'sckr-bgm';
  var POS_KEY = 'sckr-bgm-pos';

  var btn = document.getElementById('bgmToggle');
  var dock = document.getElementById('bgmDock');
  var hint = document.getElementById('bgmHint');
  if (!btn || !dock) return;

  var player = null, ready = false, playing = false, wantPlay = false, apiLoading = false, posTimer = null;
  var mutedAuto = false;   // 자동재생 정책 때문에 음소거로 재생 중

  function isKo() { return document.documentElement.lang !== 'en'; }
  function savePref(on) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (_) {} }
  function loadPref() { try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch (_) { return true; } }  // 기본 켜짐
  function savePos() {
    if (!ready || !player.getCurrentTime) return;
    try { localStorage.setItem(POS_KEY, String(Math.floor(player.getCurrentTime()))); } catch (_) {}
  }
  function loadPos() { try { return parseInt(localStorage.getItem(POS_KEY), 10) || 0; } catch (_) { return 0; } }

  function setUi(on) {
    playing = on;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    btn.classList.toggle('pending', on && mutedAuto);
    var label = on ? (isKo() ? '배경음 끄기' : 'Mute background music') : (isKo() ? '배경음 켜기' : 'Play background music');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    dock.hidden = !on;
    if (hint) {
      hint.hidden = !(on && mutedAuto);
      hint.textContent = isKo() ? '🔇 화면을 아무 곳이나 클릭하면 소리가 켜져요' : '🔇 Click anywhere to turn on the sound';
    }
  }

  /* ========== YouTube IFrame API ========== */
  function loadApi() {
    if (window.YT && window.YT.Player) { createPlayer(); return; }
    if (apiLoading) return;
    apiLoading = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      createPlayer();
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () { fail(); };
    document.head.appendChild(s);
  }

  function createPlayer() {
    if (player) return;
    player = new YT.Player('bgmPlayer', {
      videoId: VIDEO_ID,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0, controls: 1, loop: 1, playlist: VIDEO_ID,
        start: loadPos(), rel: 0, modestbranding: 1, playsinline: 1,
      },
      events: {
        onReady: function () {
          ready = true;
          player.setVolume(VOLUME);
          if (wantPlay) tryAutoplay();
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            if (wantPlay) setUi(true);
            clearInterval(posTimer);
            posTimer = setInterval(savePos, 5000);
          } else if (e.data === YT.PlayerState.PAUSED) {
            savePos();
            clearInterval(posTimer);
          } else if (e.data === YT.PlayerState.ENDED) {
            try { localStorage.setItem(POS_KEY, '0'); } catch (_) {}
          }
        },
        onError: function () { fail(); },
      },
    });
  }

  // 소리와 함께 재생을 먼저 시도하고, 막히면 음소거로 재생
  function tryAutoplay() {
    if (userActivated) { unmute(); player.playVideo(); return; }
    player.unMute();
    player.playVideo();
    setTimeout(function () {
      if (!wantPlay) return;
      var st = player.getPlayerState();
      var ok = (st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING) && !player.isMuted();
      if (!ok && !userActivated) {
        mutedAuto = true;
        player.mute();
        player.playVideo();
        setUi(true);
      }
    }, 1200);
  }

  function unmute() {
    if (!ready) return;
    player.unMute();
    player.setVolume(VOLUME);
    if (mutedAuto) { mutedAuto = false; setUi(playing); }
  }

  function fail() {
    wantPlay = false;
    mutedAuto = false;
    setUi(false);
    if (window.SCKR && SCKR.toast) SCKR.toast(isKo() ? '배경음을 불러오지 못했습니다.' : 'Could not load background music.');
  }

  /* ========== 재생 제어 ========== */
  function start() {
    wantPlay = true;
    setUi(true);
    if (ready) tryAutoplay();
    else loadApi();
  }
  function stop() {
    wantPlay = false;
    mutedAuto = false;
    if (ready) { player.pauseVideo(); savePos(); }
    clearInterval(posTimer);
    setUi(false);
  }

  // 첫 상호작용: 음소거 재생 중이면 소리 켜기
  var userActivated = false;
  function onFirstInteraction(e) {
    if (e && e.target && e.target.closest && e.target.closest('#bgmToggle, #bgmClose')) return; // 버튼은 따로 처리
    userActivated = true;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.removeEventListener(t, onFirstInteraction, true); });
    if (wantPlay) {
      if (ready) { unmute(); if (player.getPlayerState() !== YT.PlayerState.PLAYING) player.playVideo(); }
      else mutedAuto = false;
    }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.addEventListener(t, onFirstInteraction, true); });

  btn.addEventListener('click', function () {
    userActivated = true;
    if (playing) { stop(); savePref(false); } else { start(); savePref(true); }
  });
  document.getElementById('bgmClose').addEventListener('click', function () { stop(); savePref(false); btn.focus(); });

  // 언어 전환 시 라벨 갱신
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setUi(playing); });
  });
  window.addEventListener('pagehide', savePos);

  // 기본 켜짐: 페이지가 열리면 바로 재생 시작
  setUi(false);
  if (loadPref()) start();
})();
