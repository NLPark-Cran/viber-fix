/**
 * 生成参赛方案 PPT:contest/proposal.pptx
 * 运行:node contest/make-pptx.js
 */
'use strict';
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'ViberFix 哪里不爽点哪里 · 猹码古道';

/* 品牌色(与产品 UI 同源) */
const C = {
  bg: '0E1118', card: '161B26', card2: '1C2230',
  accent: '6C8CFF', green: '3ECF8E', yellow: 'F5C451', red: 'FF6B6B',
  text: 'E8EAF0', muted: '8B91A5', dim: '5D6377', line: '2A3040',
};
const FONT = 'Microsoft YaHei';
const MONO = 'Courier New';

function base(slide, kicker, title) {
  slide.background = { color: C.bg };
  slide.addText('◆ ' + kicker, { x: 0.6, y: 0.42, w: 12, h: 0.35, fontSize: 12, color: C.accent, fontFace: FONT, margin: 0 });
  slide.addText(title, { x: 0.6, y: 0.78, w: 12.2, h: 0.8, fontSize: 30, bold: true, color: C.text, fontFace: FONT, margin: 0 });
}

function pageno(slide, n) {
  slide.addText(String(n), { x: 12.5, y: 7.0, w: 0.5, h: 0.35, fontSize: 10, color: C.dim, fontFace: MONO, align: 'right', margin: 0 });
}

function chip(slide, x, y, n) {
  slide.addShape(pres.ShapeType ? pres.ShapeType.ellipse : 'ellipse', { x, y, w: 0.5, h: 0.5, fill: { color: C.accent } });
  slide.addText(String(n), { x, y, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: 'FFFFFF', fontFace: MONO, align: 'center', valign: 'middle', margin: 0 });
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(pres.ShapeType ? pres.ShapeType.roundRect : 'roundRect', { x, y, w, h, fill: { color: fill || C.card }, line: { color: C.line, width: 1 }, rectRadius: 0.08 });
}

/* ============ 1 封面 ============ */
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  s.addText('◆', { x: 10.6, y: 0.7, w: 2.2, h: 2.2, fontSize: 120, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  s.addText('GOAI 世界人工智能开源大赛 · Agent Infra 赛道 · 方向三:软件研发全流程协同', { x: 0.7, y: 1.5, w: 10, h: 0.4, fontSize: 14, color: C.muted, fontFace: FONT, margin: 0 });
  s.addText('哪里不爽点哪里!', { x: 0.7, y: 2.2, w: 11, h: 1.3, fontSize: 54, bold: true, color: C.text, fontFace: FONT, margin: 0 });
  s.addText('ViberFix —— 把视觉反馈变成研发闭环的多 Agent 协同系统', { x: 0.7, y: 3.5, w: 11, h: 0.6, fontSize: 20, color: C.accent, fontFace: FONT, margin: 0 });
  s.addText([
    { text: '队伍:猹码古道', options: { breakLine: true } },
    { text: 'github.com/NLPark-Cran/viber-fix', options: {} },
  ], { x: 0.7, y: 5.6, w: 8, h: 0.9, fontSize: 14, color: C.muted, fontFace: FONT, margin: 0 });
}

/* ============ 2 问题 ============ */
{
  const s = pres.addSlide();
  base(s, '问题与场景', 'Vibe 出了页面,然后呢?');
  const items = [
    ['说不出', '看着不爽,却说不出哪里不对——视觉反馈无法结构化'],
    ['写不准', '非前端用户写不出 Agent 能执行的精准修改指令'],
    ['转不动', '反馈散落截图与聊天,定位/修复/验证全靠人肉中转'],
  ];
  items.forEach((it, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.1, 3.85, 3.4);
    s.addText(it[0], { x: x + 0.35, y: 2.5, w: 3.2, h: 0.9, fontSize: 34, bold: true, color: C.yellow, fontFace: FONT, margin: 0 });
    s.addText(it[1], { x: x + 0.35, y: 3.5, w: 3.2, h: 1.7, fontSize: 15, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('任何「AI 生成前端 + 人类验收」的工作流都需要同样的反馈→修复闭环:独立开发、设计评审、产品走查、客户验收。', { x: 0.6, y: 5.9, w: 12, h: 0.5, fontSize: 14, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 2);
}

/* ============ 3 核心 idea ============ */
{
  const s = pres.addSlide();
  base(s, '核心解决方案', '哪里不爽点哪里:四步把视觉反馈变成任务输入');
  const steps = [
    ['框选', '扩展像检查元素一样点选/拖框;自动截图、生成选择器、猜测语义(侧边栏/卡片列表…)'],
    ['表达', '写两句意见,或点术语:新拟态、瀑布流、玻璃拟态——不懂设计也能精准指挥'],
    ['队列', '本地桥接服务=共享状态;截图+选择器+术语结构化入库,多运行时同读同写'],
    ['整改', 'Agent 定位源码定向修改;AI 推荐样式、生图预览叠加对比,满意再说「就按这个改」'],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.15;
    chip(s, x, 2.15, i + 1);
    s.addText(st[0], { x: x + 0.65, y: 2.15, w: 2.4, h: 0.5, fontSize: 20, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    card(s, x, 2.95, 2.95, 3.0);
    s.addText(st[1], { x: x + 0.25, y: 3.2, w: 2.5, h: 2.5, fontSize: 13, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
    if (i < 3) s.addText('▶', { x: x + 2.95, y: 2.1, w: 0.3, h: 0.6, fontSize: 14, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  });
  s.addText('术语带英文 prompt 关键词(如 neumorphism)随请求下发,作为跨 Agent 的设计意图锚点。', { x: 0.6, y: 6.3, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 3);
}

/* ============ 4 八步闭环 ============ */
{
  const s = pres.addSlide();
  base(s, '多 Agent 闭环说明', '研发全流程的八步闭环');
  const rows = [
    ['任务输入', '扩展框选 → 截图+selector+roleGuess+意见+术语入库'],
    ['任务拆解', 'Manager 按 type(fix/推荐/预览)与语义角色分派'],
    ['上下文传递', '队列 JSON + 共享截图目录;术语英文 prompt 作语义锚点'],
    ['工具调用', 'Skill + MCP + DSH 插件,同一契约三形态'],
    ['结果验证', 'build/lint + 生图预览叠加对比 + 用户确认'],
    ['证据沉淀', 'trace.jsonl 状态流转 + 截图/预览存档 + done 总结'],
    ['审批与回滚', '预览对比=人工审批点;改码独立提交,git revert 回滚'],
    ['经验沉淀', '高频术语组合与成功案例写回术语库,反哺推荐'],
  ];
  rows.forEach((r, i) => {
    const col = i < 4 ? 0 : 1;
    const y = 1.95 + (i % 4) * 1.28;
    const x = 0.6 + col * 6.2;
    chip(s, x, y, i + 1);
    s.addText(r[0], { x: x + 0.7, y: y - 0.02, w: 2.2, h: 0.5, fontSize: 16, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(r[1], { x: x + 0.7, y: y + 0.48, w: 5.2, h: 0.6, fontSize: 12.5, color: C.muted, fontFace: FONT, margin: 0 });
  });
  pageno(s, 4);
}

/* ============ 5 五个 Agent ============ */
{
  const s = pres.addSlide();
  base(s, 'Agent Identity 清单', '五个职能 Agent(≥ 赛题要求 3 个)');
  const agents = [
    ['哨兵 Scout', '反馈聚合:框选采集、截图、语义猜测、去重结构化', 'A1'],
    ['调度 Manager', '任务拆解分派、状态追踪、异常升级人工', 'A2'],
    ['巧匠 Fixer', '根因定位、影响面分析、自动编码;独立提交可回滚', 'A3'],
    ['验收 Verifier', 'build/lint、预览对比、人工确认、发布确认', 'A4'],
    ['沉淀 Archivist', '轨迹归档、复盘、术语库/案例库演进', 'A5'],
  ];
  agents.forEach((a, i) => {
    const x = i < 3 ? 0.6 + i * 4.15 : 2.68 + (i - 3) * 4.15;
    const y = i < 3 ? 2.0 : 4.55;
    card(s, x, y, 3.85, 2.2);
    s.addText(a[2], { x: x + 0.3, y: y + 0.25, w: 0.7, h: 0.45, fontSize: 13, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
    s.addText(a[0], { x: x + 0.3, y: y + 0.7, w: 3.3, h: 0.5, fontSize: 18, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(a[1], { x: x + 0.3, y: y + 1.25, w: 3.3, h: 0.85, fontSize: 12.5, color: C.muted, fontFace: FONT, margin: 0 });
  });
  s.addText('人类始终是协同房间成员(Human-in-the-Loop);运行时映射 AgentTeams:QwenPaw / Hermes(cran-code)/ OpenClaw。', { x: 0.6, y: 6.95, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 5);
}

/* ============ 6 AgentTeams 映射 ============ */
{
  const s = pres.addSlide();
  base(s, '协同设计基点', '映射到 AgentTeams(原名 Hiclaw)框架能力');
  const rows = [
    ['角色编排', 'Manager-Workers 声明式资源', 'skill 编排 + cran-code/dsh 扮演 Worker'],
    ['上下文传递', 'Matrix 房间 + MinIO 共享文件', '桥接队列 JSON + uploads 截图目录'],
    ['协同执行', '多运行时 Worker 同房间协作', 'QwenWork / cran-code(MCP)/ dsh(插件)三运行时同队列'],
    ['状态追踪', 'Worker 生命周期 + 心跳', 'pending→picked_up→done/failed + trace.jsonl'],
    ['人工干预', 'Element Web 默认可见可干预', '扩展面板裁决点:预览叠加对比、「就按这个改」'],
    ['凭证隔离', 'Higress 持真凭证', '桥接仅本地回环;Agent 不持有第三方密钥'],
  ];
  s.addText('AgentTeams 能力', { x: 0.6, y: 1.85, w: 3.6, h: 0.4, fontSize: 13, bold: true, color: C.accent, fontFace: FONT, margin: 0 });
  s.addText('ViberFix 本地等价实现(当前代码)', { x: 7.0, y: 1.85, w: 5.8, h: 0.4, fontSize: 13, bold: true, color: C.green, fontFace: FONT, margin: 0 });
  rows.forEach((r, i) => {
    const y = 2.35 + i * 0.82;
    card(s, 0.6, y, 12.15, 0.72);
    s.addText(r[0], { x: 0.85, y, w: 2.0, h: 0.72, fontSize: 14, bold: true, color: C.text, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(r[1], { x: 2.9, y, w: 3.9, h: 0.72, fontSize: 12, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(r[2], { x: 7.0, y, w: 5.6, h: 0.72, fontSize: 12, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  pageno(s, 6);
}

/* ============ 7 Skill 体系 ============ */
{
  const s = pres.addSlide();
  base(s, 'Skill 工程体系(必选项)', '三个核心 Skill,九字段齐全(详见设计文档)');
  const skills = [
    ['viber-fix', '编排与修复', '消费队列 → 定位源码 → 定向改码 → 状态回写', 'bridge 未启动自启重试;定位失败 fail 附原因,不静默吞错'],
    ['style-advisor', 'AI 样式推荐', '截图+计算样式 → 2-3 个设计方向,用户一键应用', '只读不改码;超时提示,不产出空推荐'],
    ['preview', '生图预览', '意见画成预览图 → 叠加页面对比 → 裁决依据', '生图失败可退化为纯文字意见'],
  ];
  skills.forEach((k, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.0, 3.85, 3.6);
    s.addText(k[0], { x: x + 0.3, y: 2.3, w: 3.3, h: 0.5, fontSize: 18, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
    s.addText(k[1], { x: x + 0.3, y: 2.85, w: 3.3, h: 0.4, fontSize: 14, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText('输入输出:' + k[2], { x: x + 0.3, y: 3.35, w: 3.3, h: 1.0, fontSize: 12, color: C.muted, fontFace: FONT, margin: 0 });
    s.addText('失败处理:' + k[3], { x: x + 0.3, y: 4.4, w: 3.3, h: 1.0, fontSize: 12, color: C.muted, fontFace: FONT, margin: 0 });
  });
  s.addText('复用价值:任何「视觉反馈→代码修改」场景(设计走查、客户验收)可复用;版本随仓库演进,开源分发。', { x: 0.6, y: 6.0, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 7);
}

/* ============ 8 三种接入 ============ */
{
  const s = pres.addSlide();
  base(s, 'MCP 与工具集成', '一套工具契约,三种接入形态,状态完全一致');
  const cols = [
    ['QwenWork skill', '千问办公 Agent 原生消费队列;口令「处理整改请求」或定时触发', 'skill/SKILL.md'],
    ['MCP server', 'cran-code(猹询码)零改造接入;AgentTeams 可以 CRD 声明式挂载;任意 MCP 客户端可用', 'bridge/mcp-server.js'],
    ['DSH 插件', 'DeepSeek Harness「一切皆插件」:bundle patch 插入工具行,Code Mode 自动可用', 'integrations/dsh/'],
  ];
  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.0, 3.85, 3.3);
    s.addText(c[0], { x: x + 0.3, y: 2.3, w: 3.3, h: 0.5, fontSize: 18, bold: true, color: C.green, fontFace: FONT, margin: 0 });
    s.addText(c[1], { x: x + 0.3, y: 2.95, w: 3.3, h: 1.5, fontSize: 12.5, color: C.muted, fontFace: FONT, margin: 0 });
    s.addText(c[2], { x: x + 0.3, y: 4.6, w: 3.3, h: 0.4, fontSize: 11, color: C.dim, fontFace: MONO, margin: 0 });
  });
  s.addText('Skill 承担任务能力抽象层,MCP 承担工具连接层——解耦后,换运行时不换契约;未用云产品处均给出等价契约与迁移说明。', { x: 0.6, y: 5.7, w: 12, h: 0.5, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 8);
}

/* ============ 9 可观测 ============ */
{
  const s = pres.addSlide();
  base(s, '可观测(推荐项)', '执行轨迹:从 Demo 走向 Production 的证据链');
  card(s, 0.6, 1.95, 7.4, 4.3);
  s.addText('data/trace.jsonl', { x: 0.9, y: 2.2, w: 6, h: 0.4, fontSize: 14, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
  s.addText([
    { text: '{"ts":"…","event":"request.created","id":"…-8wk48","type":"fix","roleGuess":"sidebar"}', options: { breakLine: true } },
    { text: '{"ts":"…","event":"status.changed","id":"…","status":"picked_up"}', options: { breakLine: true } },
    { text: '{"ts":"…","event":"response.sent","id":"…","suggestions":2}', options: { breakLine: true } },
    { text: '{"ts":"…","event":"preview.sent","id":"…","file":"…-preview.png"}', options: { breakLine: true } },
    { text: '{"ts":"…","event":"status.changed","id":"…","status":"done","summary":"侧边栏→新拟态"}', options: {} },
  ], { x: 0.9, y: 2.75, w: 6.8, h: 3.2, fontSize: 10.5, color: C.green, fontFace: MONO, valign: 'top', margin: 0 });
  const rights = [
    ['Log + Trace 两类数据', '覆盖请求生命周期与工具调用结果'],
    ['三入口可读', '/api/trace · CLI trace · MCP viberfix_trace'],
    ['证据存档', '截图、预览图、done 总结随请求持久化'],
  ];
  rights.forEach((r, i) => {
    const y = 2.0 + i * 1.45;
    card(s, 8.3, y, 4.45, 1.25);
    s.addText(r[0], { x: 8.55, y: y + 0.18, w: 4.0, h: 0.45, fontSize: 15, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(r[1], { x: 8.55, y: y + 0.65, w: 4.0, h: 0.5, fontSize: 12, color: C.muted, fontFace: FONT, margin: 0 });
  });
  s.addText('语义规范:事件名+ISO 时间戳+请求 id,可平滑映射 OpenTelemetry GenAI span。', { x: 0.6, y: 6.6, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 9);
}

/* ============ 10 审批与安全 ============ */
{
  const s = pres.addSlide();
  base(s, '工程落地与安全可审计', '审批、回滚与权限边界');
  const items = [
    ['人工审批点', '生图预览叠加在页面上对比,用户点「就按这个改」才触发改码;Matrix 房间内全程可见可干预'],
    ['可回滚', '每次修复独立 git 提交;失败即 git revert;failed 状态必附原因'],
    ['权限边界', '桥接仅监听 127.0.0.1;Agent 只在 projectPath 内改码;不持有任何第三方密钥'],
    ['降级与幂等', 'MCP 不可用时有 CLI/HTTP 等价能力;pickup/done 为状态机迁移,重复调用无副作用'],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 2.0 + row * 2.35;
    card(s, x, y, 5.9, 2.05);
    s.addText(it[0], { x: x + 0.35, y: y + 0.3, w: 5.2, h: 0.5, fontSize: 17, bold: true, color: C.yellow, fontFace: FONT, margin: 0 });
    s.addText(it[1], { x: x + 0.35, y: y + 0.9, w: 5.2, h: 1.0, fontSize: 13, color: C.muted, fontFace: FONT, margin: 0 });
  });
  pageno(s, 10);
}

/* ============ 11 上下文能力 ============ */
{
  const s = pres.addSlide();
  base(s, 'RAG 与上下文增强', '四项能力实现三项(要求 ≥ 2)');
  const caps = [
    ['共享状态管理', '桥接队列 + uploads 目录 = 本地版 MinIO;三运行时读写同一状态,Worker 无状态化'],
    ['轨迹可观测', 'trace.jsonl 全链路事件;支持离线评估整改成功率与耗时'],
    ['知识库 RAG(轻量)', '30+ 设计术语(带英文 prompt)+ rolePresets 案例库,检索增强注入整改指令'],
  ];
  caps.forEach((c, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.1, 3.85, 3.2);
    chip(s, x + 0.3, 2.4, i + 1);
    s.addText(c[0], { x: x + 0.3, y: 3.1, w: 3.3, h: 0.5, fontSize: 17, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(c[1], { x: x + 0.3, y: 3.7, w: 3.3, h: 1.4, fontSize: 12.5, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('MCP 接入数据源,Skill 封装检索与写入,Agent 判断检索结果是否足以支撑决策——三层职责清晰。', { x: 0.6, y: 5.8, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 11);
}

/* ============ 12 进展 ============ */
{
  const s = pres.addSlide();
  base(s, '可行性与当前进展', '全链路已跑通,不是 PPT 概念');
  const done = [
    'Chrome 扩展 MV3:框选/术语库/AI 推荐/生图预览叠加对比',
    '零依赖桥接服务:队列 + 截图存储 + 控制台 + trace',
    'QwenWork skill viber-fix 已安装可用',
    'MCP server(stdio)+ DSH 插件包 + cran-code 接入配置',
    '启发式单元测试真抓真修:main-nav 识别、高卡片区误判导航',
    '仓库公开:github.com/NLPark-Cran/viber-fix',
  ];
  done.forEach((d, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 2.0 + row * 1.35;
    card(s, x, y, 5.9, 1.1);
    s.addText('✓', { x: x + 0.3, y, w: 0.5, h: 1.1, fontSize: 16, bold: true, color: C.green, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(d, { x: x + 0.85, y, w: 4.8, h: 1.1, fontSize: 13, color: C.text, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  s.addText('Demo:本地 demo 靶子页 + 控制台 127.0.0.1:8787;复赛补 AgentTeams 房间化部署与评测数据。', { x: 0.6, y: 6.3, w: 12, h: 0.4, fontSize: 13, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 12);
}

/* ============ 13 开源计划 ============ */
{
  const s = pres.addSlide();
  base(s, '开放 / 开源贡献', '开源计划与演进路线');
  const left = [
    ['现在', '仓库公开可访问;桥接零依赖、单文件可跑;文档齐全(README/设计文档/集成指南)'],
    ['协议', '规划 MIT;第三方依赖(仅浏览器原生 API 与 Node 内置模块)零许可证风险'],
    ['生态位', 'dsh-plugin topic 登记;cran-code 生态技能;术语库 terms.json 独立可分发'],
  ];
  left.forEach((l, i) => {
    const y = 2.0 + i * 1.35;
    card(s, 0.6, y, 6.2, 1.1);
    s.addText(l[0], { x: 0.9, y, w: 1.2, h: 1.1, fontSize: 15, bold: true, color: C.accent, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(l[1], { x: 2.1, y, w: 4.5, h: 1.1, fontSize: 12.5, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  const right = [
    '复赛:AgentTeams 房间化编排 + 评测指标(整改成功率/往返次数/耗时)',
    'Firefox 版本与请求合并去重',
    '与 dev server 热更新联动,改完自动刷新验证',
    '术语库社区贡献流程(PR 词条 + 版本化)',
  ];
  s.addText('路线', { x: 7.2, y: 1.7, w: 5, h: 0.4, fontSize: 14, bold: true, color: C.green, fontFace: FONT, margin: 0 });
  right.forEach((r, i) => {
    s.addText('▸ ' + r, { x: 7.2, y: 2.2 + i * 0.95, w: 5.6, h: 0.8, fontSize: 13, color: C.muted, fontFace: FONT, margin: 0 });
  });
  pageno(s, 13);
}

/* ============ 14 结尾 ============ */
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  s.addText('◆', { x: 5.9, y: 1.2, w: 1.5, h: 1.5, fontSize: 72, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  s.addText('哪里不爽点哪里!', { x: 1.5, y: 2.9, w: 10.3, h: 1.1, fontSize: 44, bold: true, color: C.text, fontFace: FONT, align: 'center', margin: 0 });
  s.addText('让每一句「看着不对」,都变成一次可验证的修复。', { x: 1.5, y: 4.1, w: 10.3, h: 0.6, fontSize: 18, color: C.muted, fontFace: FONT, align: 'center', margin: 0 });
  s.addText('猹码古道 · github.com/NLPark-Cran/viber-fix', { x: 1.5, y: 5.4, w: 10.3, h: 0.5, fontSize: 15, color: C.accent, fontFace: FONT, align: 'center', margin: 0 });
}

pres.writeFile({ fileName: require('path').join(__dirname, 'proposal.pptx') }).then((f) => {
  console.log('written:', f);
});
