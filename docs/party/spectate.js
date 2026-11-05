"use strict";
// 파티원 캠을 그리드로 보여 줍니다. 화면에 있는 캠만 서버에 요청합니다.
(function () {
  const { el, enter, notice, session, socket, t, translate } = window.Sckr;
  const PER_PAGE = 9;
  // 끊은 트랙의 자리가 SDP에 쌓입니다. 많아지면 연결을 새로 만듭니다.
  const MAX_LINES = 30;
  const VIEW_DELAY_MS = 60;
  const DECODER_CHECK_MS = 5000;

  const TEXT = {
    effect: ["효과", "Effect"],
    strength: ["효과 강도", "Effect strength"],
    prev: ["이전", "Prev"],
    next: ["다음", "Next"],
    prev_cam: ["이전 캠", "Previous cam"],
    next_cam: ["다음 캠", "Next cam"],
    back: ["그리드로", "Back to grid"],
    empty: ["아직 관전 허용을 켠 파티원이 없습니다.", "No party member has turned on spectating yet."],
    waiting: ["연결 중", "Connecting"],
    low_only: ["이번 달 사용량이 많아 저화질로만 보입니다", "Low quality only: monthly usage is high"],
    hd_off: ["파티장이 고화질을 껐습니다", "The party owner turned off HD"],
    stopped: ["이번 달 관전 사용량을 모두 써서 멈췄습니다.", "Spectating is stopped: the monthly limit was reached."],
    spectate_off: ["이번 달 관전 사용량을 모두 써서 멈췄습니다.", "Spectating is stopped: the monthly limit was reached."],
    spectate_full: ["관전 인원이 가득 찼습니다.", "The spectator limit is full."],
    sfu_off: ["관전 서버가 설정되지 않았습니다.", "The spectate server is not set up."],
    track_failed: ["캠 하나를 받지 못했습니다.", "One cam could not be loaded."],
    decoder_hw: ["하드웨어 디코딩", "Hardware decoding"],
    decoder_sw: ["소프트웨어 디코딩", "Software decoding"],
  };

  const grid = document.getElementById("grid");
  const big = document.getElementById("big");
  const bigVideo = document.getElementById("big-video");
  const bigName = document.getElementById("big-name");
  const empty = document.getElementById("empty");
  const pager = document.getElementById("pager");
  const quality = document.getElementById("quality");
  const decoder = document.getElementById("decoder");
  const fxOn = document.getElementById("fx-on");
  const fxLevel = document.getElementById("fx-level");

  const tiles = new Map();
  const tracks = new Map();
  let subs = [];
  let party = null;
  let sock = null;
  let pc = null;
  let iceServers = [];
  let page = 0;
  let selected = null;
  let viewTimer = 0;
  let decoderTimer = 0;
  let fx = null;

  const read = (key, fallback) => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // 저장하지 못해도 이번 창에서는 동작합니다
    }
  };

  function nameOf(uid) {
    const member = party && party.members.find((m) => m.uid === uid);
    return member ? member.name : uid;
  }

  // 관전 허용을 켠 사람만 보여 줍니다. 자기 자신은 뺍니다.
  function sharers() {
    if (!party) return [];
    return party.members.map((m) => m.uid).filter((uid) => uid !== session.user.uid && party.sharing.includes(uid));
  }

  const pageCount = () => Math.max(1, Math.ceil(sharers().length / PER_PAGE));
  const pageUids = () => sharers().slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // 창이 내려가면 빈 목록을 보내 모든 영상을 끊습니다. 크게 볼 때는 그리드가 안 보여 받지 않습니다.
  function sendView() {
    clearTimeout(viewTimer);
    viewTimer = setTimeout(() => {
      if (!sock) return;
      if (document.hidden) sock.send({ t: "view", grid: [], big: null });
      else if (selected) sock.send({ t: "view", grid: [], big: selected });
      else sock.send({ t: "view", grid: pageUids(), big: null });
    }, VIEW_DELAY_MS);
  }

  function trackOf(uid) {
    const sub = subs.find((s) => s.uid === uid);
    return sub ? tracks.get(sub.mid) : undefined;
  }

  function attach(video, uid) {
    const track = trackOf(uid) || null;
    const current = video.srcObject ? video.srcObject.getVideoTracks()[0] : null;
    if (track === current) return;
    video.srcObject = track ? new MediaStream([track]) : null;
    if (track) video.play().catch(() => undefined);
  }

  function attachAll() {
    for (const [uid, tile] of tiles) {
      attach(tile.video, uid);
      tile.wait.hidden = !!trackOf(uid);
    }
    if (selected) attach(bigVideo, selected);
  }

  function makeTile(uid) {
    const node = el("button", "tile fx");
    node.type = "button";
    const video = el("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    const wait = el("span", "wait", t(TEXT, "waiting"));
    const hud = el("span", "hud");
    const name = el("b");
    hud.append(name, el("span", "rec", "● REC"), el("time", "clock"));
    node.append(video, wait, hud);
    node.addEventListener("click", () => openBig(uid));
    const tile = { node, video, wait, name };
    tiles.set(uid, tile);
    return tile;
  }

  function renderGrid() {
    const uids = pageUids();
    for (const [uid, tile] of tiles) {
      if (!uids.includes(uid)) {
        tile.video.srcObject = null;
        tile.node.remove();
        tiles.delete(uid);
      }
    }
    uids.forEach((uid) => {
      const tile = tiles.get(uid) || makeTile(uid);
      tile.name.textContent = nameOf(uid);
      grid.append(tile.node);
    });
    grid.style.setProperty("--cols", String(uids.length <= 1 ? 1 : uids.length <= 4 ? 2 : 3));
    const none = sharers().length === 0;
    empty.hidden = !none || !!selected;
    grid.hidden = none || !!selected;
    pager.hidden = pageCount() <= 1 || !!selected;
    document.getElementById("page").textContent = `${page + 1} / ${pageCount()}`;
    document.getElementById("prev").disabled = page === 0;
    document.getElementById("next").disabled = page >= pageCount() - 1;
    attachAll();
  }

  function renderQuality() {
    const key = !party ? "" : party.mode === "off" ? "stopped" : party.mode === "low" ? "low_only" : party.hdAllowed ? "" : "hd_off";
    quality.hidden = !key;
    quality.textContent = key ? t(TEXT, key) : "";
  }

  function render() {
    document.getElementById("title").textContent = party ? party.name : "";
    if (selected && !sharers().includes(selected)) closeBig();
    page = Math.min(page, pageCount() - 1);
    renderGrid();
    renderQuality();
  }

  function applyFx() {
    const on = fxOn.checked;
    const level = Number(fxLevel.value) / 100;
    document.body.classList.toggle("fx-off", !on);
    document.body.style.setProperty("--fx-level", String(level));
    fxLevel.disabled = !on;
    big.classList.toggle("gl", !!fx && on);
    document.getElementById("big-canvas").hidden = !fx || !on;
    if (fx) {
      fx.level(level);
      if (on && selected) fx.start();
      else fx.stop();
    }
    write("sckr.fx.on", on ? "1" : "0");
    write("sckr.fx.level", fxLevel.value);
  }

  function openBig(uid) {
    selected = uid;
    bigName.textContent = nameOf(uid);
    big.hidden = false;
    applyFx();
    render();
    sendView();
  }

  function closeBig() {
    selected = null;
    big.hidden = true;
    bigVideo.srcObject = null;
    if (fx) fx.stop();
    render();
    sendView();
  }

  function stepBig(by) {
    const uids = sharers();
    if (uids.length === 0) return;
    openBig(uids[(uids.indexOf(selected) + by + uids.length) % uids.length]);
  }

  function dropPeer() {
    if (pc) pc.close();
    pc = null;
    tracks.clear();
    subs = [];
    attachAll();
  }

  async function checkDecoder() {
    decoderTimer = 0;
    if (!pc) return;
    let found = null;
    (await pc.getStats()).forEach((s) => {
      if (s.type === "inbound-rtp" && s.kind === "video" && s.framesDecoded > 0 && s.decoderImplementation) found = s;
    });
    if (found) decoder.textContent = t(TEXT, found.powerEfficientDecoder ? "decoder_hw" : "decoder_sw");
  }

  function peer() {
    if (pc) return pc;
    const next = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    next.ontrack = (e) => {
      tracks.set(e.transceiver.mid, e.track);
      attachAll();
      if (!decoderTimer) decoderTimer = setTimeout(checkDecoder, DECODER_CHECK_MS);
    };
    next.onconnectionstatechange = () => {
      if (next === pc && next.connectionState === "failed") sock.send({ t: "reset" });
    };
    pc = next;
    return next;
  }

  async function onOffer(sdp) {
    const connection = peer();
    await connection.setRemoteDescription({ type: "offer", sdp });
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    sock.send({ t: "answer", sdp: answer.sdp });
  }

  function receive(m) {
    switch (m.t) {
      case "hello":
        notice("");
        party = m.party;
        sock.send({ t: "ice" });
        return render();
      case "ice":
        iceServers = m.iceServers;
        return sendView();
      case "roster":
        party = m.party;
        render();
        return sendView();
      case "live":
      case "ended":
        return sendView();
      case "sfu-offer":
        onOffer(m.sdp).catch((error) => {
          console.error("offer", error);
          sock.send({ t: "reset" });
        });
        return;
      case "view-state":
        subs = m.subs;
        return attachAll();
      case "answer-ok":
        if (pc && pc.getTransceivers().length > MAX_LINES) sock.send({ t: "reset" });
        return;
      case "reset-ok":
        dropPeer();
        return sendView();
      case "err":
        if (m.code in TEXT) notice(t(TEXT, m.code), true);
        else console.warn("server", m.code);
        return;
      case "kicked":
      case "banned":
      case "left":
        dropPeer();
        party = null;
        render();
        return notice(t(TEXT, m.t), true);
    }
  }

  function tick() {
    if (document.hidden) return;
    const time = new Date();
    const now = [time.getHours(), time.getMinutes(), time.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
    document.querySelectorAll(".clock").forEach((node) => { node.textContent = now; });
  }

  document.addEventListener("visibilitychange", sendView);
  document.getElementById("prev").addEventListener("click", () => {
    page--;
    render();
    sendView();
  });
  document.getElementById("next").addEventListener("click", () => {
    page++;
    render();
    sendView();
  });
  document.getElementById("big-back").addEventListener("click", closeBig);
  document.getElementById("big-prev").addEventListener("click", () => stepBig(-1));
  document.getElementById("big-next").addEventListener("click", () => stepBig(1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && selected) closeBig();
  });
  fxOn.addEventListener("change", applyFx);
  fxLevel.addEventListener("input", applyFx);

  enter().then(() => {
    translate(TEXT);
    fxOn.checked = read("sckr.fx.on", "1") === "1";
    fxLevel.value = read("sckr.fx.level", "60");
    document.body.style.setProperty("--noise", `url("${window.SckrFx.noiseImage()}")`);
    fx = window.SckrFx.create(document.getElementById("big-canvas"), bigVideo);
    applyFx();
    render();
    setInterval(tick, 1000);
    tick();
    if (!session.code) throw new Error("reopen");
    sock = socket(`/ws/party/${encodeURIComponent(session.code)}?role=view`, {
      message: receive,
      lost: () => {
        dropPeer();
        notice(t(TEXT, "offline"));
      },
      gone: (why) => {
        dropPeer();
        if (why) notice(t(TEXT, why), true);
      },
    });
  }).catch((error) => {
    translate(TEXT);
    notice(t(TEXT, error.message), true);
  });

  // 효과가 실제로 그려지는지 시험에서 확인합니다
  window.SckrSpectate = { get frames() { return fx ? fx.frames : 0; } };
})();
