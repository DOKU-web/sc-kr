"use strict";
// 채팅, 관전, 송출, 관리자 페이지가 함께 쓰는 입장과 연결 코드입니다.
(function () {
  const PROTOCOL = "sckr.v1";
  const PING_MS = 30000;
  const RETRY_MAX_MS = 30000;
  // 서버가 연결을 거절한 까닭은 브라우저가 알려 주지 않습니다. 한 번도 못 붙으면 몇 번만 시도합니다.
  const REFUSED_AFTER = 3;
  // 다시 연결해도 소용없는 닫힘입니다: 나감, 다른 창으로 교체, 강퇴와 밴
  const FINAL_CLOSE = [4000, 4001, 4003];

  const STR = {
    reopen: ["런처에서 창을 다시 열어 주세요.", "Please reopen this window from the launcher."],
    connecting: ["연결 중…", "Connecting…"],
    offline: ["연결이 끊겨 다시 연결하는 중입니다.", "Disconnected. Reconnecting…"],
    replaced: ["다른 창에서 연결되어 이 창은 멈췄습니다.", "This window stopped because another one connected."],
    kicked: ["이 파티에서 강퇴되었습니다.", "You were removed from this party."],
    banned: ["이용이 제한된 계정입니다.", "This account is restricted."],
    left: ["파티를 나갔습니다.", "You left the party."],
    not_member: ["이 파티의 파티원이 아닙니다.", "You are not a member of this party."],
    not_found: ["파티를 찾을 수 없습니다.", "Party not found."],
    forbidden: ["권한이 없습니다.", "You do not have permission."],
    server_error: ["서버 오류입니다. 잠시 뒤에 다시 시도하세요.", "Server error. Please try again."],
    refused: ["연결할 수 없습니다. 파티원인지 확인하고 런처에서 창을 다시 열어 주세요.", "Could not connect. Check that you are in this party, then reopen this window from the launcher."],
  };

  const session = { token: null, user: null, expires: 0, code: null, lang: "ko" };
  const api = String(window.SCKR_API).replace(/\/+$/, "");
  let box = null;

  function t(table, key) {
    const row = (table && table[key]) || STR[key];
    return row ? row[session.lang === "en" ? 1 : 0] : key;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    // 사용자 글은 항상 textContent로 넣습니다. innerHTML을 쓰지 않습니다.
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function notice(text, bad) {
    if (!box) {
      box = el("div", "notice");
      box.setAttribute("role", "status");
      document.body.append(box);
    }
    box.hidden = !text;
    box.textContent = text || "";
    box.classList.toggle("bad", !!bad);
  }

  // 페이지 안의 글자를 표시 언어로 바꿉니다. data-t="키" 형식입니다.
  function translate(table) {
    document.documentElement.lang = session.lang;
    document.querySelectorAll("[data-t]").forEach((node) => { node.textContent = t(table, node.dataset.t); });
    document.querySelectorAll("[data-t-title]").forEach((node) => { node.title = t(table, node.dataset.tTitle); });
    document.querySelectorAll("[data-t-place]").forEach((node) => { node.placeholder = t(table, node.dataset.tPlace); });
  }

  async function req(path, body) {
    const res = await fetch(api + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(session.token ? { Authorization: "Bearer " + session.token } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new Error((data && data.error) || "server_error");
      error.status = res.status;
      throw error;
    }
    return data;
  }

  // 입장권은 주소의 # 뒤로만 받으므로 서버 로그에 남지 않습니다. 읽자마자 주소에서 지웁니다.
  async function enter() {
    const hash = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, "", location.pathname);
    session.lang = hash.get("lang") === "en" ? "en" : "ko";
    session.code = hash.get("p");
    const ticket = hash.get("t");
    if (!ticket) throw new Error("reopen");
    let done;
    try {
      done = await req("/auth/redeem", { ticket });
    } catch (error) {
      if (error.status === 401) throw new Error("reopen");
      throw error;
    }
    session.token = done.token;
    session.user = done.user;
    session.expires = done.expires;
    return session;
  }

  function socket(path, handlers) {
    let ws = null;
    let ping = 0;
    let retry = 0;
    let tries = 0;
    let closed = false;
    let opened = false;
    let down = false;

    function open() {
      if (Date.now() >= session.expires) {
        closed = true;
        return handlers.gone && handlers.gone("reopen");
      }
      ws = new WebSocket(api.replace(/^http/, "ws") + path, [PROTOCOL, "tok." + session.token]);
      ws.onopen = () => {
        tries = 0;
        opened = true;
        down = false;
        ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, PING_MS);
      };
      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        let message = null;
        try {
          message = JSON.parse(e.data);
        } catch {
          return;
        }
        handlers.message(message);
      };
      ws.onclose = (e) => {
        clearInterval(ping);
        if (closed) return;
        if (FINAL_CLOSE.includes(e.code)) {
          closed = true;
          return handlers.gone && handlers.gone(e.code === 4001 ? "replaced" : null);
        }
        if (!opened && tries + 1 >= REFUSED_AFTER) {
          closed = true;
          return handlers.gone && handlers.gone("refused");
        }
        if (opened && !down) {
          down = true;
          if (handlers.lost) handlers.lost();
        }
        retry = setTimeout(open, Math.min(RETRY_MAX_MS, 1000 * 2 ** tries++));
      };
    }

    open();
    return {
      send(message) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify(message));
        return true;
      },
      close() {
        closed = true;
        clearTimeout(retry);
        clearInterval(ping);
        if (ws) ws.close(1000);
      },
    };
  }

  window.Sckr = { el, enter, notice, req, session, socket, t, translate };
})();
