/* SC-KR 배경음 — YouTube 공식 임베드 플레이어 사용
 * 브라우저가 소리 자동재생을 막기 때문에 기본은 꺼짐. 헤더의 버튼으로 켜고 끄며, 켠 상태와 재생 위치를 기억했다가
 * 다음 방문 때 첫 클릭/키 입력에 이어서 재생합니다.
 * YouTube 정책상 플레이어를 숨길 수 없어서, 재생 중에는 화면 구석에 작은 플레이어가 보입니다. */
(function () {
  'use strict';

  var VIDEO_ID = 'MLK-GoRQetE';   // [Playlist] 스타시티즌할때 듣는 노래 — AUTUMM
  var VOLUME = 35;                // 0 ~ 100
  var PREF_KEY = 'sckr-bgm';
  var POS_KEY = 'sckr-bgm-pos';

  var btn = document.getElementById('bgmToggle');
  var dock = document.getElementById('bgmDock');
  if (!btn || !dock) return;

  var player = null, ready = false, playing = false, wantPlay = false, apiLoading = false, posTimer = null;

  function isKo() { return document.documentElement.lang !== 'en'; }
  function savePref(on) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (_) {} }
  function loadPref() { try { return localStorage.getItem(PREF_KEY) === 'on'; } catch (_) { return false; } }
  function savePos() {
    if (!ready || !player.getCurrentTime) return;
    try { localStorage.setItem(POS_KEY, String(Math.floor(player.getCurrentTime()))); } catch (_) {}
  }
  function loadPos() { try { return parseInt(localStorage.getItem(POS_KEY), 10) || 0; } catch (_) { return 0; } }

  function setUi(on) {
    playing = on;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    var label = on ? (isKo() ? '배경음 끄기' : 'Mute background music') : (isKo() ? '배경음 켜기' : 'Play background music');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    dock.hidden = !on;
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
          if (wantPlay) player.playVideo();
        },
        onStateChange: function (e) {
          // 플레이어 안에서 직접 재생/정지해도 버튼 상태를 맞춤
          if (e.data === YT.PlayerState.PLAYING) {
            setUi(true);
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

  function fail() {
    wantPlay = false;
    setUi(false);
    savePref(false);
    if (window.SCKR && SCKR.toast) SCKR.toast(isKo() ? '배경음을 불러오지 못했습니다.' : 'Could not load background music.');
  }

  /* ========== 재생 제어 ========== */
  function start() {
    wantPlay = true;
    setUi(true);
    if (ready) player.playVideo();
    else loadApi();
  }
  function stop() {
    wantPlay = false;
    if (ready) { player.pauseVideo(); savePos(); }
    clearInterval(posTimer);
    setUi(false);
  }

  btn.addEventListener('click', function () {
    if (playing) { stop(); savePref(false); } else { start(); savePref(true); }
  });
  document.getElementById('bgmClose').addEventListener('click', function () { stop(); savePref(false); btn.focus(); });

  // 언어 전환 시 라벨 갱신
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setUi(playing); });
  });
  window.addEventListener('pagehide', savePos);

  // 이전에 켜 두었다면 첫 상호작용에 이어서 재생 (브라우저 자동재생 정책)
  setUi(false);
  if (loadPref()) {
    btn.classList.add('pending');
    var resume = function (e) {
      if (e && e.target && e.target.closest && e.target.closest('#bgmToggle, #bgmDock')) return;
      window.removeEventListener('pointerdown', resume, true);
      window.removeEventListener('keydown', resume, true);
      btn.classList.remove('pending');
      if (!playing) start();
    };
    window.addEventListener('pointerdown', resume, true);
    window.addEventListener('keydown', resume, true);
  }
})();
