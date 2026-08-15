# ViberFix —— 哪里不爽点哪里!

> GitHub: https://github.com/NLPark-Cran/viber-fix

Vibe coding 出的页面,总有几处"说不清哪里不对"。ViberFix 让你像浏览器检查元素一样,
**框选不满意的元素或区域,写下整改意见(或点几个设计术语),一键发给 Agent 定向修改**。
不用懂"新拟态""瀑布流"这些词也能用——术语库替你说话;懂的人更可以精确指挥。

## 架构

```
┌──────────────────────┐   HTTP    ┌───────────────────────┐   文件队列   ┌───────────────────┐
│ Chrome 扩展 (MV3)    │ ────────▶ │ 桥接服务 (Node 零依赖) │ ─────────▶ │ QwenWork skill    │
│ 元素选择 / 区域框选   │           │ 127.0.0.1:8787        │            │ viber-fix         │
│ 截图+选择器+意见+术语 │ ◀──────── │ 请求队列 / 截图存储    │ ◀───────── │ 看截图→定位→改代码 │
│ AI 推荐 / 生图预览回流 │  轮询回传  │ + 控制台页面           │  回传结果    │ 回传推荐/预览图    │
└──────────────────────┘           └───────────────────────┘            └───────────────────┘
```

## 快速开始

### 1. 启动桥接服务

```bash
node bridge/server.js
# 控制台: http://127.0.0.1:8787/
```

### 2. 安装 Chrome 扩展

1. 打开 `chrome://extensions/`,开启右上角「开发者模式」
2. 点「加载已解压的扩展程序」,选择本仓库的 `extension/` 目录
3. 点击工具栏的 ◆ 图标,在弹窗里:
   - 填写**页面源码所在目录**(Agent 会在这里找文件改代码)
   - 确认桥接服务显示「在线」

### 3. 使用

1. 打开任意本地 dev server 页面(如 `http://localhost:5173`)
2. 点 ◆ 图标 → 「开始框选」
3. 悬停点击选中元素,或按 `R` 切换框区域模式拖拽画框(自动识别侧边栏/导航/卡片列表…)
4. 在面板里写意见、点术语、或用快捷指令;点「发送给 Agent 整改」
5. 对千问办公说:「处理整改请求」——skill 会自动消费队列、看截图、改代码
6. 刷新页面,看效果

### 附加玩法

- **✦ AI 推荐样式**:不想自己描述?让 Agent 看截图后给 2-3 个方向,点一个直接应用
- **✎ 生成效果预览**:Agent 用生图模型把整改意见画成预览图,可「在页面上叠加对比」,满意了点「就按这个改」
- 快捷键:`P` 选元素,`R` 框区域,`Esc` 关面板/退出

## 目录结构

```
bridge/
  server.js        桥接服务(零依赖 Node,请求队列 + 截图存储 + 控制台)
  cli.js           Agent 用 CLI(list/show/pickup/respond/preview/done/fail)
  dashboard.html   控制台页面(自动刷新队列)
  terms.json       设计术语库(权威副本)
extension/
  manifest.json    MV3 清单
  background.js    注入检查器 / 截图 / 转发桥接
  content/
    inspector.js   核心:选择、框选、语义猜测、整改面板、轮询回流
    terms.js       术语库内置副本
  popup/           设置与队列状态
  icons/           图标
skill/
  SKILL.md         QwenWork skill 源码(已安装为 viber-fix)
```

## 设计术语库(节选)

布局:瀑布流布局 / Bento 网格 / 杂志分栏 / 时间轴 / 吸顶悬浮
风格:新拟态 / 玻璃拟态 / 极简留白 / 粗野主义 / 暗黑模式 / 科技感
色彩:莫兰迪低饱和 / 渐变点缀 / 高对比撞色 / 单色系层次
排版:衬线大标题 / 字重层级 / 加大行距留白
动效:卡片悬浮抬升 / 骨架屏 / 渐入滚动 / 视差滚动 / 微交互

术语带英文 prompt 提示(如 `neumorphism: soft dual shadows…`),随请求发给 Agent 作为设计意图关键词。

## 生态协同与参赛

本项目以「**哪里不爽点哪里!**」参加 **世界人工智能开源大赛(GOAI)· Agent Infra 赛道 · 方向三:软件研发全流程协同**,队伍:**猹码古道**。多 Agent 协同设计以 [AgentTeams](https://github.com/agentscope-ai/AgentTeams)(原名 Hiclaw)为基点,完整设计见 [docs/competition-design.md](docs/competition-design.md)。

同一整改队列有三条接入路径,状态完全一致:

| 路径 | 接入方 | 入口 |
|---|---|---|
| QwenWork skill | 千问办公 Agent | `skill/SKILL.md`(已安装为 viber-fix) |
| MCP server | [cran-code 猹询码](https://github.com/NLPark-Cran/cran-code) 及任意 MCP 客户端 | `bridge/mcp-server.js`,配置见 `integrations/cran-code/` |
| DSH 插件 | [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Agent 循环 | `integrations/dsh/`(dsh-plugin) |

五个职能 Agent:哨兵(反馈聚合)→ 调度(Manager)→ 巧匠(根因定位+自动编码)→ 验收(测试+预览对比+人工确认)→ 沉淀(复盘+术语库演进)。执行轨迹见 `node bridge/cli.js trace`。

## 已知限制 / 后续

- iframe 内的元素暂不支持框选(只注入顶层文档)
- 截图只覆盖视口可见部分,超大元素会被裁剪
- 选择器为启发式生成,Agent 侧会用截图 + 文案交叉定位
- 后续:多浏览器(Firefox)、请求合并去重、与 dev server 热更新联动自动刷新
