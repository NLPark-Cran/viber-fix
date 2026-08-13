/**
 * ViberFix background service worker
 * - 点击图标:在当前页注入/切换检查器
 * - 转发 content/popup 的消息:截图、提交请求、轮询结果、读写设置
 */

'use strict';

const DEFAULTS = {
  bridgeUrl: 'http://127.0.0.1:8787',
  projectPath: '',
};

async function getSettings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

async function bridgeFetch(path, options = {}) {
  const { bridgeUrl } = await getSettings();
  const res = await fetch(bridgeUrl.replace(/\/$/, '') + path, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    ...options,
  });
  return res.json();
}

/* ---------- 注入检查器 ---------- */

async function toggleInspector(tab) {
  if (!tab || !tab.id) return;
  if (/^chrome|^edge|^about|^https:\/\/chrome\.google/i.test(tab.url || '')) {
    return; // 浏览器内部页面无法注入
  }
  try {
    // 样式内置在 inspector.js 的 Shadow DOM 中,无需 insertCSS
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/terms.js', 'content/inspector.js'],
    });
  } catch (e) {
    console.warn('[viberfix] inject failed:', e.message);
  }
}

chrome.action.onClicked.addListener((tab) => toggleInspector(tab));

/* ---------- 消息路由 ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.kind) {
      case 'toggle': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await toggleInspector(tab);
        sendResponse({ ok: true });
        break;
      }

      case 'capture': {
        // content 请求当前可视区域截图,自行裁剪到目标矩形
        try {
          const dataUrl = await chrome.tabs.captureVisibleArea(sender.tab.windowId, { format: 'png' });
          sendResponse({ ok: true, dataUrl });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }

      case 'settings:get': {
        sendResponse({ ok: true, settings: await getSettings() });
        break;
      }

      case 'settings:save': {
        await chrome.storage.local.set(msg.settings || {});
        sendResponse({ ok: true });
        break;
      }

      case 'bridge:health': {
        try {
          const data = await bridgeFetch('/health');
          sendResponse({ ok: true, data });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }

      case 'bridge:submit': {
        try {
          const settings = await getSettings();
          const payload = { ...(msg.payload || {}), projectPath: settings.projectPath };
          const data = await bridgeFetch('/api/requests', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          sendResponse({ ok: !!data.ok, data });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }

      case 'bridge:request': {
        try {
          const data = await bridgeFetch(`/api/requests/${encodeURIComponent(msg.id)}`);
          sendResponse({ ok: true, data });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }

      case 'bridge:list': {
        try {
          const data = await bridgeFetch(`/api/requests${msg.status ? `?status=${msg.status}` : ''}`);
          sendResponse({ ok: true, data });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }

      case 'dashboard:open': {
        const { bridgeUrl } = await getSettings();
        await chrome.tabs.create({ url: bridgeUrl.replace(/\/$/, '') + '/' });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, error: 'unknown message: ' + msg.kind });
    }
  })();
  return true; // 保持消息通道开放(异步响应)
});
