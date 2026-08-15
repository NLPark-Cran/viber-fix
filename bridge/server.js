#!/usr/bin/env node
/**
 * ViberFix Bridge —— 本地桥接服务(零依赖,纯 Node)
 *
 * 职责:
 *  1. 接收浏览器插件提交的整改请求(截图 + 选择器 + 意见 + 术语)
 *  2. 以文件形式持久化队列,供 QwenWork skill / Agent 消费
 *  3. 回传 AI 样式推荐、生图预览结果给插件
 *  4. 提供一个轻量控制台页面方便查看队列状态
 *
 * 启动: node bridge/server.js   (可用环境变量 VIBEFIX_PORT 改端口,默认 8787)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.VIBEFIX_PORT || '8787', 10);
const HOST = process.env.VIBEFIX_HOST || '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const REQ_DIR = path.join(DATA_DIR, 'requests');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const VERSION = '0.1.0';
const MAX_BODY = 60 * 1024 * 1024; // 截图 base64 可能较大,给 60MB 上限

for (const dir of [DATA_DIR, REQ_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const TRACE_FILE = path.join(DATA_DIR, 'trace.jsonl');

/** 可观测:追加执行轨迹事件(JSONL),作为运行证据 */
function trace(event, fields) {
  try {
    const rec = { ts: nowIso(), event, ...(fields || {}) };
    fs.appendFileSync(TRACE_FILE, JSON.stringify(rec) + '\n');
  } catch {
    /* 轨迹写入失败不应影响主流程 */
  }
}

/* ---------------- 工具函数 ---------------- */

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}` +
    `-${Math.random().toString(36).slice(2, 7)}`
  );
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function dataUrlToFile(dataUrl, ext) {
  const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[3], 'base64'), ext: ext || m[2] };
}

function reqPath(id) {
  return path.join(REQ_DIR, `${id}.json`);
}

function safeId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9-_]/g, '');
}

function loadReq(id) {
  try {
    return JSON.parse(fs.readFileSync(reqPath(id), 'utf8'));
  } catch {
    return null;
  }
}

function saveReq(rec) {
  rec.updatedAt = nowIso();
  fs.writeFileSync(reqPath(rec.id), JSON.stringify(rec, null, 2), 'utf8');
  return rec;
}

function listReqs(status) {
  let files = [];
  try {
    files = fs.readdirSync(REQ_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    files = [];
  }
  const out = [];
  for (const f of files) {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(REQ_DIR, f), 'utf8'));
      if (!status || rec.status === status) out.push(rec);
    } catch {
      /* 忽略损坏文件 */
    }
  }
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

function summarize(rec) {
  // 列表接口去掉大字段,保持轻量
  const { screenshot, html, styles, ...rest } = rec;
  rest.hasScreenshot = Boolean(screenshot);
  rest.htmlBytes = html ? html.length : 0;
  return rest;
}

function serveFile(res, file, mime) {
  fs.readFile(file, (err, buf) => {
    if (err) return json(res, 404, { error: 'not found' });
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}

/* ---------------- 请求处理 ---------------- */

async function handle(req, res) {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname || '/';
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  /* --- 健康检查 --- */
  if (p === '/health') {
    return json(res, 200, { ok: true, name: 'viberfix-bridge', version: VERSION, time: nowIso() });
  }

  /* --- 术语库(插件与控制台共用) --- */
  if (p === '/terms') {
    return serveFile(res, path.join(__dirname, 'terms.json'), 'application/json; charset=utf-8');
  }

  /* --- 控制台页面 --- */
  if (p === '/' || p === '/index.html') {
    return serveFile(res, path.join(__dirname, 'dashboard.html'), 'text/html; charset=utf-8');
  }

  /* --- 上传文件访问(截图/预览图) --- */
  const up = /^\/api\/uploads\/([a-zA-Z0-9-_.]+)\.(png|jpg|jpeg|webp)$/.exec(p);
  if (method === 'GET' && up) {
    return serveFile(res, path.join(UPLOAD_DIR, `${up[1]}.${up[2]}`), `image/${up[2] === 'jpg' ? 'jpeg' : up[2]}`);
  }

  /* --- 请求列表 --- */
  if (method === 'GET' && p === '/api/requests') {
    const status = parsed.query.status || '';
    const list = listReqs(status).map(summarize);
    return json(res, 200, { requests: list });
  }

  /* --- 提交新请求 --- */
  if (method === 'POST' && p === '/api/requests') {
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8'));
    } catch (e) {
      return json(res, 400, { error: 'invalid json: ' + e.message });
    }
    const id = newId();
    let screenshotFile = null;
    if (body.screenshot) {
      const img = dataUrlToFile(body.screenshot);
      if (img) {
        screenshotFile = `${id}.${img.ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, screenshotFile), img.buf);
      }
    }
    const rec = {
      id,
      status: 'pending', // pending -> picked_up -> done | failed
      type: ['fix', 'style_suggestion', 'preview_image'].includes(body.type) ? body.type : 'fix',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      pageUrl: body.pageUrl || '',
      pageTitle: body.pageTitle || '',
      projectPath: body.projectPath || '',
      selector: body.selector || '',
      roleGuess: body.roleGuess || '',
      rect: body.rect || null,
      html: body.html || '',
      styles: body.styles || null,
      comment: body.comment || '',
      terms: Array.isArray(body.terms) ? body.terms : [],
      screenshot: screenshotFile, // 存文件名而非 base64,保持 JSON 轻量
      response: null, // AI 样式推荐结果
      preview: null, // 生图预览结果
      summary: '', // Agent 完成后的总结
    };
    saveReq(rec);
    trace('request.created', { id, type: rec.type, roleGuess: rec.roleGuess, pageUrl: rec.pageUrl });
    console.log(`[viberfix] new request #${id} type=${rec.type} role=${rec.roleGuess || '-'} url=${rec.pageUrl}`);
    return json(res, 200, { ok: true, id, screenshotUrl: screenshotFile ? `/api/uploads/${screenshotFile}` : null });
  }

  /* --- 单条请求详情 --- */
  const one = /^\/api\/requests\/([a-zA-Z0-9-]+)$/.exec(p);
  if (method === 'GET' && one) {
    const rec = loadReq(safeId(one[1]));
    if (!rec) return json(res, 404, { error: 'request not found' });
    const out = { ...rec };
    if (rec.screenshot) out.screenshotUrl = `/api/uploads/${rec.screenshot}`;
    if (rec.preview && rec.preview.image) out.previewUrl = `/api/uploads/${rec.preview.image}`;
    delete out.screenshot;
    if (rec.preview) delete out.preview.image;
    return json(res, 200, out);
  }

  /* --- 更新状态(Agent 认领/完成) --- */
  const st = /^\/api\/requests\/([a-zA-Z0-9-]+)\/status$/.exec(p);
  if (method === 'POST' && st) {
    const rec = loadReq(safeId(st[1]));
    if (!rec) return json(res, 404, { error: 'request not found' });
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8'));
    } catch (e) {
      return json(res, 400, { error: 'invalid json' });
    }
    if (body.status && ['pending', 'picked_up', 'done', 'failed'].includes(body.status)) {
      rec.status = body.status;
    }
    if (body.summary) rec.summary = String(body.summary);
    saveReq(rec);
    trace('status.changed', { id: rec.id, status: rec.status, summary: rec.summary || undefined });
    console.log(`[viberfix] #${rec.id} -> ${rec.status}`);
    return json(res, 200, { ok: true, id: rec.id, status: rec.status });
  }

  /* --- AI 样式推荐回传(skill 写入,插件轮询) --- */
  const rp = /^\/api\/requests\/([a-zA-Z0-9-]+)\/response$/.exec(p);
  if (method === 'POST' && rp) {
    const rec = loadReq(safeId(rp[1]));
    if (!rec) return json(res, 404, { error: 'request not found' });
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'invalid json' });
    }
    rec.response = {
      suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
      note: body.note || '',
      at: nowIso(),
    };
    saveReq(rec);
    trace('response.sent', { id: rec.id, suggestions: rec.response.suggestions.length });
    return json(res, 200, { ok: true });
  }

  /* --- 生图预览回传(支持 dataURL 或服务器本地文件路径) --- */
  const pv = /^\/api\/requests\/([a-zA-Z0-9-]+)\/preview$/.exec(p);
  if (method === 'POST' && pv) {
    const rec = loadReq(safeId(pv[1]));
    if (!rec) return json(res, 404, { error: 'request not found' });
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'invalid json' });
    }
    let file = null;
    if (body.image) {
      const img = dataUrlToFile(body.image);
      if (img) {
        file = `${rec.id}-preview.${img.ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, file), img.buf);
      }
    } else if (body.imagePath) {
      try {
        const buf = fs.readFileSync(body.imagePath);
        const ext = (path.extname(body.imagePath).slice(1) || 'png').toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          file = `${rec.id}-preview.${ext === 'jpg' ? 'jpeg' : ext}`;
          fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
        }
      } catch (e) {
        return json(res, 400, { error: 'cannot read imagePath: ' + e.message });
      }
    }
    if (!file) return json(res, 400, { error: 'need image(dataURL) or imagePath' });
    rec.preview = { image: file, note: body.note || '', at: nowIso() };
    saveReq(rec);
    trace('preview.sent', { id: rec.id, file });
    return json(res, 200, { ok: true, previewUrl: `/api/uploads/${file}` });
  }

  /* --- 执行轨迹(可观测证据) --- */
  if (method === 'GET' && p === '/api/trace') {
    let lines = [];
    try {
      lines = fs.readFileSync(TRACE_FILE, 'utf8').trim().split('\n').filter(Boolean);
    } catch {
      lines = [];
    }
    lines.reverse();
    const limit = Math.min(parseInt(parsed.query.limit || '100', 10) || 100, 1000);
    const events = lines.slice(0, limit).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
    return json(res, 200, { events });
  }

  json(res, 404, { error: 'unknown endpoint', path: p });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error('[viberfix] handler error:', e.message);
    try {
      json(res, 500, { error: e.message });
    } catch {
      /* ignore */
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ViberFix Bridge 已启动                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  地址:     http://${HOST}:${PORT}`);
  console.log(`  控制台:   http://${HOST}:${PORT}/`);
  console.log(`  健康检查: http://${HOST}:${PORT}/health`);
  console.log('  Ctrl+C 退出');
});
