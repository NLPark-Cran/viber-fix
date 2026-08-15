/**
 * dsh-viberfix —— DeepSeek Harness 插件(一切皆插件)
 *
 * 遵循 dsh 工具契约(docs/cookbook/adding-a-tool.md):
 *  - 导出 name / inject / apply(ctx)
 *  - 通过 ctx.tools.register(defineTool(...)) 注册模型可见工具
 *  - 注册是基于 effect 的:插件卸载时工具自动注销
 *
 * 工具后端是 ViberFix 桥接服务(HTTP),与 MCP server / CLI / skill 共享同一队列,
 * 保证 dsh、cran-code、QwenWork 三条接入路径看到的是同一份状态。
 */

import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'dsh-viberfix';
export const inject = ['tools'];

const DEFAULT_BRIDGE = 'http://127.0.0.1:8787';

async function bridge(bridgeUrl, method, p, body) {
  const res = await fetch(bridgeUrl.replace(/\/$/, '') + p, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: body ? JSON.stringify(body) : undefined,
    signal: undefined,
  });
  if (!res.ok) throw new Error(`bridge ${method} ${p} -> HTTP ${res.status}`);
  return res.json();
}

export function apply(ctx, config = {}) {
  const bridgeUrl = (config && config.bridgeUrl) || DEFAULT_BRIDGE;
  const call = (method, p, body) => bridge(bridgeUrl, method, p, body);

  ctx.tools.register(
    defineTool({
      name: 'viberfix_list_requests',
      description:
        '列出 ViberFix 整改队列:用户在浏览器里框选 Vibe 页面元素后提交的截图+意见+设计术语。返回待处理请求摘要。',
      parameters: {
        status: { type: 'string', description: 'pending/picked_up/done/failed,默认 pending' },
      },
      output: {
        schema: { type: 'array' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args, exec) {
        const status = args.status || 'pending';
        const r = await call('GET', `/api/requests?status=${status}`);
        return (r.requests || []).map((x) => ({
          id: x.id, type: x.type, status: x.status, roleGuess: x.roleGuess,
          comment: x.comment, pageUrl: x.pageUrl, projectPath: x.projectPath,
        }));
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_get_request',
      description:
        '查看单条整改请求详情:截图 URL(screenshotUrl)、CSS 选择器、语义猜测 roleGuess、用户意见、术语(带英文 prompt)、源码目录 projectPath。',
      parameters: { id: { type: 'string', required: true, description: '请求 id' } },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args, exec) {
        return call('GET', `/api/requests/${encodeURIComponent(args.id)}`);
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_pickup',
      description: '认领一条整改请求(状态 → picked_up),多 Agent 协同时避免重复处理。',
      parameters: { id: { type: 'string', required: true } },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: `已认领 ${value.id}` }],
      },
      async execute(args) {
        return call('POST', `/api/requests/${encodeURIComponent(args.id)}/status`, { status: 'picked_up' });
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_respond',
      description: '回传 AI 样式推荐(style_suggestion 请求)。插件端轮询后展示推荐方案供用户一键应用。',
      parameters: {
        id: { type: 'string', required: true },
        suggestions: {
          type: 'array',
          required: true,
          description: '每项 {title, desc, terms}',
        },
        note: { type: 'string' },
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: '推荐已回传' }],
      },
      async execute(args) {
        return call('POST', `/api/requests/${encodeURIComponent(args.id)}/response`, {
          suggestions: args.suggestions,
          note: args.note || '',
        });
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_preview',
      description: '回传生图预览(preview_image 请求)。imagePath 为本地图片绝对路径,插件会叠加到页面上对比。',
      parameters: {
        id: { type: 'string', required: true },
        imagePath: { type: 'string', required: true, description: '本地图片绝对路径' },
        note: { type: 'string' },
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: `预览已回传: ${value.previewUrl}` }],
      },
      async execute(args) {
        return call('POST', `/api/requests/${encodeURIComponent(args.id)}/preview`, {
          imagePath: args.imagePath,
          note: args.note || '',
        });
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_done',
      description: '标记整改完成,summary 写清改了哪些文件(用户刷新页面可见)。',
      parameters: {
        id: { type: 'string', required: true },
        summary: { type: 'string', required: true },
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: `已完成 ${value.id}` }],
      },
      async execute(args) {
        return call('POST', `/api/requests/${encodeURIComponent(args.id)}/status`, {
          status: 'done',
          summary: args.summary,
        });
      },
    })
  );

  ctx.tools.register(
    defineTool({
      name: 'viberfix_trace',
      description: '读取 ViberFix 执行轨迹(可观测证据):队列状态流转事件,最新在前。',
      parameters: { limit: { type: 'number' } },
      output: {
        schema: { type: 'array' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args) {
        const r = await call('GET', `/api/trace?limit=${args.limit || 50}`);
        return r.events || [];
      },
    })
  );
}
