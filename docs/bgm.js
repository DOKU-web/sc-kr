/* SC-KR 배경음 — YouTube 공식 임베드 플레이어 사용
 * 기본은 켜짐. 브라우저가 클릭 전 소리 재생을 막기 때문에, 방문자의 첫 클릭/터치/키 입력 순간 재생을 시작합니다.
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
  if (!btn || !dock) return;

  var player = null, ready = false, playing = false, wantPlay = false, apiLoading = false, posTimer = null;

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

  var pending = false;   // 켜짐 상태지만 첫 상호작용을 기다리는 중
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
  document.getElementById('bgmClose').addEventListener('click', function () { stop(); savePref(false); btn.focus(); });

  // 언어 전환 시 라벨 갱신
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setUi(playing); });
  });
  window.addEventListener('pagehide', savePos);

  // 켜짐 상태면 첫 상호작용에 재생 시작 (브라우저 자동재생 정책)
  setUi(false);
  if (loadPref()) {
    pending = true;
    btn.classList.add('pending', 'on');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', isKo() ? '배경음 끄기' : 'Mute background music');
    btn.title = btn.getAttribute('aria-label');
    window.addEventListener('pointerdown', resume, true);
    window.addEventListener('keydown', resume, true);
    window.addEventListener('touchstart', resume, true);
  }
})();
