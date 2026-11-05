"use strict";
// 게임 밖에서 쓰는 한국어 채팅창입니다. 글이 오지 않으면 아무것도 다시 그리지 않습니다.
(function () {
  const { el, enter, notice, session, socket, t, translate } = window.Sckr;
  const KEEP = 200;
  const REASONS = ["abuse", "spam", "other"];
  const TEXT = {
    global: ["전체", "All"],
    party: ["파티", "Party"],
    newer: ["새 글 보기", "New messages"],
    placeholder: ["메시지 입력", "Type a message"],
    send: ["보내기", "Send"],
    report: ["신고", "Report"],
    abuse: ["욕설", "Abuse"],
    spam: ["도배", "Spam"],
    other: ["기타", "Other"],
    reported: ["신고했습니다.", "Reported."],
    report_limit: ["신고는 한 시간에 10번까지 할 수 있습니다.", "You can report up to 10 times an hour."],
    report_gone: ["이미 지워진 글입니다.", "That message is gone."],
    too_fast: ["너무 빠릅니다. 잠시 뒤에 보내세요.", "Too fast. Please wait a moment."],
    muted: ["채팅이 제한되어 있습니다.", "You are muted."],
    no_party: ["파티에 참가하면 열립니다.", "Join a party to open this tab."],
    send_failed: ["연결되어 있지 않아 보내지 못했습니다.", "Not connected. The message was not sent."],
  };

  const channels = {
    global: { log: document.getElementById("log-global"), tab: document.getElementById("tab-global"), badge: document.getElementById("badge-global"), sock: null, unread: 0 },
    party: { log: document.getElementById("log-party"), tab: document.getElementById("tab-party"), badge: document.getElementById("badge-party"), sock: null, unread: 0 },
  };
  const text = document.getElementById("text");
  const jump = document.getElementById("jump");
  let active = "global";

  const atBottom = (log) => log.scrollHeight - log.scrollTop - log.clientHeight < 40;

  function trim(log) {
    while (log.childElementCount > KEEP) log.firstElementChild.remove();
  }

  function system(name, message, bad) {
    const { log } = channels[name];
    const stick = atBottom(log);
    log.append(el("div", bad ? "system bad" : "system", message));
    trim(log);
    if (stick) log.scrollTop = log.scrollHeight;
  }

  function reportMenu(row, name, id) {
    const old = row.querySelector(".reasons");
    if (old) return old.remove();
    const menu = el("div", "reasons");
    for (const reason of REASONS) {
      const button = el("button", "", t(TEXT, reason));
      button.type = "button";
      button.addEventListener("click", () => {
        channels[name].sock.send({ t: "report", id, reason: t(TEXT, reason) });
        menu.remove();
      });
      menu.append(button);
    }
    row.querySelector(".body").append(menu);
  }

  function clock(ts) {
    return new Date(ts).toLocaleTimeString(session.lang === "en" ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  function add(name, m, fresh) {
    const channel = channels[name];
    const { log } = channel;
    const stick = atBottom(log);
    const mine = m.uid === session.user.uid;
    const row = el("div", "msg" + (mine ? " mine" : "") + (fresh ? " fresh" : ""));
    if (m.avatar) {
      const image = el("img", "avatar");
      image.alt = "";
      image.width = 22;
      image.height = 22;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.src = `https://cdn.discordapp.com/avatars/${encodeURIComponent(m.uid)}/${encodeURIComponent(m.avatar)}.png?size=44`;
      row.append(image);
    } else row.append(el("div", "avatar"));
    const body = el("div", "body");
    body.append(el("span", "name", m.name), el("span", "time", clock(m.ts)), el("div", "line", m.text));
    row.append(body);
    if (!mine) {
      const button = el("button", "report", t(TEXT, "report"));
      button.type = "button";
      button.addEventListener("click", () => reportMenu(row, name, m.id));
      row.append(button);
    }
    log.append(row);
    trim(log);
    if (stick) log.scrollTop = log.scrollHeight;
    else if (name === active) jump.hidden = false;
    if (name !== active && fresh) {
      channel.unread++;
      channel.badge.textContent = String(channel.unread);
      channel.badge.hidden = false;
    }
  }

  function receive(name, m) {
    switch (m.t) {
      case "hello":
        channels[name].log.replaceChildren();
        for (const row of m.history) add(name, row, false);
        return;
      case "chat":
        return add(name, m, true);
      case "report-ok":
        return system(name, t(TEXT, m.ok ? "reported" : "report_limit"));
      case "err":
        return system(name, t(TEXT, m.code), true);
      case "kicked":
      case "banned":
      case "left":
        return system(name, t(TEXT, m.t), true);
    }
  }

  function select(name) {
    active = name;
    for (const key of Object.keys(channels)) {
      const channel = channels[key];
      channel.log.hidden = key !== name;
      channel.tab.setAttribute("aria-selected", key === name ? "true" : "false");
    }
    const channel = channels[name];
    channel.unread = 0;
    channel.badge.hidden = true;
    channel.log.scrollTop = channel.log.scrollHeight;
    jump.hidden = true;
    text.focus();
  }

  function connect(name, path) {
    channels[name].sock = socket(path, {
      message: (m) => receive(name, m),
      lost: () => system(name, t(TEXT, "offline")),
      gone: (why) => { if (why) system(name, t(TEXT, why), true); },
    });
  }

  function send() {
    const value = text.value.trim();
    if (!value) return;
    if (!channels[active].sock || !channels[active].sock.send({ t: "chat", text: value })) return system(active, t(TEXT, "send_failed"), true);
    text.value = "";
  }

  // 한글 조합 중의 Enter는 글자를 확정하는 키입니다. 여기서 보내면 마지막 글자가 두 번 나갑니다.
  text.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) return;
    send();
  });
  document.getElementById("form").addEventListener("submit", (e) => {
    e.preventDefault();
    send();
  });
  channels.global.tab.addEventListener("click", () => select("global"));
  channels.party.tab.addEventListener("click", () => select("party"));
  jump.addEventListener("click", () => {
    const { log } = channels[active];
    log.scrollTop = log.scrollHeight;
    jump.hidden = true;
  });
  for (const name of Object.keys(channels)) {
    channels[name].log.addEventListener("scroll", () => {
      if (name === active && atBottom(channels[name].log)) jump.hidden = true;
    }, { passive: true });
  }

  enter().then(() => {
    translate(TEXT);
    connect("global", "/ws/global");
    if (session.code) {
      channels.party.tab.disabled = false;
      connect("party", `/ws/party/${encodeURIComponent(session.code)}?role=chat`);
    } else channels.party.tab.title = t(TEXT, "no_party");
    text.focus();
  }).catch((error) => {
    translate(TEXT);
    notice(t(TEXT, error.message), true);
  });

  // 200개 유지 시험에 씁니다
  window.SckrChat = { receive };
})();
