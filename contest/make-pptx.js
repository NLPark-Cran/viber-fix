/**
 * 生成参赛方案 PPT:contest/proposal.pptx
 * 运行:node contest/make-pptx.js
 *
 * 文案原则(降 AI 味):口语化短句、具体动词、不堆四字词;
 * 不用破折号做解释;不写"(≥ 赛题要求 3 个)"这类元注释;
 * 字号:标题 36+,正文 20,小字 16,不用更小的字。
 */
'use strict';
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'ViberFix 哪里不爽点哪里 · 猹码古道';

const C = {
  bg: '0E1118', card: '161B26',
  accent: '6C8CFF', green: '3ECF8E', yellow: 'F5C451',
  text: 'E8EAF0', muted: '9AA1B5', dim: '6B7288', line: '2A3040',
};
const FONT = 'Microsoft YaHei';
const MONO = 'Courier New';

function base(slide, kicker, title) {
  slide.background = { color: C.bg };
  slide.addText('◆ ' + kicker, { x: 0.6, y: 0.45, w: 12, h: 0.4, fontSize: 16, color: C.accent, fontFace: FONT, margin: 0 });
  slide.addText(title, { x: 0.6, y: 0.9, w: 12.2, h: 0.9, fontSize: 36, bold: true, color: C.text, fontFace: FONT, margin: 0 });
}

function pageno(slide, n) {
  slide.addText(String(n), { x: 12.4, y: 6.95, w: 0.6, h: 0.4, fontSize: 16, color: C.dim, fontFace: MONO, align: 'right', margin: 0 });
}

function chip(slide, x, y, n) {
  slide.addShape(pres.ShapeType ? pres.ShapeType.ellipse : 'ellipse', { x, y, w: 0.55, h: 0.55, fill: { color: C.accent } });
  slide.addText(String(n), { x, y, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: 'FFFFFF', fontFace: MONO, align: 'center', valign: 'middle', margin: 0 });
}

function card(slide, x, y, w, h) {
  slide.addShape(pres.ShapeType ? pres.ShapeType.roundRect : 'roundRect', { x, y, w, h, fill: { color: C.card }, line: { color: C.line, width: 1 }, rectRadius: 0.08 });
}

/* ============ 1 封面 ============ */
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  s.addText('◆', { x: 10.4, y: 0.8, w: 2.3, h: 2.3, fontSize: 120, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  s.addText('哪里不爽点哪里!', { x: 0.7, y: 2.1, w: 11, h: 1.4, fontSize: 54, bold: true, color: C.text, fontFace: FONT, margin: 0 });
  s.addText('将用户视觉反馈直观纳入研发闭环的多 Agent 协同系统:ViberFix', { x: 0.7, y: 3.6, w: 11.5, h: 0.7, fontSize: 22, color: C.accent, fontFace: FONT, margin: 0 });
  s.addText('猹码古道 · github.com/NLPark-Cran/viber-fix', { x: 0.7, y: 5.9, w: 9, h: 0.5, fontSize: 18, color: C.muted, fontFace: FONT, margin: 0 });
}

/* ============ 2 问题 ============ */
{
  const s = pres.addSlide();
  base(s, '问题与场景', 'Vibe 出了页面,然后呢?');
  const items = [
    ['说不出', '看着不爽,却说不出哪里不对'],
    ['写不准', '初窥门径的 Viber,不一定能写出便于执行的精准修改指令'],
    ['转不动', '反馈散落在截图和聊天里,全靠人肉中转'],
  ];
  items.forEach((it, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.2, 3.85, 3.2);
    s.addText(it[0], { x: x + 0.35, y: 2.5, w: 3.2, h: 0.8, fontSize: 32, bold: true, color: C.yellow, fontFace: FONT, margin: 0 });
    s.addText(it[1], { x: x + 0.35, y: 3.5, w: 3.2, h: 1.7, fontSize: 20, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('从独立开发到客户验收,这个断层处处都在。', { x: 0.6, y: 5.8, w: 12, h: 0.5, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 2);
}

/* ============ 3 核心 idea ============ */
{
  const s = pres.addSlide();
  base(s, '核心解决方案', '哪里不爽点哪里');
  const steps = [
    ['框选', '点选或拖框,自动截图、识别语义'],
    ['表达', '写意见或点术语,外行也说清楚'],
    ['队列', '结构化入库,多方同读同写'],
    ['整改', '定位修改,对比满意再落地'],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.15;
    chip(s, x, 2.3, i + 1);
    s.addText(st[0], { x: x + 0.7, y: 2.3, w: 2.3, h: 0.55, fontSize: 24, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    card(s, x, 3.15, 2.95, 2.6);
    s.addText(st[1], { x: x + 0.25, y: 3.4, w: 2.5, h: 2.1, fontSize: 20, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
    if (i < 3) s.addText('▶', { x: x + 2.93, y: 2.25, w: 0.3, h: 0.65, fontSize: 16, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  });
  s.addText('术语自带英文关键词,是跨 Agent 的设计意图锚点。', { x: 0.6, y: 6.2, w: 12, h: 0.5, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 3);
}

/* ============ 4 八步闭环 ============ */
{
  const s = pres.addSlide();
  base(s, '多 Agent 闭环', '八步走完一个闭环');
  const rows = [
    ['任务输入', '框选即提单,截图选择器一并入库'],
    ['任务拆解', '按类型和语义角色分派'],
    ['上下文传递', '队列加共享截图目录'],
    ['工具调用', 'Skill、MCP、DSH 同一契约'],
    ['结果验证', '跑构建、做对比、请用户确认'],
    ['证据沉淀', '轨迹、截图、总结全部留痕'],
    ['审批回滚', '对比即审批,独立提交可 revert'],
    ['经验沉淀', '成功案例反哺术语库'],
  ];
  rows.forEach((r, i) => {
    const col = i < 4 ? 0 : 1;
    const y = 2.1 + (i % 4) * 1.24;
    const x = 0.6 + col * 6.2;
    chip(s, x, y, i + 1);
    s.addText(r[0], { x: x + 0.75, y: y - 0.02, w: 2.4, h: 0.55, fontSize: 20, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(r[1], { x: x + 0.75, y: y + 0.55, w: 5.2, h: 0.5, fontSize: 16, color: C.muted, fontFace: FONT, margin: 0 });
  });
  pageno(s, 4);
}

/* ============ 5 五个 Agent ============ */
{
  const s = pres.addSlide();
  base(s, 'Agent Identity 清单', '五个职能 Agent');
  const agents = [
    ['A1', '哨兵 Scout', '框选采集、截图、语义猜测'],
    ['A2', '调度 Manager', '拆解分派、追踪状态、升级人工'],
    ['A3', '巧匠 Fixer', '根因定位、自动编码、独立提交'],
    ['A4', '验收 Verifier', '跑构建、做对比、请人确认'],
    ['A5', '沉淀 Archivist', '归档轨迹、演进术语库'],
  ];
  agents.forEach((a, i) => {
    const x = i < 3 ? 0.6 + i * 4.15 : 2.68 + (i - 3) * 4.15;
    const y = i < 3 ? 2.15 : 4.6;
    card(s, x, y, 3.85, 2.1);
    s.addText(a[0], { x: x + 0.3, y: y + 0.22, w: 0.8, h: 0.45, fontSize: 16, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
    s.addText(a[1], { x: x + 0.3, y: y + 0.65, w: 3.3, h: 0.6, fontSize: 22, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(a[2], { x: x + 0.3, y: y + 1.3, w: 3.3, h: 0.6, fontSize: 16, color: C.muted, fontFace: FONT, margin: 0 });
  });
  s.addText('人始终在场:协同房间全程可见,随时可以插手。', { x: 0.6, y: 6.95, w: 12, h: 0.45, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 5);
}

/* ============ 6 AgentTeams 映射 ============ */
{
  const s = pres.addSlide();
  base(s, '协同设计基点', '落在 AgentTeams 上');
  const rows = [
    ['角色编排', 'Manager-Workers', 'skill 编排,cran-code 与 dsh 做 Worker'],
    ['上下文传递', 'Matrix 房间 + MinIO', '桥接队列 + 共享截图目录'],
    ['协同执行', '多运行时同房间', 'QwenWork、cran-code、dsh 同队列'],
    ['状态追踪', '生命周期与心跳', '状态机 + trace.jsonl'],
    ['人工干预', '默认可见可干预', '预览对比面板就是裁决点'],
    ['凭证隔离', '网关持真凭证', '仅本地回环,Agent 不持密钥'],
  ];
  s.addText('AgentTeams 能力', { x: 0.6, y: 2.0, w: 3.6, h: 0.45, fontSize: 16, bold: true, color: C.accent, fontFace: FONT, margin: 0 });
  s.addText('ViberFix 的落地', { x: 7.0, y: 2.0, w: 5.8, h: 0.45, fontSize: 16, bold: true, color: C.green, fontFace: FONT, margin: 0 });
  rows.forEach((r, i) => {
    const y = 2.55 + i * 0.78;
    card(s, 0.6, y, 12.15, 0.68);
    s.addText(r[0], { x: 0.85, y, w: 2.0, h: 0.68, fontSize: 18, bold: true, color: C.text, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(r[1], { x: 2.9, y, w: 3.9, h: 0.68, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(r[2], { x: 7.0, y, w: 5.6, h: 0.68, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  pageno(s, 6);
}

/* ============ 7 Skill 体系 ============ */
{
  const s = pres.addSlide();
  base(s, 'Skill 工程体系', '三个核心 Skill');
  const skills = [
    ['viber-fix', '编排与修复', '消费队列、定位源码、定向改码,失败必附原因'],
    ['style-advisor', 'AI 样式推荐', '看截图给两三个方向,一键应用,只读不改码'],
    ['preview', '生图预览', '意见画成预览图叠加对比,失败可退回纯文字'],
  ];
  skills.forEach((k, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.15, 3.85, 3.1);
    s.addText(k[0], { x: x + 0.3, y: 2.45, w: 3.3, h: 0.5, fontSize: 20, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
    s.addText(k[1], { x: x + 0.3, y: 3.0, w: 3.3, h: 0.55, fontSize: 20, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(k[2], { x: x + 0.3, y: 3.65, w: 3.3, h: 1.4, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('九字段清单在设计文档里;任何视觉反馈改码场景都能复用。', { x: 0.6, y: 5.7, w: 12, h: 0.5, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 7);
}

/* ============ 8 三种接入 ============ */
{
  const s = pres.addSlide();
  base(s, '工具集成', '一套契约,三种接入');
  const cols = [
    ['QwenWork skill', '口令或定时触发,原生消费队列'],
    ['MCP server', 'cran-code 零改造接入,AgentTeams 声明式挂载'],
    ['DSH 插件', 'bundle 一行插入,Code Mode 自动可用'],
  ];
  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.15, 3.85, 2.8);
    s.addText(c[0], { x: x + 0.3, y: 2.45, w: 3.3, h: 0.55, fontSize: 20, bold: true, color: C.green, fontFace: FONT, margin: 0 });
    s.addText(c[1], { x: x + 0.3, y: 3.15, w: 3.3, h: 1.5, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('换运行时不换契约:能力层和连接层是解耦的。', { x: 0.6, y: 5.4, w: 12, h: 0.5, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 8);
}

/* ============ 9 可观测 ============ */
{
  const s = pres.addSlide();
  base(s, '可观测', '每一步都留痕');
  card(s, 0.6, 2.1, 7.4, 3.9);
  s.addText('data/trace.jsonl', { x: 0.9, y: 2.35, w: 6, h: 0.5, fontSize: 18, bold: true, color: C.accent, fontFace: MONO, margin: 0 });
  s.addText([
    { text: 'request.created   role=sidebar', options: { breakLine: true } },
    { text: 'status.changed    picked_up', options: { breakLine: true } },
    { text: 'response.sent     suggestions=2', options: { breakLine: true } },
    { text: 'preview.sent      preview.png', options: { breakLine: true } },
    { text: 'status.changed    done 侧边栏→新拟态', options: {} },
  ], { x: 0.9, y: 3.0, w: 6.8, h: 2.8, fontSize: 16, color: C.green, fontFace: MONO, valign: 'top', margin: 0 });
  const rights = [
    ['Log + Trace', '覆盖请求的完整生命周期'],
    ['三个入口', 'API、CLI、MCP 都能读'],
    ['证据存档', '截图、预览、总结随请求留存'],
  ];
  rights.forEach((r, i) => {
    const y = 2.1 + i * 1.32;
    card(s, 8.3, y, 4.45, 1.12);
    s.addText(r[0], { x: 8.55, y: y + 0.14, w: 4.0, h: 0.5, fontSize: 20, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(r[1], { x: 8.55, y: y + 0.62, w: 4.0, h: 0.4, fontSize: 16, color: C.muted, fontFace: FONT, margin: 0 });
  });
  s.addText('事件语义规整,可平滑映射 OpenTelemetry GenAI。', { x: 0.6, y: 6.4, w: 12, h: 0.45, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 9);
}

/* ============ 10 审批与安全 ============ */
{
  const s = pres.addSlide();
  base(s, '安全与审计', '敢改,也敢退');
  const items = [
    ['人工审批', '预览叠在页面上对比,点了「就按这个改」才动代码'],
    ['随时回滚', '每次修复独立提交,失败就 revert'],
    ['权限边界', '只监听本地回环,只在项目目录内改码'],
    ['降级幂等', 'MCP 不在有 CLI 兜底,状态迁移不怕重复调用'],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 2.15 + row * 2.3;
    card(s, x, y, 5.9, 2.0);
    s.addText(it[0], { x: x + 0.35, y: y + 0.28, w: 5.2, h: 0.55, fontSize: 22, bold: true, color: C.yellow, fontFace: FONT, margin: 0 });
    s.addText(it[1], { x: x + 0.35, y: y + 0.95, w: 5.2, h: 0.9, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  pageno(s, 10);
}

/* ============ 11 上下文能力 ============ */
{
  const s = pres.addSlide();
  base(s, '上下文与记忆', '三项基本能力');
  const caps = [
    ['共享状态', '队列加截图目录,就是本地版 MinIO'],
    ['轨迹可观测', '全链路事件,可离线评估成功率和耗时'],
    ['轻量 RAG', '术语库与案例库,检索增强整改指令'],
  ];
  caps.forEach((c, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 2.2, 3.85, 2.9);
    chip(s, x + 0.3, 2.5, i + 1);
    s.addText(c[0], { x: x + 0.3, y: 3.3, w: 3.3, h: 0.55, fontSize: 22, bold: true, color: C.text, fontFace: FONT, margin: 0 });
    s.addText(c[1], { x: x + 0.3, y: 3.95, w: 3.3, h: 1.0, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'top', margin: 0 });
  });
  s.addText('MCP 接数据,Skill 管检索,Agent 判断够不够用。', { x: 0.6, y: 5.6, w: 12, h: 0.5, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 11);
}

/* ============ 12 进展 ============ */
{
  const s = pres.addSlide();
  base(s, '当前进展', '已经跑通,不是概念');
  const done = [
    '扩展 MV3:框选、术语、AI 推荐、预览对比',
    '零依赖桥接:队列、截图、控制台、trace',
    'QwenWork skill 已安装可用',
    'MCP server 与 DSH 插件包齐备',
    '单测真抓真修,修过两个真实 bug',
    '仓库公开,文档齐全',
  ];
  done.forEach((d, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 2.15 + row * 1.35;
    card(s, x, y, 5.9, 1.1);
    s.addText('✓', { x: x + 0.3, y, w: 0.6, h: 1.1, fontSize: 20, bold: true, color: C.green, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(d, { x: x + 0.95, y, w: 4.7, h: 1.1, fontSize: 18, color: C.text, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  s.addText('复赛补 AgentTeams 房间化部署和评测数据。', { x: 0.6, y: 6.4, w: 12, h: 0.45, fontSize: 16, color: C.dim, fontFace: FONT, margin: 0 });
  pageno(s, 12);
}

/* ============ 13 开源计划 ============ */
{
  const s = pres.addSlide();
  base(s, '开放贡献', '开源与演进');
  const left = [
    ['现在', '仓库公开,桥接零依赖,文档齐全'],
    ['协议', '规划 MIT,无第三方许可证风险'],
    ['生态位', 'dsh 插件登记,cran-code 技能,术语库可单独分发'],
  ];
  left.forEach((l, i) => {
    const y = 2.15 + i * 1.4;
    card(s, 0.6, y, 6.2, 1.15);
    s.addText(l[0], { x: 0.9, y, w: 1.3, h: 1.15, fontSize: 20, bold: true, color: C.accent, fontFace: FONT, valign: 'middle', margin: 0 });
    s.addText(l[1], { x: 2.2, y, w: 4.4, h: 1.15, fontSize: 16, color: C.muted, fontFace: FONT, valign: 'middle', margin: 0 });
  });
  const right = [
    'AgentTeams 房间化编排与评测指标',
    'Firefox 版本与请求去重',
    '联动热更新,改完自动刷新验证',
    '术语库社区贡献流程',
  ];
  s.addText('接下来', { x: 7.2, y: 1.85, w: 5, h: 0.5, fontSize: 20, bold: true, color: C.green, fontFace: FONT, margin: 0 });
  right.forEach((r, i) => {
    s.addText('▸ ' + r, { x: 7.2, y: 2.5 + i * 0.95, w: 5.6, h: 0.8, fontSize: 16, color: C.muted, fontFace: FONT, margin: 0 });
  });
  pageno(s, 13);
}

/* ============ 14 结尾 ============ */
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  s.addText('◆', { x: 5.9, y: 1.1, w: 1.5, h: 1.5, fontSize: 72, color: C.accent, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
  s.addText('哪里不爽点哪里!', { x: 1.5, y: 2.8, w: 10.3, h: 1.2, fontSize: 44, bold: true, color: C.text, fontFace: FONT, align: 'center', margin: 0 });
  s.addText('让每一句「看着不对」,都变成一次可验证的修复。', { x: 1.5, y: 4.1, w: 10.3, h: 0.7, fontSize: 20, color: C.muted, fontFace: FONT, align: 'center', margin: 0 });
  s.addText('猹码古道 · github.com/NLPark-Cran/viber-fix', { x: 1.5, y: 5.4, w: 10.3, h: 0.6, fontSize: 18, color: C.accent, fontFace: FONT, align: 'center', margin: 0 });
}

pres.writeFile({ fileName: require('path').join(__dirname, 'proposal.pptx') }).then((f) => {
  console.log('written:', f);
});
