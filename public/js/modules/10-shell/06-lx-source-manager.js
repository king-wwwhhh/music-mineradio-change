// 外部音源管理面板（LX 自定义源）：自包含，只依赖 /api/lx-source/*
// 入口：右下角浮动按钮「音源」；也可在控制台调用 openLxSourceManager()
(function () {
  'use strict';
  var API = '/api/lx-source';
  var state = { loading: false, status: null, busy: false, message: '', stats: { total: 0, lx: 0, miss: 0 }, last: null };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function apiJson(path, options) {
    var opt = options || {};
    opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
    return fetch(API + path, opt).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = JSON.parse(t); } catch (_) { data = { ok: false, error: t.slice(0, 200) }; }
        if (!r.ok && (!data || data.ok !== false)) data = { ok: false, error: 'HTTP ' + r.status };
        return data;
      });
    });
  }

  function injectStyle() {
    if (document.getElementById('lxsrc-style')) return;
    var css = [
      '#lxsrc-entry{position:fixed;right:18px;bottom:96px;z-index:60;display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(12,14,18,.72);backdrop-filter:blur(14px);color:#e8eef6;font-size:12.5px;letter-spacing:.02em;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.42);transition:transform .16s ease,border-color .16s ease,background .16s ease}',
      '#lxsrc-entry:hover{transform:translateY(-1px);border-color:rgba(156,255,223,.42);background:rgba(18,22,26,.82)}',
      '#lxsrc-entry .dot{width:6px;height:6px;border-radius:50%;background:#9cffdf;box-shadow:0 0 8px rgba(156,255,223,.85)}',
      '#lxsrc-entry.off .dot{background:#ff8f6b;box-shadow:0 0 8px rgba(255,143,107,.8)}',
      '#lxsrc-mask{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(4,6,9,.62);backdrop-filter:blur(6px)}',
      '#lxsrc-mask.show{display:flex}',
      '#lxsrc-dialog{width:min(680px,calc(100vw - 48px));max-height:min(78vh,720px);display:flex;flex-direction:column;border-radius:20px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(168deg,rgba(16,19,24,.97),rgba(9,11,14,.98));box-shadow:0 30px 90px rgba(0,0,0,.62);color:#e9eff7;overflow:hidden}',
      '#lxsrc-dialog header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '#lxsrc-dialog header b{font-size:14px;letter-spacing:.04em}',
      '#lxsrc-dialog header small{display:block;margin-top:3px;color:#8b95a5;font-size:11.5px;letter-spacing:.02em}',
      '#lxsrc-close{border:0;background:transparent;color:#9aa4b2;font-size:20px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:8px}',
      '#lxsrc-close:hover{color:#fff;background:rgba(255,255,255,.08)}',
      '.lxsrc-body{padding:14px 18px 6px;overflow-y:auto}',
      '.lxsrc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);margin-bottom:9px}',
      '.lxsrc-row.active{border-color:rgba(156,255,223,.38);background:rgba(156,255,223,.07)}',
      '.lxsrc-name{font-size:13px;letter-spacing:.01em}',
      '.lxsrc-meta{margin-top:3px;color:#8b95a5;font-size:11px;letter-spacing:.02em}',
      '.lxsrc-badge{display:inline-block;margin-left:7px;padding:1px 7px;border-radius:999px;font-size:10px;letter-spacing:.04em;border:1px solid rgba(156,255,223,.42);color:#9cffdf}',
      '.lxsrc-badge.warn{border-color:rgba(255,143,107,.45);color:#ffb199}',
      '.lxsrc-actions{display:flex;gap:7px;flex-shrink:0}',
      '.lxsrc-btn{padding:6px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#dce6f2;font-size:11.5px;cursor:pointer;transition:background .15s ease,border-color .15s ease}',
      '.lxsrc-btn:hover{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.26)}',
      '.lxsrc-btn.primary{border-color:rgba(156,255,223,.5);color:#0d1a16;background:#9cffdf}',
      '.lxsrc-btn.primary:hover{background:#b6ffe9}',
      '.lxsrc-btn.danger{border-color:rgba(255,120,96,.42);color:#ffb4a4}',
      '.lxsrc-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.lxsrc-switch{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.028);margin-bottom:12px}',
      '.lxsrc-switch input{width:16px;height:16px;accent-color:#9cffdf;cursor:pointer}',
      '.lxsrc-switch label{font-size:12.5px;cursor:pointer}',
      '.lxsrc-switch .hint{margin-left:auto;color:#7f8a99;font-size:11px}',
      '.lxsrc-import{padding:12px 13px;border-radius:14px;border:1px dashed rgba(255,255,255,.16);background:rgba(255,255,255,.02)}',
      '.lxsrc-import .title{font-size:12px;color:#aab4c2;margin-bottom:9px;letter-spacing:.03em}',
      '.lxsrc-import .line{display:flex;gap:8px;align-items:center}',
      '.lxsrc-import input[type=text]{flex:1;min-width:0;padding:7px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#e9eff7;font-size:12px}',
      '.lxsrc-import input[type=file]{color:#aab4c2;font-size:11.5px;max-width:190px}',
      '#lxsrc-status{padding:0 18px 13px;color:#8b95a5;font-size:11.5px;min-height:16px;letter-spacing:.02em}',
      '#lxsrc-status.err{color:#ffb199}',
      '#lxsrc-status.ok{color:#9cffdf}',
      '#lxsrc-stats{padding:0 18px 14px;color:#7f8a99;font-size:11px;letter-spacing:.02em}',
      '#lxsrc-badge{position:fixed;right:18px;bottom:146px;z-index:61;display:none;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;border:1px solid rgba(156,255,223,.45);background:rgba(10,18,16,.86);backdrop-filter:blur(14px);color:#c9ffe9;font-size:12px;letter-spacing:.02em;box-shadow:0 10px 30px rgba(0,0,0,.5)}',
      '#lxsrc-badge.show{display:flex}',
      '#lxsrc-badge.miss{border-color:rgba(255,143,107,.5);color:#ffcdbd;background:rgba(24,14,12,.86)}',
      '#lxsrc-badge i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor;not-italic:1}'
    ].join('\n');
    var el = document.createElement('style');
    el.id = 'lxsrc-style';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ensureEntry() {
    if (document.getElementById('lxsrc-entry')) return;
    var btn = document.createElement('button');
    btn.id = 'lxsrc-entry';
    btn.type = 'button';
    btn.title = '外部音源（第三方 LX 源）';
    btn.innerHTML = '<span class="dot"></span><span>音源</span>';
    btn.addEventListener('click', openLxSourceManager);
    document.body.appendChild(btn);
  }

  function ensureDialog() {
    if (document.getElementById('lxsrc-mask')) return;
    var mask = document.createElement('div');
    mask.id = 'lxsrc-mask';
    mask.innerHTML = '<div id="lxsrc-dialog"><header><div><b>外部音源</b><small id="lxsrc-sub">第三方 LX 自定义源</small></div><button id="lxsrc-close" type="button" aria-label="关闭">×</button></header><div class="lxsrc-body" id="lxsrc-list"></div><div id="lxsrc-stats"></div><div id="lxsrc-status"></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeLxSourceManager(); });
    mask.querySelector('#lxsrc-close').addEventListener('click', closeLxSourceManager);
  }

  var badgeTimer = null;
  function showBadge(text, miss) {
    var el = document.getElementById('lxsrc-badge');
    if (!el) return;
    el.innerHTML = '<i></i><span>' + esc(text) + '</span>';
    el.className = 'show' + (miss ? ' miss' : '');
    if (badgeTimer) clearTimeout(badgeTimer);
    badgeTimer = setTimeout(function () { el.className = ''; }, 5200);
  }

  // 取流时标记：/api/song/url 的响应里带 playbackSource 就说明这次真的走了外部源
  function installApiHook() {
    if (typeof window.apiJson !== 'function' || window.apiJson.__lxWrapped) return !!window.apiJson;
    var orig = window.apiJson;
    var wrapped = function (url, opts) {
      return orig.apply(this, arguments).then(function (res) {
        try {
          if (typeof url === 'string' && url.indexOf('/api/song/url') >= 0 && res && typeof res === 'object') {
            state.stats.total += 1;
            state.last = res;
            if (res.playbackSource === 'lx') {
              state.stats.lx += 1;
              showBadge('外部源 · ' + (res.lxResolver || 'lx') + (res.lxQuality ? ' · ' + res.lxQuality : ''), false);
            } else if (res.lxPreferTried) {
              state.stats.miss += 1;
              showBadge('外部源未命中，已回退平台 · ' + (res.lxError || ''), true);
            }
            var statsEl = document.getElementById('lxsrc-stats');
            if (statsEl) statsEl.textContent = statsText();
          }
        } catch (_) {}
        return res;
      });
    };
    wrapped.__lxWrapped = true;
    window.apiJson = wrapped;
    return true;
  }
  function statsText() {
    var s = state.stats;
    if (!s.total) return '本次会话：还没有取流记录（播一首歌就会出现）';
    return '本次会话：取流 ' + s.total + ' 次 · 走外部源 ' + s.lx + ' 次 · 回退平台 ' + s.miss + ' 次';
  }

  function setStatus(text, mode) {
    var el = document.getElementById('lxsrc-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = mode || '';
  }

  function render() {
    var s = state.status;
    var list = document.getElementById('lxsrc-list');
    if (!list) return;
    if (!s || s.ok === false && !s.installed) {
      list.innerHTML = '<div class="lxsrc-row"><div><div class="lxsrc-name">未取到音源状态</div><div class="lxsrc-meta">' + esc((s && s.error) || '服务未响应') + '</div></div></div>';
      return;
    }
    var platforms = s.sources ? Object.keys(s.sources) : [];
    var sub = document.getElementById('lxsrc-sub');
    if (sub) {
      sub.textContent = (s.name ? ('当前：' + s.name + (s.version ? ' ' + s.version : '')) : '未启用任何源') +
        (platforms.length ? (' · 平台 ' + platforms.join('/')) : '');
    }
    var html = '';
    html += '<div class="lxsrc-switch"><input id="lxsrc-prefer" type="checkbox"' + (s.preferExternal ? ' checked' : '') + '><label for="lxsrc-prefer">优先使用外部音源</label><span class="hint">' + (s.preferBudgetMs ? (s.preferBudgetMs + 'ms 预算') : '') + '</span></div>';
    var rows = s.installed || [];
    if (!rows.length) {
      html += '<div class="lxsrc-row"><div><div class="lxsrc-name">还没有导入音源</div><div class="lxsrc-meta">用下面的「导入」加一个 LX 自定义源脚本</div></div></div>';
    }
    rows.forEach(function (it) {
      html += '<div class="lxsrc-row' + (it.active ? ' active' : '') + '"><div><div class="lxsrc-name">' + esc(it.name) + (it.version ? ' <span class="lxsrc-meta">' + esc(it.version) + '</span>' : '') +
        (it.active ? '<span class="lxsrc-badge">使用中</span>' : '') +
        (it.enabled === false ? '<span class="lxsrc-badge warn">已停用</span>' : '') +
        '</div><div class="lxsrc-meta">' + esc(it.author || '未署名') + (it.id ? ' · ' + esc(it.id) : '') + '</div></div><div class="lxsrc-actions">' +
        (it.active ? '' : '<button class="lxsrc-btn primary" data-act="select" data-id="' + esc(it.id) + '">切换</button>') +
        '<button class="lxsrc-btn" data-act="toggle" data-id="' + esc(it.id) + '" data-enabled="' + (it.enabled === false ? '0' : '1') + '">' + (it.enabled === false ? '启用' : '停用') + '</button>' +
        '<button class="lxsrc-btn danger" data-act="delete" data-id="' + esc(it.id) + '">删除</button>' +
        '</div></div>';
    });
    html += '<div class="lxsrc-import"><div class="title">导入音源脚本（.js）</div><div class="line"><input id="lxsrc-file" type="file" accept=".js,application/javascript"><button class="lxsrc-btn" id="lxsrc-file-go" type="button">导入文件</button></div>' +
      '<div class="line" style="margin-top:8px"><input id="lxsrc-url" type="text" placeholder="或填脚本 URL（https://…/latest.js）"><button class="lxsrc-btn" id="lxsrc-url-go" type="button">导入链接</button></div></div>';
    list.innerHTML = html;
    bindList();
    var statsEl = document.getElementById('lxsrc-stats');
    if (statsEl) statsEl.textContent = statsText();
  }

  function bindList() {
    var list = document.getElementById('lxsrc-list');
    var prefer = list.querySelector('#lxsrc-prefer');
    if (prefer) prefer.addEventListener('change', function () { setPrefer(prefer.checked); });
    list.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        var id = btn.getAttribute('data-id');
        if (act === 'select') selectSource(id);
        else if (act === 'toggle') toggleSource(id, btn.getAttribute('data-enabled') !== '1');
        else if (act === 'delete') deleteSource(id);
      });
    });
    var fileGo = list.querySelector('#lxsrc-file-go');
    if (fileGo) fileGo.addEventListener('click', importFile);
    var urlGo = list.querySelector('#lxsrc-url-go');
    if (urlGo) urlGo.addEventListener('click', importUrl);
  }

  function refresh() {
    return apiJson('/status?t=' + Date.now()).then(function (s) {
      state.status = s;
      render();
      var st = document.getElementById('lxsrc-status');
      if (st && /读取中/.test(st.textContent)) setStatus('');
      var entry = document.getElementById('lxsrc-entry');
      if (entry) entry.classList.toggle('off', !(s && s.preferExternal));
      return s;
    }).catch(function (e) { setStatus('读取失败：' + e.message, 'err'); });
  }

  function act(promise, okText) {
    if (state.busy) return;
    state.busy = true;
    setStatus('处理中…');
    return promise.then(function (r) {
      state.busy = false;
      if (r && r.ok === false) { setStatus('失败：' + (r.error || '未知错误'), 'err'); return; }
      setStatus(okText, 'ok');
      return refresh();
    }).catch(function (e) { state.busy = false; setStatus('失败：' + e.message, 'err'); });
  }

  function setPrefer(enabled) {
    return act(apiJson('/prefer', { method: 'POST', body: JSON.stringify({ enabled: !!enabled }) }), enabled ? '已开启：默认优先用外部音源' : '已关闭：仅平台不可播时兜底');
  }
  function selectSource(id) { return act(apiJson('/select', { method: 'POST', body: JSON.stringify({ id: id }) }), '已切换音源'); }
  function toggleSource(id, enabled) { return act(apiJson('/toggle', { method: 'POST', body: JSON.stringify({ ids: [id], enabled: !!enabled }) }), enabled ? '已启用' : '已停用'); }
  function deleteSource(id) {
    if (!window.confirm('删除这个音源？（只删配置，不影响其它源）')) return;
    return act(apiJson('/delete', { method: 'POST', body: JSON.stringify({ id: id }) }), '已删除');
  }
  function importFile() {
    var input = document.getElementById('lxsrc-file');
    var file = input && input.files && input.files[0];
    if (!file) { setStatus('先选一个 .js 文件', 'err'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      act(apiJson('/import', { method: 'POST', body: JSON.stringify({ script: String(reader.result || ''), fileName: file.name }) }), '已导入：' + file.name);
    };
    reader.onerror = function () { setStatus('读取文件失败', 'err'); };
    reader.readAsText(file);
  }
  function importUrl() {
    var input = document.getElementById('lxsrc-url');
    var url = input && String(input.value || '').trim();
    if (!url) { setStatus('先填脚本 URL', 'err'); return; }
    if (!/^https?:\/\//i.test(url)) { setStatus('URL 必须以 http(s):// 开头', 'err'); return; }
    act(apiJson('/import', { method: 'POST', body: JSON.stringify({ url: url }) }), '已导入链接');
  }

  function openLxSourceManager() {
    injectStyle();
    ensureDialog();
    document.getElementById('lxsrc-mask').classList.add('show');
    setStatus('读取中…');
    refresh();
  }
  function closeLxSourceManager() {
    var mask = document.getElementById('lxsrc-mask');
    if (mask) mask.classList.remove('show');
  }

  window.openLxSourceManager = openLxSourceManager;
  window.closeLxSourceManager = closeLxSourceManager;

  function boot() {
    injectStyle();
    ensureEntry();
    if (!document.getElementById('lxsrc-badge')) {
      var badge = document.createElement('div');
      badge.id = 'lxsrc-badge';
      document.body.appendChild(badge);
    }
    if (!installApiHook()) {
      var tries = 0;
      var t = setInterval(function () {
        tries += 1;
        if (installApiHook() || tries > 20) clearInterval(t);
      }, 400);
    }
    apiJson('/status?t=' + Date.now()).then(function (s) {
      var entry = document.getElementById('lxsrc-entry');
      if (entry) entry.classList.toggle('off', !(s && s.preferExternal));
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
