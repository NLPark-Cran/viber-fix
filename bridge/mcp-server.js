#!/usr/bin/env node
/**
 * ViberFix MCP Server(stdio,零依赖)
 *
 * 把桥接队列暴露为标准 MCP 工具,供任何 MCP 客户端消费:
 *  - cran-code(猹询码):kimi mcp / --mcp-config-file 接入,见 integrations/cran-code/
 *  - AgentTeams Worker:声明式 MCP(CRD spec.mcpServers)接入
 *  - 其他任意 MCP 兼容 Agent
 *
 * 启动方式(由 MCP 客户端以 stdio 方式拉起):
 *   node bridge/mcp-server.js
 *
 * 协议:JSON-RPC 2.0 over stdio,一行一条消息(MCP stdio transport)。
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const BRIDGE_HOST = process.env.VIBEFIX_HOST || '127.0.0.1';
const BRIDGE_PORT = parseInt(process.env.VIBEFIX_PORT || '8787', 10);
const TRACE_FILE = path.join(__dirname, 'data', 'trace.jsonl');

/* ---------------- 桥接 HTTP 客户端 ---------------- */

function bridge(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: BRIDGE_HOST,
        port: BRIDGE_PORT,
        path: p,
        method,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ code: res.statusCode, body: JSON.parse(text) });
          } catch {
            resolve({ code: res.statusCode, body: text });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function text(s) {
  return { content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] };
}

function fail(msg) {
  return { content: [{ type: 'text', text: '错误: ' + msg }], isError: true };
}

/* ---------------- 工具定义 ---------------- */

const TOOLS = [
  {
    name: 'viberfix_list_requests',
    description: '列出 ViberFix 整改队列中的请求(用户在浏览器里框选页面元素后提交的截图+意见+术语)。status 可选 pending/picked_up/done/failed,默认 pending。',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['pending', 'picked_up', 'done', 'failed'] } },
    },
  },
  {
    name: 'viberfix_get_request',
    description: '查看单条整改请求详情:截图路径(screenshotUrl,本地文件在 bridge/data/uploads/)、CSS 选择器、语义猜测 roleGuess、用户意见 comment、术语 terms、源码目录 projectPath。',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'viberfix_pickup',
    description: '认领一条整改请求,状态置为 picked_up,避免重复处理。',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'viberfix_respond',
    description: '回传 AI 样式推荐(用于 type=style_suggestion 的请求)。suggestions 为数组,每项 {title, desc, terms}。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, desc: { type: 'string' }, terms: { type: 'array', items: { type: 'string' } } },
            required: ['title'],
          },
        },
        note: { type: 'string' },
      },
      required: ['id', 'suggestions'],
    },
  },
  {
    name: 'viberfix_preview',
    description: '回传生图预览(用于 type=preview_image 的请求)。imagePath 为本地图片文件绝对路径,插件会轮询并叠加到页面上对比。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, imagePath: { type: 'string' }, note: { type: 'string' } },
      required: ['id', 'imagePath'],
    },
  },
  {
    name: 'viberfix_done',
    description: '标记整改请求完成,summary 写清改了哪些文件、用户刷新页面可见。',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, summary: { type: 'string' } }, required: ['id', 'summary'] },
  },
  {
    name: 'viberfix_fail',
    description: '标记整改请求失败并附原因。',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] },
  },
  {
    name: 'viberfix_trace',
    description: '读取执行轨迹(可观测证据):队列上所有状态流转事件的 JSONL 记录,最新在前。',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
];

async function callTool(name, args) {
  try {
    switch (name) {
      case 'viberfix_list_requests': {
        const status = args.status || 'pending';
        const r = await bridge('GET', `/api/requests?status=${status}`);
        if (r.code !== 200) return fail('bridge 响应 ' + r.code);
        const list = (r.body.requests || []).map((x) => ({
          id: x.id, type: x.type, status: x.status, roleGuess: x.roleGuess,
          comment: x.comment, terms: (x.terms || []).map((t) => t.name || t),
          pageUrl: x.pageUrl, projectPath: x.projectPath, createdAt: x.createdAt,
        }));
        return text(list.length ? list : '队列为空');
      }
      case 'viberfix_get_request': {
        const r = await bridge('GET', `/api/requests/${encodeURIComponent(args.id)}`);
        if (r.code === 404) return fail('请求不存在: ' + args.id);
        if (r.code !== 200) return fail('bridge 响应 ' + r.code);
        const rec = r.body;
        return text({
          ...rec,
          screenshotLocalPath: rec.screenshotUrl ? path.join(__dirname, 'data', 'uploads', path.basename(rec.screenshotUrl)) : null,
        });
      }
      case 'viberfix_pickup': {
        const r = await bridge('POST', `/api/requests/${encodeURIComponent(args.id)}/status`, { status: 'picked_up' });
        return r.body.ok ? text(`已认领 ${args.id}`) : fail(JSON.stringify(r.body));
      }
      case 'viberfix_respond': {
        const r = await bridge('POST', `/api/requests/${encodeURIComponent(args.id)}/response`, {
          suggestions: args.suggestions, note: args.note || '',
        });
        return r.body.ok ? text('推荐已回传,插件端将展示') : fail(JSON.stringify(r.body));
      }
      case 'viberfix_preview': {
        if (!fs.existsSync(args.imagePath)) return fail('图片不存在: ' + args.imagePath);
        const r = await bridge('POST', `/api/requests/${encodeURIComponent(args.id)}/preview`, {
          imagePath: args.imagePath, note: args.note || '',
        });
        return r.body.ok ? text('预览已回传: ' + r.body.previewUrl) : fail(JSON.stringify(r.body));
      }
      case 'viberfix_done': {
        const r = await bridge('POST', `/api/requests/${encodeURIComponent(args.id)}/status`, { status: 'done', summary: args.summary });
        return r.body.ok ? text(`已完成 ${args.id}`) : fail(JSON.stringify(r.body));
      }
      case 'viberfix_fail': {
        const r = await bridge('POST', `/api/requests/${encodeURIComponent(args.id)}/status`, { status: 'failed', summary: args.reason });
        return r.body.ok ? text(`已标记失败 ${args.id}`) : fail(JSON.stringify(r.body));
      }
      case 'viberfix_trace': {
        let lines = [];
        try {
          lines = fs.readFileSync(TRACE_FILE, 'utf8').trim().split('\n').filter(Boolean);
        } catch {
          return text('暂无轨迹记录');
        }
        lines.reverse();
        const limit = args.limit || 50;
        return text(lines.slice(0, limit).map((l) => JSON.parse(l)));
      }
      default:
        return fail('未知工具: ' + name);
    }
  } catch (e) {
    if (e.code === 'ECONNREFUSED') return fail(`桥接服务未启动(${BRIDGE_HOST}:${BRIDGE_PORT}),先运行 node bridge/server.js`);
    return fail(e.message);
  }
}

/* ---------------- JSON-RPC over stdio ---------------- */

function reply(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      continue;
    }
    handle(req);
  }
});

async function handle(req) {
  const { id, method, params } = req;
  if (method === 'initialize') {
    reply({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: params && params.protocolVersion ? params.protocolVersion : '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'viberfix-bridge', version: '0.1.0' },
      },
    });
    return;
  }
  if (method === 'notifications/initialized' || id === undefined) return; // 通知不回包
  if (method === 'tools/list') {
    reply({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const result = await callTool(name, args || {});
    reply({ jsonrpc: '2.0', id, result });
    return;
  }
  if (method === 'ping') {
    reply({ jsonrpc: '2.0', id, result: {} });
    return;
  }
  reply({ jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + method } });
}

process.stdin.on('end', () => process.exit(0));
