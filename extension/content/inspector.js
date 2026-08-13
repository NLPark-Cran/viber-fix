/**
 * ViberFix Inspector(content script)
 *
 * 功能:
 *  - 元素选择模式(P):悬停高亮,点击选中元素
 *  - 区域框选模式(R):拖拽画框,自动猜测语义(sidebar/navbar/cardlist…)
 *  - 整改面板:截图预览 + 意见输入 + 快捷指令 + 设计术语库
 *  - AI 推荐样式 / 生图预览:提交后轮询桥接服务,结果回流展示
 *  - Esc 关闭面板,再按退出检查器
 */

'use strict';

/* ================= 重复注入 → 切换开关 ================= */
if (window.__viberfix) {
  window.__viberfix.toggle();
} else {
  (function bootstrap() {
    const ROLE_LABEL = {
      sidebar: '侧边栏', navbar: '顶部导航', footer: '页脚', banner: '首屏主视觉',
      cardlist: '卡片列表区', card: '卡片', button: '按钮', article: '文章正文',
      list: '列表', modal: '弹层', page: '整页', region: '自定义区域',
    };

    const sendMsg = (m) => new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(m, (resp) => resolve(resp || { ok: false, error: 'no response' }));
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });

    /* ================= 状态 ================= */
    let active = true;
    let mode = 'pick'; // pick | region
    let hoverEl = null;
    let selection = null; // {kind:'element'|'region', el?, rect, role, selector, screenshot}
    let selectedTerms = [];
    let dragStart = null;
    let pollTimer = null;
    let settings = { bridgeUrl: 'http://127.0.0.1:8787', projectPath: '' };

    sendMsg({ kind: 'settings:get' }).then((r) => {
      if (r && r.ok) settings = r.settings;
    });

    /* ================= Shadow DOM 骨架 ================= */
    const host = document.createElement('viberfix-host');
    host.style.cssText = 'all:initial; position:fixed; inset:0; z-index:2147483647; pointer-events:none;';
    const root = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
      .vf-hl { position: fixed; outline: 2px solid #6c8cff; background: rgba(108,140,255,.12);
               border-radius: 2px; pointer-events: none; z-index: 1; }
      .vf-hl-label { position: fixed; background: #6c8cff; color: #fff; font-size: 11px; line-height: 1;
               padding: 3px 6px; border-radius: 3px; pointer-events: none; z-index: 2; white-space: nowrap; }
      .vf-marquee { position: fixed; border: 2px dashed #6c8cff; background: rgba(108,140,255,.10);
               pointer-events: none; z-index: 1; }
      .vf-hint { position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
               background: rgba(15,17,23,.88); color: #cfd4e4; font-size: 12px; padding: 7px 14px;
               border-radius: 999px; pointer-events: none; z-index: 3; backdrop-filter: blur(6px);
               border: 1px solid rgba(108,140,255,.35); }
      .vf-toolbar { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 6px;
               background: rgba(15,17,23,.92); border: 1px solid #262b3a; border-radius: 12px;
               padding: 6px; pointer-events: auto; z-index: 4; box-shadow: 0 6px 24px rgba(0,0,0,.35); }
      .vf-toolbar button { border: none; background: transparent; color: #aab0c5; font-size: 12px;
               padding: 7px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
      .vf-toolbar button:hover { background: rgba(108,140,255,.12); color: #e8eaf0; }
      .vf-toolbar button.on { background: #6c8cff; color: #fff; }
      .vf-toast { position: fixed; bottom: 72px; right: 16px; background: #181b25; color: #e8eaf0;
               font-size: 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid #262b3a;
               z-index: 5; pointer-events: none; opacity: 0; transition: opacity .25s; max-width: 300px; }
      .vf-toast.show { opacity: 1; }
      .vf-panel { position: fixed; top: 16px; right: 16px; width: 372px; max-height: calc(100vh - 32px);
               overflow-y: auto; background: #14161f; color: #e8eaf0; border: 1px solid #262b3a;
               border-radius: 14px; box-shadow: 0 12px 48px rgba(0,0,0,.5); pointer-events: auto; z-index: 6; }
      .vf-panel::-webkit-scrollbar { width: 8px; } .vf-panel::-webkit-scrollbar-thumb { background:#2c3245; border-radius:4px; }
      .vf-p-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #262b3a;
               position: sticky; top: 0; background: #14161f; z-index: 2; }
      .vf-role-chip { background: rgba(108,140,255,.15); color: #8da5ff; font-size: 12px; font-weight: 600;
               border-radius: 999px; padding: 3px 10px; }
      .vf-p-title { font-size: 13px; color: #8b91a5; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vf-icon-btn { border: none; background: transparent; color: #8b91a5; cursor: pointer; font-size: 15px;
               padding: 4px 6px; border-radius: 6px; line-height: 1; }
      .vf-icon-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
      .vf-p-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
      .vf-shot { border-radius: 10px; border: 1px solid #262b3a; background: #0a0c10; overflow: hidden; }
      .vf-shot img { width: 100%; display: block; max-height: 200px; object-fit: contain; }
      .vf-label { font-size: 11px; color: #8b91a5; margin-bottom: 6px; letter-spacing: .5px; }
      .vf-textarea { width: 100%; min-height: 64px; resize: vertical; background: #0d0f16; color: #e8eaf0;
               border: 1px solid #2c3245; border-radius: 10px; padding: 10px 12px; font-size: 13px;
               line-height: 1.6; outline: none; }
      .vf-textarea:focus { border-color: #6c8cff; }
      .vf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .vf-chip { background: #1e2230; border: 1px solid #2c3245; color: #cfd4e4; font-size: 12px;
               border-radius: 999px; padding: 5px 11px; cursor: pointer; transition: all .12s; }
      .vf-chip:hover { border-color: #6c8cff; color: #fff; }
      .vf-chip.sel { background: rgba(108,140,255,.18); border-color: #6c8cff; color: #9db4ff; }
      .vf-cats { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
      .vf-cat { background: transparent; border: none; color: #8b91a5; font-size: 12px; padding: 4px 10px;
               border-radius: 999px; cursor: pointer; }
      .vf-cat.on { background: rgba(108,140,255,.15); color: #9db4ff; }
      .vf-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .vf-btn { border: 1px solid #2c3245; background: #1e2230; color: #e8eaf0; font-size: 13px;
               padding: 9px 14px; border-radius: 10px; cursor: pointer; flex: 1; white-space: nowrap; }
      .vf-btn:hover { border-color: #6c8cff; }
      .vf-btn:disabled { opacity: .5; cursor: not-allowed; }
      .vf-btn.primary { background: #6c8cff; border-color: #6c8cff; color: #fff; font-weight: 600; }
      .vf-btn.primary:hover { background: #5a7bf0; }
      .vf-status { font-size: 12px; color: #8b91a5; line-height: 1.6; }
      .vf-status.ok { color: #3ecf8e; } .vf-status.err { color: #ff6b6b; }
      .vf-sugg { border: 1px solid #2c3245; border-radius: 10px; padding: 10px 12px; cursor: pointer; }
      .vf-sugg:hover { border-color: #6c8cff; }
      .vf-sugg b { font-size: 13px; color: #9db4ff; display: block; margin-bottom: 3px; }
      .vf-sugg span { font-size: 12px; color: #aab0c5; line-height: 1.5; display: block; }
      .vf-preview-img { width: 100%; border-radius: 10px; border: 1px solid #2c3245; display: block; }
      .vf-overlay { position: fixed; pointer-events: none; z-index: 3; box-shadow: 0 0 0 2px #3ecf8e; }
      .vf-overlay img { width: 100%; height: 100%; object-fit: fill; display: block; opacity: .92; }
    `;
    root.appendChild(style);

    const hint = document.createElement('div');
    hint.className = 'vf-hint';
    const toolbar = document.createElement('div');
    toolbar.className = 'vf-toolbar';
    toolbar.innerHTML = `
      <button data-m="pick" class="on" title="悬停高亮,点击选中元素(快捷键 P)">◇ 选元素</button>
      <button data-m="region" title="拖拽画框选择一片区域(快捷键 R)">▭ 框区域</button>
      <button data-m="exit" title="退出检查器(Esc)">✕ 退出</button>`;
    const toast = document.createElement('div');
    toast.className = 'vf-toast';
    root.append(hint, toolbar, toast);

    const hl = document.createElement('div');
    hl.className = 'vf-hl'; hl.style.display = 'none';
    const hlLabel = document.createElement('div');
    hlLabel.className = 'vf-hl-label'; hlLabel.style.display = 'none';
    const marquee = document.createElement('div');
    marquee.className = 'vf-marquee'; marquee.style.display = 'none';
    root.append(hl, hlLabel, marquee);

    let panelHost = null; // 面板容器
    document.documentElement.appendChild(host);

    /* ================= 小工具 ================= */
    function showToast(text, ms = 2200) {
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => toast.classList.remove('show'), ms);
    }

    function setHint() {
      hint.textContent = mode === 'pick'
        ? 'ViberFix:移动鼠标悬停,点击选中要整改的元素(Esc 退出)'
        : 'ViberFix:按住拖拽,框选要整改的区域(Esc 退出)';
    }

    function setMode(m) {
      if (m === 'exit') return exit();
      mode = m;
      toolbar.querySelectorAll('button[data-m]').forEach((b) => {
        if (b.dataset.m !== 'exit') b.classList.toggle('on', b.dataset.m === m);
      });
      setHint();
      hideHl();
    }

    function isOwnNode(n) {
      return n === host || (n && n.getRootNode && n.getRootNode() === root) || (n && n.closest && n.closest('viberfix-host'));
    }

    function hideHl() {
      hl.style.display = 'none';
      hlLabel.style.display = 'none';
      hoverEl = null;
    }

    function paintHl(el) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return hideHl();
      Object.assign(hl.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      const label = (el.tagName || '').toLowerCase() + (el.classList && el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
      hlLabel.textContent = label;
      Object.assign(hlLabel.style, { display: 'block', left: Math.max(4, r.left) + 'px', top: Math.max(4, r.top - 22) + 'px' });
    }

    /* ================= 语义猜测 ================= */
    function guessElementRole(el) {
      const t = el.tagName.toLowerCase();
      const cls = ((el.className || '') + ' ' + (el.id || '')).toString().toLowerCase();
      if (t === 'nav' || t === 'header') return 'navbar';
      if (t === 'footer') return 'footer';
      if (t === 'aside') return 'sidebar';
      if (t === 'article') return 'article';
      if (t === 'button' || (t === 'a' && /btn|button/.test(cls))) return 'button';
      if (t === 'ul' || t === 'ol') return 'list';
      if (/modal|dialog|drawer/.test(cls)) return 'modal';
      if (/sidebar|sider|aside/.test(cls)) return 'sidebar';
      if (/navbar|nav\b|nav-|-nav|header|topbar|menu/.test(cls)) return 'navbar';
      if (/hero|banner|jumbotron|首屏/.test(cls)) return 'banner';
      if (/card/.test(cls)) return 'card';
      if (/footer/.test(cls)) return 'footer';
      return 'region';
    }

    function guessRegionRole(rect, inside) {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (rect.width < vw * 0.42 && rect.height > vh * 0.45 &&
          (rect.left < vw * 0.12 || rect.right > vw * 0.88)) return 'sidebar';
      if (rect.top < vh * 0.12 && rect.width > vw * 0.5 && rect.height < vh * 0.25) return 'navbar';
      if (rect.bottom > vh * 0.88 && rect.width > vw * 0.5 && rect.height < vh * 0.25) return 'footer';
      // 卡片列表:框内有 ≥3 个大小相近、标签相同的块
      const blocks = inside.filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 60 && r.height > 40 && ['DIV', 'A', 'LI', 'ARTICLE', 'SECTION'].includes(e.tagName);
      });
      const groups = {};
      for (const e of blocks) {
        const key = e.tagName + '|' + (e.parentElement ? [...e.parentElement.children].length : 0);
        (groups[key] = groups[key] || []).push(e);
      }
      for (const g of Object.values(groups)) {
        if (g.length >= 3) {
          const sizes = g.map((e) => e.getBoundingClientRect().width);
          const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
          if (sizes.every((s) => Math.abs(s - avg) < avg * 0.5)) return 'cardlist';
        }
      }
      if (rect.top < vh * 0.35 && rect.width * rect.height > vw * vh * 0.28) return 'banner';
      return 'region';
    }

    /* ================= 选择器 / 样式采集 ================= */
    function buildSelector(el) {
      if (!el || el.nodeType !== 1) return '';
      if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return '#' + el.id;
      const path = [];
      let cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.documentElement && path.length < 6) {
        if (cur.id) { path.unshift('#' + cur.id); break; }
        let seg = cur.tagName.toLowerCase();
        const classes = [...(cur.classList || [])].filter((c) => /^[a-zA-Z][\w-]*$/.test(c)).slice(0, 2);
        if (classes.length) seg += '.' + classes.join('.');
        if (cur.parentElement) {
          const same = [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName);
          if (same.length > 1) seg += `:nth-of-type(${same.indexOf(cur) + 1})`;
        }
        path.unshift(seg);
        cur = cur.parentElement;
      }
      return path.join(' > ');
    }

    function pickStyles(el) {
      const cs = getComputedStyle(el);
      const keys = ['display', 'position', 'color', 'backgroundColor', 'fontFamily', 'fontSize',
        'fontWeight', 'borderRadius', 'boxShadow', 'border', 'padding', 'margin', 'gap',
        'backgroundImage', 'backdropFilter'];
      const out = {};
      for (const k of keys) out[k] = cs[k];
      return out;
    }

    /* ================= 截图(可视区域 → 裁剪) ================= */
    function captureRect(rect) {
      return new Promise((resolve) => {
        sendMsg({ kind: 'capture' }).then((resp) => {
          if (!resp || !resp.ok) return resolve(null);
          const dpr = window.devicePixelRatio || 1;
          const img = new Image();
          img.onload = () => {
            try {
              const x = Math.max(0, Math.round(rect.x * dpr));
              const y = Math.max(0, Math.round(rect.y * dpr));
              const w = Math.min(Math.round(rect.width * dpr), img.width - x);
              const h = Math.min(Math.round(rect.height * dpr), img.height - y);
              if (w <= 4 || h <= 4) return resolve(resp.dataUrl);
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
              resolve(canvas.toDataURL('image/png'));
            } catch {
              resolve(resp.dataUrl);
            }
          };
          img.onerror = () => resolve(null);
          img.src = resp.dataUrl;
        });
      });
    }

    /* ================= 面板 ================= */
    function closePanel() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (panelHost) { panelHost.remove(); panelHost = null; }
      removeOverlay();
    }

    function openPanel(sel) {
      closePanel();
      selection = sel;
      selectedTerms = [];
      panelHost = document.createElement('div');
      root.appendChild(panelHost);
      renderPanel();
      hint.style.display = 'none';
    }

    function renderPanel() {
      const sel = selection;
      const roleLabel = ROLE_LABEL[sel.role] || sel.role;
      const TERMS = globalThis.VIBEFIX_TERMS || { categories: [], rolePresets: {} };
      const presets = TERMS.rolePresets[sel.role] || TERMS.rolePresets.region || [];
      panelHost.innerHTML = `
        <div class="vf-panel">
          <div class="vf-p-head">
            <span class="vf-role-chip">${sel.kind === 'region' ? '框选区域' : '选中元素'} · ${roleLabel}</span>
            <span class="vf-p-title" title=""></span>
            <button class="vf-icon-btn" data-act="close" title="关闭面板(Esc)">✕</button>
          </div>
          <div class="vf-p-body">
            ${sel.screenshot ? `<div class="vf-shot"><img alt="截图"></div>` : ''}
            <div>
              <div class="vf-label">想怎么改?(也可以只点下方术语,让 Agent 自由发挥)</div>
              <textarea class="vf-textarea" placeholder="例如:这个侧边栏太普通了,换个更有质感的样子…"></textarea>
            </div>
            ${presets.length ? `<div><div class="vf-label">快捷指令(点一下直接填入)</div><div class="vf-chips vf-presets"></div></div>` : ''}
            <div>
              <div class="vf-label">设计术语库(可多选,随意见一起发给 Agent)</div>
              <div class="vf-cats"></div>
              <div class="vf-chips vf-terms"></div>
            </div>
            <div class="vf-actions">
              <button class="vf-btn" data-act="suggest">✦ AI 推荐样式</button>
              <button class="vf-btn" data-act="preview">✎ 生成效果预览</button>
            </div>
            <div class="vf-actions">
              <button class="vf-btn primary" data-act="submit">▶ 发送给 Agent 整改</button>
            </div>
            <div class="vf-status" data-role="status"></div>
            <div data-role="suggestions" style="display:flex;flex-direction:column;gap:8px"></div>
            <div data-role="previewbox"></div>
          </div>
        </div>`;

      const $ = (s) => panelHost.querySelector(s);
      $('.vf-p-title').textContent = sel.selector || (sel.rect ? `区域 ${Math.round(sel.rect.width)}×${Math.round(sel.rect.height)}` : '');
      if (sel.screenshot) $('.vf-shot img').src = sel.screenshot;

      // 快捷指令
      const presetsBox = $('.vf-presets');
      for (const p of presets) {
        const c = document.createElement('span');
        c.className = 'vf-chip'; c.textContent = p;
        c.onclick = () => { $('.vf-textarea').value = p; };
        presetsBox.appendChild(c);
      }

      // 术语分类
      const catsBox = $('.vf-cats');
      const termsBox = $('.vf-terms');
      let catIdx = 0;
      function renderTerms() {
        termsBox.innerHTML = '';
        const cat = TERMS.categories[catIdx];
        if (!cat) return;
        for (const t of cat.terms) {
          const c = document.createElement('span');
          c.className = 'vf-chip' + (selectedTerms.includes(t.name) ? ' sel' : '');
          c.textContent = t.name;
          c.title = t.desc;
          if (t.fits && t.fits.includes(sel.role)) c.style.borderColor = '#3ecf8e';
          c.onclick = () => {
            if (selectedTerms.includes(t.name)) selectedTerms = selectedTerms.filter((x) => x !== t.name);
            else selectedTerms.push(t.name);
            c.classList.toggle('sel');
          };
          termsBox.appendChild(c);
        }
      }
      TERMS.categories.forEach((cat, i) => {
        const b = document.createElement('button');
        b.className = 'vf-cat' + (i === 0 ? ' on' : '');
        b.textContent = cat.name;
        b.onclick = () => {
          catIdx = i;
          catsBox.querySelectorAll('.vf-cat').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          renderTerms();
        };
        catsBox.appendChild(b);
      });
      renderTerms();

      // 事件
      $('.vf-icon-btn[data-act="close"]').onclick = () => { closePanel(); hint.style.display = ''; };
      $('[data-act="submit"]').onclick = () => submit('fix');
      $('[data-act="suggest"]').onclick = () => submit('style_suggestion');
      $('[data-act="preview"]').onclick = () => submit('preview_image');
    }

    function panelStatus(text, cls) {
      const box = panelHost && panelHost.querySelector('[data-role="status"]');
      if (!box) return;
      box.textContent = text;
      box.className = 'vf-status' + (cls ? ' ' + cls : '');
    }

    function currentComment() {
      return panelHost ? panelHost.querySelector('.vf-textarea').value.trim() : '';
    }

    /* ================= 提交与轮询 ================= */
    function termPrompts(names) {
      const all = [];
      for (const cat of (globalThis.VIBEFIX_TERMS || {}).categories || []) all.push(...cat.terms);
      return names
        .map((n) => all.find((t) => t.name === n))
        .filter(Boolean)
        .map((t) => ({ name: t.name, prompt: t.prompt }));
    }

    async function submit(type) {
      const sel = selection;
      if (!sel) return;
      const comment = currentComment();
      if (type === 'fix' && !comment && !selectedTerms.length) {
        return panelStatus('先写点整改意见,或至少选一个术语吧', 'err');
      }
      const btns = panelHost.querySelectorAll('.vf-btn');
      btns.forEach((b) => (b.disabled = true));
      panelStatus(type === 'fix' ? '正在发送给 Agent…' : type === 'style_suggestion' ? '已提交,等待 AI 推荐(约 1 分钟内)…' : '已提交,等待生成预览图(约 1 分钟内)…');

      const payload = {
        type,
        pageUrl: location.href,
        pageTitle: document.title,
        selector: sel.selector || '',
        roleGuess: sel.role,
        rect: sel.rect ? { x: sel.rect.x, y: sel.rect.y, width: sel.rect.width, height: sel.rect.height } : null,
        html: sel.html || '',
        styles: sel.styles || null,
        comment,
        terms: termPrompts(selectedTerms),
        screenshot: sel.screenshot || null,
      };

      const resp = await sendMsg({ kind: 'bridge:submit', payload });
      btns.forEach((b) => (b.disabled = false));
      if (!resp || !resp.ok) {
        return panelStatus('发送失败:无法连接桥接服务。请先运行 node bridge/server.js', 'err');
      }
      const id = resp.data && resp.data.id;
      if (type === 'fix') {
        panelStatus(`✓ 已发送给 Agent(请求 #${id.slice(-5)})。刷新页面即可看到修改结果。`, 'ok');
        showToast(`整改请求 #${id.slice(-5)} 已发送`);
      } else {
        panelStatus(type === 'style_suggestion' ? `请求 #${id.slice(-5)} 已提交,正在等 AI 推荐…` : `请求 #${id.slice(-5)} 已提交,正在生成预览图…`);
        pollForResult(id, type);
      }
    }

    function pollForResult(id, type) {
      if (pollTimer) clearInterval(pollTimer);
      const start = Date.now();
      pollTimer = setInterval(async () => {
        if (Date.now() - start > 120000) {
          clearInterval(pollTimer); pollTimer = null;
          return panelStatus('等待超时:Agent 可能还没处理。可在控制台查看队列状态。', 'err');
        }
        const resp = await sendMsg({ kind: 'bridge:request', id });
        if (!resp || !resp.ok) return;
        const r = resp.data || {};
        if (type === 'style_suggestion' && r.response && r.response.suggestions) {
          clearInterval(pollTimer); pollTimer = null;
          renderSuggestions(r.response.suggestions, r.response.note);
        } else if (type === 'preview_image' && r.previewUrl) {
          clearInterval(pollTimer); pollTimer = null;
          renderPreviewImage(r.previewUrl, (r.preview && r.preview.note) || '');
        } else if (r.status === 'failed') {
          clearInterval(pollTimer); pollTimer = null;
          panelStatus('处理失败:' + (r.summary || '未知原因'), 'err');
        }
      }, 2500);
    }

    function renderSuggestions(list, note) {
      panelStatus('AI 推荐如下,点一个应用到整改意见:', 'ok');
      const box = panelHost.querySelector('[data-role="suggestions"]');
      box.innerHTML = '';
      list.forEach((s, i) => {
        const d = document.createElement('div');
        d.className = 'vf-sugg';
        const b = document.createElement('b'); b.textContent = `${i + 1}. ${s.title || s.name || '方案'}`;
        const sp = document.createElement('span'); sp.textContent = s.desc || s.description || '';
        d.append(b, sp);
        d.onclick = () => {
          const ta = panelHost.querySelector('.vf-textarea');
          const extra = (s.prompt || s.terms || []).join ? (s.terms || []).join('、') : (s.terms || '');
          ta.value = `采用推荐方案「${s.title || s.name || i + 1}」${s.desc ? ':' + s.desc : ''}${extra ? '(关键词:' + extra + ')' : ''}`;
          panelStatus('已应用推荐,可继续补充意见或直接发送', 'ok');
        };
        box.appendChild(d);
      });
      if (note) {
        const n = document.createElement('div');
        n.className = 'vf-status'; n.textContent = note;
        box.appendChild(n);
      }
    }

    let overlayEl = null;
    function removeOverlay() {
      if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    }

    function renderPreviewImage(previewUrl, note) {
      panelStatus('预览图生成完毕:', 'ok');
      const box = panelHost.querySelector('[data-role="previewbox"]');
      const url = settings.bridgeUrl.replace(/\/$/, '') + previewUrl;
      box.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'vf-preview-img'; img.src = url; img.alt = 'preview';
      const actions = document.createElement('div');
      actions.className = 'vf-actions'; actions.style.marginTop = '8px';
      const overlayBtn = document.createElement('button');
      overlayBtn.className = 'vf-btn'; overlayBtn.textContent = '在页面上叠加对比';
      overlayBtn.onclick = () => {
        if (overlayEl) { removeOverlay(); overlayBtn.textContent = '在页面上叠加对比'; return; }
        if (!selection || !selection.rect) return;
        overlayEl = document.createElement('div');
        overlayEl.className = 'vf-overlay';
        const r = selection.rect;
        Object.assign(overlayEl.style, { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' });
        const im = document.createElement('img');
        im.src = url;
        overlayEl.appendChild(im);
        root.appendChild(overlayEl);
        overlayBtn.textContent = '移除叠加对比';
      };
      const useBtn = document.createElement('button');
      useBtn.className = 'vf-btn primary'; useBtn.textContent = '就按这个改 →';
      useBtn.onclick = () => {
        const ta = panelHost.querySelector('.vf-textarea');
        ta.value = `按照生成的预览图效果来修改这个区域${note ? '(' + note + ')' : ''}`;
        submit('fix');
      };
      actions.append(overlayBtn, useBtn);
      box.append(img, actions);
    }

    /* ================= 页面事件 ================= */
    function onMouseMove(e) {
      if (!active || panelHost) return;
      if (mode !== 'pick') return hideHl();
      const t = e.composedPath()[0];
      if (!t || isOwnNode(t) || t === document.documentElement || t === document.body) return hideHl();
      hoverEl = t;
      paintHl(t);
    }

    function pickElement(el) {
      const rect = el.getBoundingClientRect();
      const role = guessElementRole(el);
      const selRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
      openPanel({
        kind: 'element', el, rect: selRect, role,
        selector: buildSelector(el),
        html: (el.outerHTML || '').slice(0, 4000),
        styles: pickStyles(el),
        screenshot: null,
      });
      captureRect(selRect).then((shot) => {
        if (selection && selection.el === el) {
          selection.screenshot = shot;
          const img = panelHost && panelHost.querySelector('.vf-shot img');
          if (img && shot) img.src = shot;
          else if (shot && panelHost) {
            // 截图后补渲染
            const body = panelHost.querySelector('.vf-p-body');
            const div = document.createElement('div');
            div.className = 'vf-shot';
            const im = document.createElement('img'); im.src = shot;
            div.appendChild(im);
            body.insertBefore(div, body.firstChild);
          }
        }
      });
    }

    function regionSelect(rect) {
      // 找出框内的元素
      const inside = [];
      const all = document.querySelectorAll('body *');
      for (const el of all) {
        if (isOwnNode(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const ix = Math.max(0, Math.min(r.right, rect.x + rect.width) - Math.max(r.left, rect.x));
        const iy = Math.max(0, Math.min(r.bottom, rect.y + rect.height) - Math.max(r.top, rect.y));
        if (ix * iy > r.width * r.height * 0.5) inside.push(el);
      }
      const role = guessRegionRole(rect, inside);
      // 找近似容器:面积最接近框且覆盖框大部分的最小元素
      let container = null;
      for (const el of inside) {
        const r = el.getBoundingClientRect();
        const cover = (Math.min(r.right, rect.x + rect.width) - Math.max(r.left, rect.x)) *
                      (Math.min(r.bottom, rect.y + rect.height) - Math.max(r.top, rect.y));
        if (cover > rect.width * rect.height * 0.7 &&
            r.width * r.height < rect.width * rect.height * 1.6) {
          if (!container || r.width * r.height < container.getBoundingClientRect().width * container.getBoundingClientRect().height) {
            container = el;
          }
        }
      }
      openPanel({
        kind: 'region', el: container, rect, role,
        selector: container ? buildSelector(container) : `body 内区域(${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}×${Math.round(rect.height)}`,
        html: container ? (container.outerHTML || '').slice(0, 4000) : '',
        styles: container ? pickStyles(container) : null,
        screenshot: null,
      });
      captureRect(rect).then((shot) => {
        if (selection && selection.kind === 'region' && selection.rect === rect) {
          selection.screenshot = shot;
          const img = panelHost && panelHost.querySelector('.vf-shot img');
          if (img && shot) img.src = shot;
          else if (shot && panelHost) {
            const body = panelHost.querySelector('.vf-p-body');
            const div = document.createElement('div');
            div.className = 'vf-shot';
            const im = document.createElement('img'); im.src = shot;
            div.appendChild(im);
            body.insertBefore(div, body.firstChild);
          }
        }
      });
    }

    function onMouseDown(e) {
      if (!active || panelHost || mode !== 'region') return;
      if (e.button !== 0) return;
      const t = e.composedPath()[0];
      if (isOwnNode(t)) return;
      dragStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }

    function onMouseDrag(e) {
      if (!dragStart) return;
      const x = Math.min(e.clientX, dragStart.x), y = Math.min(e.clientY, dragStart.y);
      const w = Math.abs(e.clientX - dragStart.x), h = Math.abs(e.clientY - dragStart.y);
      Object.assign(marquee.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      e.preventDefault();
    }

    function onMouseUp(e) {
      if (!dragStart) return;
      const rect = {
        x: Math.min(e.clientX, dragStart.x), y: Math.min(e.clientY, dragStart.y),
        width: Math.abs(e.clientX - dragStart.x), height: Math.abs(e.clientY - dragStart.y),
      };
      dragStart = null;
      marquee.style.display = 'none';
      if (rect.width < 8 || rect.height < 8) {
        // 视为点击 → 选中最上层元素
        const t = document.elementFromPoint(e.clientX, e.clientY);
        if (t && !isOwnNode(t) && t !== document.body && t !== document.documentElement) pickElement(t);
        return;
      }
      rect.right = rect.x + rect.width; rect.bottom = rect.y + rect.height;
      regionSelect(rect);
    }

    function onClick(e) {
      if (!active || panelHost || mode !== 'pick') return;
      const t = e.composedPath()[0];
      if (!t || isOwnNode(t)) return;
      if (t === document.body || t === document.documentElement) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      hideHl();
      pickElement(t);
    }

    function onKey(e) {
      if (!active) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') {
        if (panelHost) { closePanel(); hint.style.display = ''; }
        else exit();
        e.stopPropagation();
        return;
      }
      if (typing || panelHost) return;
      if (e.key === 'p' || e.key === 'P') setMode('pick');
      if (e.key === 'r' || e.key === 'R') setMode('region');
    }

    /* ================= 生命周期 ================= */
    function bind() {
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mousedown', onMouseDown, true);
      document.addEventListener('mousemove', onMouseDrag, true);
      document.addEventListener('mouseup', onMouseUp, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey, true);
      toolbar.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-m]');
        if (b) setMode(b.dataset.m);
      });
    }

    function exit() {
      active = false;
      closePanel();
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mousemove', onMouseDrag, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      host.remove();
      delete window.__viberfix;
    }

    function toggle() {
      if (panelHost) closePanel();
      else exit();
    }

    window.__viberfix = { toggle, exit };
    bind();
    setMode('pick');
    showToast('ViberFix 已就绪:点击元素或切换「框区域」模式');
  })();
}
