'use strict';

const send = (m) => new Promise((resolve) => chrome.runtime.sendMessage(m, (r) => resolve(r || { ok: false })));

const STATUS = {
  pending: ['待处理', 'b-pending'],
  picked_up: ['处理中', 'b-picked_up'],
  done: ['已完成', 'b-done'],
  failed: ['失败', 'b-failed'],
};
const TYPE = { fix: '整改', style_suggestion: 'AI 推荐', preview_image: '生图预览' };

async function init() {
  const { settings } = await send({ kind: 'settings:get' });
  const pathInput = document.getElementById('projectPath');
  const urlInput = document.getElementById('bridgeUrl');
  pathInput.value = settings.projectPath || '';
  urlInput.value = settings.bridgeUrl || '';

  // 自动保存设置(防抖)
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      send({ kind: 'settings:save', settings: { projectPath: pathInput.value.trim(), bridgeUrl: urlInput.value.trim() || 'http://127.0.0.1:8787' } });
    }, 350);
  }
  pathInput.addEventListener('input', save);
  urlInput.addEventListener('input', save);

  // 桥接服务健康检查
  const dot = document.getElementById('dot');
  const bridgeText = document.getElementById('bridgeText');
  const errTip = document.getElementById('errTip');
  const h = await send({ kind: 'bridge:health' });
  if (h.ok && h.data && h.data.ok) {
    dot.classList.add('on');
    bridgeText.textContent = `桥接服务在线 v${h.data.version}`;
    errTip.style.display = 'none';
  } else {
    dot.classList.add('off');
    bridgeText.textContent = '桥接服务未连接';
    errTip.style.display = 'block';
  }

  // 队列
  const queueList = document.getElementById('queueList');
  const list = await send({ kind: 'bridge:list' });
  if (list.ok && list.data && list.data.requests) {
    const reqs = list.data.requests.slice(0, 5);
    if (!reqs.length) {
      queueList.innerHTML = '<div class="empty">还没有请求,点「开始框选」试试</div>';
    } else {
      queueList.innerHTML = '';
      for (const r of reqs) {
        const [label, cls] = STATUS[r.status] || [r.status, ''];
        const div = document.createElement('div');
        div.className = 'q-item';
        const badge = document.createElement('span');
        badge.className = 'badge ' + cls;
        badge.textContent = label;
        const text = document.createElement('span');
        text.className = 'q-text';
        text.textContent = `${TYPE[r.type] || r.type} · ${r.comment || r.roleGuess || '(无意见)'}`;
        text.title = text.textContent;
        div.append(badge, text);
        queueList.appendChild(div);
      }
    }
  } else {
    queueList.innerHTML = '<div class="empty">服务未连接,无法加载队列</div>';
  }

  document.getElementById('startBtn').addEventListener('click', async () => {
    await send({ kind: 'settings:save', settings: { projectPath: pathInput.value.trim(), bridgeUrl: urlInput.value.trim() || 'http://127.0.0.1:8787' } });
    await send({ kind: 'toggle' });
    window.close();
  });

  document.getElementById('dashBtn').addEventListener('click', () => {
    send({ kind: 'dashboard:open' });
    window.close();
  });
}

init();
