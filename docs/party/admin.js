"use strict";
// 사용량, 신고, 금칙어를 관리합니다. 권한은 서버가 확인합니다.
(function () {
  const { el, enter, notice, req, t, translate } = window.Sckr;
  const REFRESH_MS = 60000;
  const MUTE_MINUTES = [10, 1440];

  const TEXT = {
    usage: ["이번 달 관전 사용량", "Spectate usage this month"],
    estimate_note: ["측정값을 읽지 못해 서버 추정치를 표시합니다. Cloudflare 대시보드와 비교하세요.", "Measured usage is unavailable, so this is the server's estimate. Compare it with the Cloudflare dashboard."],
    low_on: ["1,000GB에 저화질 전용으로 전환", "Switch to low quality only at 1,000 GB"],
    hard_on: ["정한 용량에서 관전 완전 중지", "Stop spectating at a set amount"],
    hard_gb: ["중지 용량(GB)", "Stop at (GB)"],
    bill_note: ["저화질 전용은 데이터를 줄일 뿐 청구를 막지 않습니다. 청구를 막으려면 완전 중지를 켜세요.", "Low quality only reduces data. It does not prevent charges. Turn on the full stop to prevent them."],
    save: ["설정 저장", "Save settings"],
    saved: ["저장했습니다.", "Saved."],
    reports: ["신고", "Reports"],
    words: ["금칙어", "Blocked words"],
    word_hint: ["추가할 단어", "Word to add"],
    add: ["추가", "Add"],
    restricted: ["제한된 사용자", "Restricted users"],
    none: ["없습니다.", "None."],
    estimate: ["추정", "estimate"],
    measured: ["측정", "measured"],
    mode_normal: ["정상", "Normal"],
    mode_low: ["저화질 전용", "Low quality only"],
    mode_off: ["완전 중지", "Stopped"],
    close: ["처리 완료", "Resolve"],
    mute_10: ["10분 뮤트", "Mute 10 min"],
    mute_1440: ["하루 뮤트", "Mute 1 day"],
    ban: ["밴", "Ban"],
    unban: ["밴 해제", "Unban"],
    unmute: ["뮤트 해제", "Unmute"],
    remove_word: ["지우기", "Remove"],
    banned_row: ["밴", "Banned"],
    muted_row: ["뮤트", "Muted"],
    failed: ["처리하지 못했습니다.", "That did not work."],
  };

  const byId = (id) => document.getElementById(id);

  async function act(path, body) {
    try {
      await req(path, body);
      notice("");
      await load();
    } catch (error) {
      notice(t(TEXT, error.status === 403 ? "forbidden" : "failed"), true);
    }
  }

  function tool(label, handler, danger) {
    const button = el("button", danger ? "danger" : "", label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function renderUsage(data) {
    const { usage, mode, settings } = data;
    byId("used").textContent = usage.gb.toFixed(1);
    byId("source").textContent = t(TEXT, usage.source);
    byId("estimate-note").hidden = usage.source !== "estimate";
    byId("month").textContent = usage.month;
    byId("mode").textContent = t(TEXT, "mode_" + mode);
    byId("meter").style.width = Math.min(100, (usage.gb / usage.limitGb) * 100) + "%";
    byId("mark").style.left = (usage.warnGb / usage.limitGb) * 100 + "%";
    byId("meter-label").classList.toggle("warn", usage.gb >= usage.warnGb);
    byId("meter-label").setAttribute("aria-label", `${usage.gb.toFixed(1)} / ${usage.limitGb} GB`);
    byId("low-on").checked = settings.low_on;
    byId("hard-on").checked = settings.hard_on;
    byId("hard-gb").value = settings.hard_gb;
  }

  function renderReports(reports) {
    const box = byId("reports");
    box.replaceChildren();
    if (reports.length === 0) return box.append(el("p", "muted", t(TEXT, "none")));
    for (const r of reports) {
      const row = el("div", "report");
      row.append(el("div", "who", `${r.target_name} (${r.target_uid})`), el("div", "", r.text), el("div", "muted", `${r.reason} · ${r.channel} · ${new Date(r.at).toLocaleString()}`));
      const tools = el("div", "tools");
      tools.append(tool(t(TEXT, "close"), () => act("/admin/report", { id: r.id })));
      for (const minutes of MUTE_MINUTES) tools.append(tool(t(TEXT, "mute_" + minutes), () => act("/admin/mute", { uid: r.target_uid, minutes, reason: r.reason })));
      tools.append(tool(t(TEXT, "ban"), () => act("/admin/ban", { uid: r.target_uid, reason: r.reason }), true));
      row.append(tools);
      box.append(row);
    }
  }

  function renderWords(words) {
    const box = byId("words");
    box.replaceChildren();
    for (const word of words) box.append(tool(`${word} ×`, () => act("/admin/words", { remove: [word] })));
  }

  function renderRestricted(data) {
    const box = byId("restricted");
    box.replaceChildren();
    if (data.bans.length + data.mutes.length === 0) return box.append(el("p", "muted", t(TEXT, "none")));
    for (const ban of data.bans) {
      const row = el("div", "report");
      row.append(el("div", "who", `${t(TEXT, "banned_row")}: ${ban.uid}`), el("div", "muted", ban.reason || ""));
      const tools = el("div", "tools");
      tools.append(tool(t(TEXT, "unban"), () => act("/admin/unban", { uid: ban.uid })));
      row.append(tools);
      box.append(row);
    }
    for (const mute of data.mutes) {
      const row = el("div", "report");
      row.append(el("div", "who", `${t(TEXT, "muted_row")}: ${mute.uid}`), el("div", "muted", new Date(mute.until).toLocaleString()));
      const tools = el("div", "tools");
      tools.append(tool(t(TEXT, "unmute"), () => act("/admin/mute", { uid: mute.uid, minutes: 0 })));
      row.append(tools);
      box.append(row);
    }
  }

  async function load() {
    const data = await req("/admin/state");
    renderUsage(data);
    renderReports(data.reports);
    renderWords(data.words);
    renderRestricted(data);
  }

  byId("save").addEventListener("click", async () => {
    await act("/admin/settings", { low_on: byId("low-on").checked, hard_on: byId("hard-on").checked, hard_gb: Number(byId("hard-gb").value) });
  });
  byId("word-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const word = byId("word").value.trim();
    if (!word) return;
    byId("word").value = "";
    act("/admin/words", { add: [word] });
  });

  enter().then(async () => {
    translate(TEXT);
    await load();
    setInterval(() => { if (!document.hidden) load().catch(() => undefined); }, REFRESH_MS);
  }).catch((error) => {
    translate(TEXT);
    notice(t(TEXT, error.status === 403 ? "forbidden" : error.message), true);
  });
})();
