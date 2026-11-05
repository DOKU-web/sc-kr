"use strict";
// 게임 창을 캡처해 SFU로 보냅니다. 보는 사람이 없으면 인코딩과 연결을 완전히 닫습니다.
(function () {
  const { enter, notice, session, socket, t, translate } = window.Sckr;

  // 서버의 HIGH_KBPS, LOW_KBPS, RID_HIGH, RID_LOW와 같은 값입니다.
  const HIGH = { rid: "f", maxBitrate: 2000000, maxFramerate: 30 };
  // 288p 이하는 RTX 3060 + Edge 156에서 소프트웨어 인코더로 넘어가 360p로 보냅니다.
  const LOW = { rid: "q", scaleResolutionDownBy: 2, maxBitrate: 200000, maxFramerate: 15 };
  const SEND_FPS = 30;
  // 캡처를 끄면 다시 켤 때 창 선택이 또 뜹니다. 게임 중에는 고를 수 없어 초당 1장으로만 낮춥니다.
  const IDLE_FPS = 1;
  const FIRST_CHECK_MS = 4000;
  const CHECK_EVERY_MS = 30000;
  const CONNECT_LIMIT_MS = 20000;
  const SOFTWARE = /openh264|libvpx|libaom|x264|ffmpeg|software/i;
  const HARDWARE = /mediafoundation|accelerator|nvenc|nvidia|qsv|quick ?sync|amf|d3d/i;

  const TEXT = {
    off: ["관전 허용 꺼짐", "Spectating off"],
    on: ["관전 허용 켜짐", "Spectating on"],
    hint: ["켜려면 스타시티즌 창을 고르세요.", "Pick the Star Citizen window to turn on."],
    idle: ["보는 사람이 없어 인코딩을 멈췄습니다.", "Nobody is watching. Encoding is stopped."],
    watching: ["관전 중 {n}명", "{n} watching"],
    starting: ["송출을 시작하는 중…", "Starting…"],
    hw: ["하드웨어 인코더 사용 중", "Using the hardware encoder"],
    unknown_encoder: ["인코더를 확인하는 중…", "Checking the encoder…"],
    turn_on: ["켜기", "Turn on"],
    turn_off: ["끄기", "Turn off"],
    borderless: ["게임은 테두리 없는 창모드로 실행하세요.", "Run the game in borderless windowed mode."],
    pick_window: ["전체 화면이 아니라 게임 창을 골라 주세요.", "Please pick the game window, not the whole screen."],
    canceled: ["창을 고르지 않아 켜지 않았습니다.", "No window was picked, so spectating stayed off."],
    no_capture: ["이 브라우저에서는 화면 캡처를 쓸 수 없습니다.", "This browser cannot capture the screen."],
    software: ["하드웨어 인코더를 쓸 수 없어 송출을 멈췄습니다. 게임에 부담이 가지 않도록 CPU 인코딩은 쓰지 않습니다.", "Stopped: no hardware encoder is available. CPU encoding is not used, to protect game performance."],
    capture_ended: ["게임 창 캡처가 끝나 관전 허용을 껐습니다.", "The game window capture ended, so spectating is off."],
    sfu_off: ["관전 서버가 설정되지 않았습니다.", "The spectate server is not set up."],
    start_failed: ["송출을 시작하지 못했습니다. 다시 켜 주세요.", "Could not start sending. Please turn it on again."],
  };

  const pill = document.getElementById("pill");
  const state = document.getElementById("state");
  const detail = document.getElementById("detail");
  const toggle = document.getElementById("toggle");

  let sock = null;
  let track = null;
  let pc = null;
  let iceServers = [];
  let viewers = 0;
  let live = false;
  let encoder = "";
  let run = 0;
  let checkTimer = 0;
  let limitTimer = 0;
  let retried = false;

  function render() {
    const on = !!track;
    pill.classList.toggle("on", on);
    pill.classList.toggle("live", live);
    toggle.textContent = t(TEXT, on ? "turn_off" : "turn_on");
    state.textContent = on && viewers > 0 ? t(TEXT, "watching").replace("{n}", String(viewers)) : t(TEXT, on ? "on" : "off");
    if (!on) detail.textContent = t(TEXT, "hint");
    else if (!pc) detail.textContent = t(TEXT, "idle");
    else if (!live) detail.textContent = t(TEXT, "starting");
    else detail.textContent = t(TEXT, encoder === "hardware" ? "hw" : "unknown_encoder");
  }

  function setRate(fps) {
    if (!track) return Promise.resolve();
    return track.applyConstraints({ width: { max: 1280 }, height: { max: 720 }, frameRate: { max: fps } }).catch((error) => console.warn("frame rate", error));
  }

  function closePeer() {
    run++;
    clearTimeout(checkTimer);
    clearTimeout(limitTimer);
    if (pc) pc.close();
    pc = null;
    live = false;
    encoder = "";
  }

  function turnOff(reason) {
    const wasOn = !!track;
    closePeer();
    if (track) {
      track.onended = null;
      track.stop();
    }
    track = null;
    viewers = 0;
    if (wasOn && sock) sock.send({ t: "share", on: false });
    render();
    if (reason) notice(t(TEXT, reason), reason !== "capture_ended");
  }

  async function turnOn() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return notice(t(TEXT, "no_capture"), true);
    notice("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { max: 1280 }, height: { max: 720 }, frameRate: { max: SEND_FPS } },
        audio: false,
        // 다른 창이나 전체 화면이 시청자에게 보이지 않도록 고를 수 있는 대상을 좁힙니다
        monitorTypeSurfaces: "exclude",
        selfBrowserSurface: "exclude",
        surfaceSwitching: "exclude",
        systemAudio: "exclude",
      });
    } catch {
      return notice(t(TEXT, "canceled"));
    }
    const picked = stream.getVideoTracks()[0];
    if (picked.getSettings().displaySurface !== "window") {
      picked.stop();
      return notice(t(TEXT, "pick_window"), true);
    }
    picked.contentHint = "motion";
    picked.onended = () => turnOff("capture_ended");
    track = picked;
    retried = false;
    await setRate(IDLE_FPS);
    sock.send({ t: "share", on: true });
    render();
  }

  function preferH264(transceiver) {
    const codecs = RTCRtpSender.getCapabilities("video").codecs;
    const isH264 = (codec) => codec.mimeType.toLowerCase() === "video/h264";
    transceiver.setCodecPreferences([...codecs.filter(isH264), ...codecs.filter((codec) => !isH264(codec))]);
  }

  async function checkEncoder() {
    if (!pc) return;
    const peer = pc;
    const names = [];
    (await peer.getStats()).forEach((s) => {
      if (s.type === "outbound-rtp" && s.kind === "video" && s.encoderImplementation) names.push(s.encoderImplementation);
    });
    if (peer !== pc) return;
    if (names.some((name) => SOFTWARE.test(name))) return turnOff("software");
    encoder = names.length > 0 && names.every((name) => HARDWARE.test(name)) ? "hardware" : "";
    render();
    checkTimer = setTimeout(checkEncoder, CHECK_EVERY_MS);
  }

  // 연결이 끊기면 한 번만 다시 시도합니다. 서버에 껐다 켰다고 알리면 트랙을 새로 받습니다.
  function recover() {
    closePeer();
    if (!track) return;
    if (retried) return turnOff("start_failed");
    retried = true;
    sock.send({ t: "share", on: false });
    sock.send({ t: "share", on: true });
    render();
  }

  async function startSending() {
    closePeer();
    const mine = run;
    await setRate(SEND_FPS);
    if (mine !== run || !track) return;
    const peer = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    pc = peer;
    render();
    peer.onconnectionstatechange = () => {
      if (peer !== pc) return;
      if (peer.connectionState === "connected" && !live) {
        clearTimeout(limitTimer);
        live = true;
        sock.send({ t: "pub-live" });
        checkTimer = setTimeout(checkEncoder, FIRST_CHECK_MS);
        render();
      } else if (peer.connectionState === "failed") recover();
    };
    const transceiver = peer.addTransceiver(track, { direction: "sendonly", sendEncodings: [HIGH, LOW] });
    preferH264(transceiver);
    await peer.setLocalDescription(await peer.createOffer());
    if (mine !== run) return;
    sock.send({ t: "pub-offer", sdp: peer.localDescription.sdp, mid: transceiver.mid });
    limitTimer = setTimeout(() => { if (peer === pc && !live) recover(); }, CONNECT_LIMIT_MS);
  }

  function stopSending() {
    closePeer();
    setRate(IDLE_FPS);
    render();
  }

  function receive(m) {
    switch (m.t) {
      case "hello":
        // 서버는 다시 연결한 소켓을 꺼진 상태로 봅니다. 캡처가 살아 있으면 다시 알립니다.
        closePeer();
        notice("");
        toggle.disabled = false;
        sock.send({ t: "ice" });
        if (track) sock.send({ t: "share", on: true });
        return render();
      case "ice":
        iceServers = m.iceServers;
        return;
      case "pub-demand":
        if (m.on) startSending().catch((error) => {
          console.error("start", error);
          recover();
        });
        else stopSending();
        return;
      case "pub-answer":
        if (pc) pc.setRemoteDescription({ type: "answer", sdp: m.sdp }).catch((error) => {
          console.error("answer", error);
          recover();
        });
        return;
      case "viewers":
        viewers = m.n;
        return render();
      case "err":
        if (m.code === "sfu_off") turnOff("sfu_off");
        else if (m.code !== "no_demand") console.warn("server", m.code);
        return;
      case "kicked":
      case "banned":
      case "left":
        return turnOff(m.t);
    }
  }

  toggle.addEventListener("click", () => {
    if (track) turnOff();
    else turnOn();
  });

  enter().then(() => {
    translate(TEXT);
    render();
    if (!session.code) throw new Error("reopen");
    sock = socket(`/ws/party/${encodeURIComponent(session.code)}?role=pub`, {
      message: receive,
      lost: () => {
        closePeer();
        toggle.disabled = true;
        notice(t(TEXT, "offline"));
      },
      gone: (why) => {
        turnOff();
        toggle.disabled = true;
        if (why) notice(t(TEXT, why), true);
      },
    });
  }).catch((error) => {
    translate(TEXT);
    notice(t(TEXT, error.message), true);
  });
})();
