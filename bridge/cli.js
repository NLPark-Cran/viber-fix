#!/usr/bin/env node
/**
 * ViberFix CLI —— 供 QwenWork skill / Agent 消费整改队列
 *
 * 用法:
 *   node cli.js health                          检查桥接服务是否在线
 *   node cli.js list [status]                   列出请求(默认 pending;可选 all/done/failed/picked_up)
 *   node cli.js show <id>                       查看单条请求详情
 *   node cli.js pickup <id>                     标记为已认领(picked_up)
 *   node cli.js done <id> [总结文字...]          标记为完成并附总结
 *   node cli.js fail <id> [原因...]              标记为失败并附原因
 *   node cli.js respond <id> <suggestionsJson>  回传 AI 样式推荐
 *   node cli.js preview <id> <图片文件路径> [备注]  回传生图预览(直接读本地图片文件)
 *   node cli.js trace [limit]                     查看执行轨迹(可观测证据)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.VIBEFIX_HOST || '127.0.0.1';
const PORT = parseInt(process.env.VIBEFIX_PORT || '8787', 10);

function request(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: HOST,
        port: PORT,
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
    req.on('error', (e) => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

function brief(rec) {
  return {
    id: rec.id,
    type: rec.type,
    status: rec.status,
    roleGuess: rec.roleGuess || '-',
    comment: (rec.comment || '').slice(0, 60),
    terms: rec.terms,
    pageUrl: rec.pageUrl,
    projectPath: rec.projectPath,
    createdAt: rec.createdAt,
  };
}

async function main() {
  const [, , cmd, ...rest] = process.argv;

  try {
    switch (cmd) {
      case 'health': {
        const r = await request('GET', '/health');
        console.log(r.body.ok ? `bridge 在线 v${r.body.version}` : 'bridge 异常');
        break;
      }
      case 'list': {
        const status = rest[0] && rest[0] !== 'all' ? rest[0] : '';
        const r = await request('GET', `/api/requests${status ? `?status=${status}` : ''}`);
        const list = (r.body.requests || []).map(brief);
        if (!list.length) {
          console.log(status === '' ? '队列为空' : `没有 ${status} 状态的请求`);
        } else {
          console.log(JSON.stringify(list, null, 2));
        }
        break;
      }
      case 'show': {
        if (!rest[0]) throw new Error('用法: show <id>');
        const r = await request('GET', `/api/requests/${rest[0]}`);
        if (r.code === 404) console.log('请求不存在: ' + rest[0]);
        else console.log(JSON.stringify(r.body, null, 2));
        break;
      }
      case 'pickup': {
        if (!rest[0]) throw new Error('用法: pickup <id>');
        const r = await request('POST', `/api/requests/${rest[0]}/status`, { status: 'picked_up' });
        console.log(r.body.ok ? `#${rest[0]} 已认领` : JSON.stringify(r.body));
        break;
      }
      case 'done': {
        const id = rest.shift();
        if (!id) throw new Error('用法: done <id> [总结...]');
        const r = await request('POST', `/api/requests/${id}/status`, {
          status: 'done',
          summary: rest.join(' ') || '已完成整改',
        });
        console.log(r.body.ok ? `#${id} 已标记完成` : JSON.stringify(r.body));
        break;
      }
      case 'fail': {
        const id = rest.shift();
        if (!id) throw new Error('用法: fail <id> [原因...]');
        const r = await request('POST', `/api/requests/${id}/status`, {
          status: 'failed',
          summary: rest.join(' ') || '处理失败',
        });
        console.log(r.body.ok ? `#${id} 已标记失败` : JSON.stringify(r.body));
        break;
      }
      case 'respond': {
        const id = rest[0];
        const payloadRaw = rest[1];
        if (!id || !payloadRaw) throw new Error('用法: respond <id> <suggestionsJson>');
        let payload;
        try {
          payload = JSON.parse(payloadRaw);
        } catch {
          throw new Error('suggestionsJson 不是合法 JSON');
        }
        if (Array.isArray(payload)) payload = { suggestions: payload };
        const r = await request('POST', `/api/requests/${id}/response`, payload);
        console.log(r.body.ok ? `#${id} 推荐已回传` : JSON.stringify(r.body));
        break;
      }
      case 'preview': {
        const id = rest[0];
        const imgPath = rest[1];
        const note = rest.slice(2).join(' ');
        if (!id || !imgPath) throw new Error('用法: preview <id> <图片路径> [备注]');
        const abs = path.resolve(imgPath);
        if (!fs.existsSync(abs)) throw new Error('图片不存在: ' + abs);
        const ext = path.extname(abs).slice(1).toLowerCase();
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext || 'png'}`;
        const dataUrl = `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
        const r = await request('POST', `/api/requests/${id}/preview`, { image: dataUrl, note });
        console.log(r.body.ok ? `#${id} 预览图已回传: ${r.body.previewUrl}` : JSON.stringify(r.body));
        break;
      }
      case 'trace': {
        const limit = parseInt(rest[0] || '50', 10) || 50;
        const r = await request('GET', `/api/trace?limit=${limit}`);
        const events = r.body.events || [];
        if (!events.length) console.log('暂无轨迹记录');
        else console.log(JSON.stringify(events, null, 2));
        break;
      }
      default:
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
    }
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      console.error(`无法连接桥接服务(${HOST}:${PORT})。请先启动: node bridge/server.js`);
    } else {
      console.error('错误: ' + e.message);
    }
    process.exit(1);
  }
}

main();
