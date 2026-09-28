/* SC-KR 콘텐츠 편집 (운영진 전용)
 * 기능 · 번역팀 · 파트너 편집은 docs/index.html 안의 JSON 데이터 블록을 GitHub에 직접 커밋하는 방식으로 저장됩니다.
 * 런처 EXE / 패치 ZIP은 v1 릴리즈의 첨부 파일을 교체합니다. */
(function () {
  'use strict';
  var S = window.SCKR;
  if (!S) return;

  var GH_OWNER = 'DOKU-web', GH_REPO = 'sc-kr', GH_TAG = 'v1', GH_BRANCH = 'main';
  var GH_PAGE_PATH = 'docs/index.html';
  var TOKEN_KEY = 'sckr_admin_token';
  var PANEL_PW_HASH = '8a548962eb71ff11e65399d6f84badf0a05909ce1ff7dd2e9c5fad7ca612ece2';
  var PANEL_UNLOCK_KEY = 'sckr_panel_unlocked';
  var DATA_BLOCKS = { features: 'features-data', crew: 'crew-data', partners: 'partners-data' };

  var $ = function (id) { return document.getElementById(id); };
  var busy = false;
  var editable = false;

  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; } }

  function sha256Hex(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function b64EncodeUtf8(str) {
    var bytes = new TextEncoder().encode(str), binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function b64DecodeUtf8(b64) {
    var binary = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function replaceScriptBlock(html, id, json) {
    var re = new RegExp('(<script id="' + id + '" type="application\\/json">)([\\s\\S]*?)(<\\/script>)');
    if (!re.test(html)) throw new Error('데이터 블록(' + id + ')을 찾지 못했습니다.');
    return html.replace(re, function (_, open, old, close) { return open + json.replace(/</g, '\\u003c') + close; });
  }
  // <!--static:kind--> ... <!--/static:kind--> 사이의 미리 렌더링된 HTML 교체 (검색 로봇용)
  function replaceStaticBlock(html, kind, inner) {
    var re = new RegExp('(<!--static:' + kind + '-->)([\\s\\S]*?)(<!--\\/static:' + kind + '-->)');
    return html.replace(re, function (_, open, old, close) { return open + inner + close; });
  }
  function ghHeaders(token, extra) {
    var h = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  /* ========== 편집 UI ========== */
  function applyEditableUi() {
    $('featureForm').hidden = !editable;
    $('crewForm').hidden = !editable;
    $('partnerForm').hidden = !editable;
    S.setEditable(editable);
  }
  function setControlsDisabled(disabled) {
    document.querySelectorAll('.del-btn, .edit-btn, .edit-form button, #crewForm button').forEach(function (el) { el.disabled = disabled; });
  }

  // 아이콘 선택지
  $('fIcon').innerHTML = S.iconKeys.map(function (k) {
    return '<option value="' + k + '">' + (S.iconLabels[k] || k) + '</option>';
  }).join('');

  /* ========== 저장 (docs/index.html 커밋) ========== */
  async function saveSite(summary) {
    if (busy) return Promise.reject(new Error('busy'));
    var token = getToken();
    if (!token) { alert('먼저 하단 "콘텐츠 편집" 패널에서 GitHub 토큰을 저장해주세요.'); throw new Error('no token'); }
    busy = true;
    setControlsDisabled(true);
    try {
      for (var attempt = 1; attempt <= 3; attempt++) {
        var getRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + GH_PAGE_PATH + '?ref=' + GH_BRANCH, { headers: ghHeaders(token), cache: 'no-store' });
        if (!getRes.ok) throw new Error('현재 파일을 불러오지 못했습니다 (' + getRes.status + ')');
        var fileData = await getRes.json();
        var html = b64DecodeUtf8(fileData.content);
        Object.keys(DATA_BLOCKS).forEach(function (k) {
          html = replaceScriptBlock(html, DATA_BLOCKS[k], JSON.stringify(S.data[k]));
          html = replaceStaticBlock(html, k, S.staticHtml(k));
        });
        var putRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + GH_PAGE_PATH, {
          method: 'PUT',
          headers: ghHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ message: '사이트 콘텐츠 업데이트' + (summary ? ' - ' + summary : ''), content: b64EncodeUtf8(html), sha: fileData.sha, branch: GH_BRANCH }),
        });
        if (putRes.ok) { S.toast('저장했습니다. 1~2분 뒤 사이트에 반영됩니다.'); return; }
        // 409 = 그 사이 다른 편집이 먼저 반영됨 → 최신 파일을 다시 받아 재시도
        if (putRes.status !== 409 || attempt === 3) {
          var txt = await putRes.text();
          throw new Error('저장 실패 (' + putRes.status + '): ' + txt.slice(0, 200));
        }
      }
    } catch (err) {
      alert('저장하지 못했습니다: ' + (err && err.message ? err.message : err));
      throw err;
    } finally {
      busy = false;
      setControlsDisabled(false);
    }
  }

  // 변경 → 화면 반영 → 저장. 실패하면 되돌림.
  function commit(kind, next, summary) {
    var prev = S.data[kind];
    S.data[kind] = next;
    S.render();
    return saveSite(summary).catch(function (err) {
      S.data[kind] = prev;
      S.render();
      throw err;
    });
  }

  /* ========== 삭제 ========== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.del-btn');
    if (!btn || busy || !editable) return;
    var kind = btn.getAttribute('data-kind');
    var i = parseInt(btn.getAttribute('data-i'), 10);
    var list = S.data[kind];
    if (!list || isNaN(i)) return;
    var item = list[i];
    var name = typeof item === 'string' ? item : (item.title || item.name);
    if (!confirm('"' + name + '" 항목을 삭제할까요?')) return;
    commit(kind, list.slice(0, i).concat(list.slice(i + 1)), name + ' 삭제').catch(function () {});
  });

  /* ========== 추가 ========== */
  function withBusyLabel(form, label, promise) {
    var btn = form.querySelector('button[type=submit]');
    var orig = btn.textContent;
    btn.textContent = label;
    return promise.then(function () { form.reset(); }).catch(function () {}).finally(function () { btn.textContent = orig; });
  }

  $('featureForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var f = {
      icon: $('fIcon').value,
      title: $('fTitle').value.trim(),
      desc: $('fDesc').value.trim(),
    };
    var titleEn = $('fTitleEn').value.trim(), descEn = $('fDescEn').value.trim();
    if (titleEn) f.titleEn = titleEn;
    if (descEn) f.descEn = descEn;
    if (!f.title || !f.desc) return;
    withBusyLabel(this, '추가 중...', commit('features', S.data.features.concat([f]), f.title + ' 추가'));
  });

  /* ---- 번역팀: 이름 + 역할 (추가 / 수정) ---- */
  var CUSTOM = '__custom__';
  var crewEditing = -1;   // 수정 중인 멤버 인덱스 (-1 = 새로 추가)
  $('crewRole').innerHTML = S.crewRoles.map(function (r) {
    return '<option value="' + r.ko + '">' + r.ko + '</option>';
  }).join('') + '<option value="">역할 없음 (팀원)</option><option value="' + CUSTOM + '">직접 입력…</option>';
  $('crewRole').value = '번역팀';

  function syncCustomRole() {
    var custom = $('crewRole').value === CUSTOM;
    $('crewRoleCustom').hidden = !custom;
    $('crewRoleCustom').required = custom;
    if (custom) $('crewRoleCustom').focus();
  }
  $('crewRole').addEventListener('change', syncCustomRole);

  function resetCrewForm() {
    crewEditing = -1;
    $('crewForm').reset();
    $('crewRole').value = '번역팀';
    syncCustomRole();
    $('crewFormTitle').textContent = '번역팀 추가';
    $('crewSubmit').textContent = '추가';
    $('crewCancel').hidden = true;
  }
  $('crewCancel').addEventListener('click', resetCrewForm);
  // 수정 중에 멤버를 삭제하면 순서가 바뀌므로 폼 초기화
  document.addEventListener('click', function (e) {
    if (crewEditing >= 0 && e.target.closest('.del-btn[data-kind="crew"]')) resetCrewForm();
  }, true);

  // ✎ 버튼: 폼에 불러와서 수정
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.edit-btn[data-kind="crew"]');
    if (!btn || busy || !editable) return;
    var i = parseInt(btn.getAttribute('data-i'), 10);
    var it = S.crewItem(S.data.crew[i]);
    crewEditing = i;
    $('crewInput').value = it.name;
    var preset = !it.role || S.crewRoles.some(function (r) { return r.ko === it.role; });
    $('crewRole').value = preset ? it.role : CUSTOM;
    $('crewRoleCustom').value = preset ? '' : it.role;
    syncCustomRole();
    $('crewFormTitle').textContent = '"' + it.name + '" 수정';
    $('crewSubmit').textContent = '수정 저장';
    $('crewCancel').hidden = false;
    $('crewForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('crewInput').focus();
  });

  $('crewForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var name = $('crewInput').value.trim();
    var role = $('crewRole').value === CUSTOM ? $('crewRoleCustom').value.trim() : $('crewRole').value;
    if (!name) return;
    var entry = role ? { name: name, role: role } : { name: name };
    var list = S.data.crew.slice();
    var dup = list.some(function (c, i) { return i !== crewEditing && S.crewItem(c).name === name; });
    if (dup) { alert('"' + name + '"은(는) 이미 번역팀에 있습니다.'); return; }
    var summary;
    if (crewEditing >= 0) { list[crewEditing] = entry; summary = '번역팀 ' + name + ' 수정'; }
    else { list.push(entry); summary = '번역팀 ' + name + ' 추가'; }
    var form = this, btn = $('crewSubmit'), orig = btn.textContent;
    btn.textContent = '저장 중...';
    commit('crew', list, summary).then(resetCrewForm).catch(function () {}).finally(function () {
      if (btn.textContent === '저장 중...') btn.textContent = orig;
    });
  });

  $('partnerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var p = {
      name: $('pName').value.trim(),
      platform: $('pPlatform').value.trim(),
      url: $('pUrl').value.trim(),
    };
    var avatar = $('pAvatar').value.trim();
    if (avatar) p.avatar = avatar;
    if (!p.name || !p.platform || !/^https?:\/\//i.test(p.url)) return;
    withBusyLabel(this, '추가 중...', commit('partners', S.data.partners.concat([p]), '파트너 ' + p.name + ' 추가'));
  });

  /* ========== 관리자 패널 ========== */
  function logLine(msg) {
    var el = $('adminLog');
    el.textContent = (el.textContent === '대기 중...' ? '' : el.textContent + '\n') + msg;
    el.scrollTop = el.scrollHeight;
  }
  function refreshTokenStatus() {
    var tk = getToken();
    $('tokenStatus').textContent = tk ? '저장된 토큰 있음 (' + tk.slice(0, 4) + '••••)' : '저장된 토큰 없음';
  }
  function showAdminBody() {
    $('adminGate').hidden = true;
    $('adminBody').hidden = false;
  }
  function isUnlocked() { try { return sessionStorage.getItem(PANEL_UNLOCK_KEY) === '1'; } catch (_) { return false; } }

  $('adminToggle').addEventListener('click', function () {
    var p = $('adminPanel');
    p.hidden = !p.hidden;
    this.setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) {
      if (isUnlocked()) showAdminBody();
      else $('gatePwInput').focus();
      p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  $('gateUnlockBtn').addEventListener('click', function () {
    sha256Hex($('gatePwInput').value).then(function (hash) {
      if (hash === PANEL_PW_HASH) {
        try { sessionStorage.setItem(PANEL_UNLOCK_KEY, '1'); } catch (_) {}
        $('gateErr').textContent = '';
        $('gatePwInput').value = '';
        showAdminBody();
      } else {
        $('gateErr').textContent = '비밀번호가 올바르지 않습니다.';
      }
    });
  });
  $('gatePwInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('gateUnlockBtn').click(); });

  $('tokenSaveBtn').addEventListener('click', function () {
    var v = $('tokenInput').value.trim();
    if (!v) return;
    try { localStorage.setItem(TOKEN_KEY, v); } catch (_) {}
    $('tokenInput').value = '';
    refreshTokenStatus();
    editable = true;
    applyEditableUi();
    logLine('토큰이 이 브라우저에 저장되었습니다. 이제 위의 기능 · 번역팀 · 파트너 섹션에서 바로 추가/삭제할 수 있습니다.');
  });
  $('tokenClearBtn').addEventListener('click', function () {
    try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    refreshTokenStatus();
    editable = false;
    applyEditableUi();
    logLine('토큰을 삭제했습니다.');
  });

  /* ========== 릴리즈 파일 업로드 ========== */
  async function uploadAsset(file, assetName) {
    var token = getToken();
    if (!token) { logLine('GitHub 토큰을 먼저 저장해주세요.'); return; }
    if (!file) { logLine('파일을 선택해주세요.'); return; }
    try {
      logLine('릴리즈 정보 확인 중...');
      var relRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/releases/tags/' + GH_TAG, { headers: ghHeaders(token) });
      if (!relRes.ok) throw new Error('릴리즈 조회 실패 (' + relRes.status + ')');
      var rel = await relRes.json();
      var existing = (rel.assets || []).filter(function (a) { return a.name === assetName; })[0];
      if (existing) {
        logLine('기존 ' + assetName + ' 삭제 중...');
        var delRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/releases/assets/' + existing.id, { method: 'DELETE', headers: ghHeaders(token) });
        if (!delRes.ok && delRes.status !== 404) throw new Error('기존 파일 삭제 실패 (' + delRes.status + ')');
      }
      logLine('업로드 중... (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)');
      var uploadUrl = rel.upload_url.replace('{?name,label}', '') + '?name=' + encodeURIComponent(assetName);
      var buf = await file.arrayBuffer();
      var upRes = await fetch(uploadUrl, { method: 'POST', headers: ghHeaders(token, { 'Content-Type': 'application/octet-stream' }), body: buf });
      if (!upRes.ok) { var txt = await upRes.text(); throw new Error('업로드 실패 (' + upRes.status + '): ' + txt.slice(0, 200)); }
      logLine('완료: ' + assetName + ' 업로드됨.');
      try { sessionStorage.removeItem('sckr-release:' + GH_OWNER + '/' + GH_REPO); } catch (_) {}
    } catch (err) {
      logLine('오류: ' + (err && err.message ? err.message : err));
    }
  }
  $('uploadLauncherBtn').addEventListener('click', function () { uploadAsset($('fileLauncher').files[0], 'SC-KR-Launcher.exe'); });
  $('uploadPatchBtn').addEventListener('click', function () { uploadAsset($('filePatch').files[0], 'sc-kr-v1.zip'); });

  /* ========== 시작 ========== */
  // 토큰은 비밀번호 게이트 안쪽에서만 저장할 수 있으므로, 토큰이 있으면 편집 모드로 시작
  editable = !!getToken();
  refreshTokenStatus();
  applyEditableUi();
})();
