---
name: viber-fix
description: 处理 ViberFix 浏览器插件提交的「Vibe 页面整改」请求。当用户说"处理整改请求""看看 viber 队列""框选整改""处理一下我刚框选的地方",或定时任务触发时调用。通过本地桥接服务(127.0.0.1:8787)读取用户框选的截图/选择器/意见/术语,定位源码并定向修改,支持回传 AI 样式推荐与生图预览。
version: 1.0.0
---

# ViberFix 整改请求处理

ViberFix = Chrome 插件(框选页面元素/区域) + 本地桥接服务(请求队列) + 本 skill(驱动 Agent 改代码)。
用户在浏览器里框选不满意的元素、写下整改意见(可附带设计术语),插件把截图 + CSS 选择器 + 意见提交到桥接队列,本 skill 负责消费队列、修改源码、回传结果。

## 关键路径与命令

- 项目根目录:`D:/workspace/viber`(桥接服务、CLI、插件源码都在这里)
- 启动桥接:`node "D:/workspace/viber/bridge/server.js"`(后台运行;默认 127.0.0.1:8787)
- CLI:`node "D:/workspace/viber/bridge/cli.js" <命令>`
  - `health` 检查服务
  - `list pending` 列出待处理请求
  - `show <id>` 查看详情(含截图文件名、选择器、意见、术语)
  - `pickup <id>` 认领(状态 → picked_up)
  - `respond <id> '<json>'` 回传 AI 样式推荐
  - `preview <id> <图片路径> [备注]` 回传生图预览(直接读本地图片文件)
  - `done <id> <总结>` / `fail <id> <原因>` 收尾
- 截图文件:`D:/workspace/viber/bridge/data/uploads/<id>.png`(用 Read 工具直接看图)

## 处理流程(每条请求)

1. `cli.js health`;若连不上,后台启动 `node "D:/workspace/viber/bridge/server.js"` 再重试。
2. `cli.js list pending`;为空则直接回复"队列为空"。
3. 对每条请求:`show <id>` → `pickup <id>`。
4. 用 Read 工具查看截图 `bridge/data/uploads/<id>.png`,结合 `roleGuess`(sidebar/navbar/cardlist/…)理解用户框的是哪块。
5. 定位源码:
   - 优先用请求里的 `projectPath`(用户没在插件 popup 里配置则为空,此时询问用户或根据 `pageUrl` 的端口推断本地项目)。
   - 用 Grep 在项目中搜 `selector` 里的 class/id、或截图中的可见文案,锁定 HTML/组件文件。
6. 按 `comment` + `terms` 修改代码。`terms` 是用户选的设计术语,每项带英文 `prompt`(如 neumorphism、masonry layout),把它当作设计意图关键词落实到 CSS/组件上,不要字面照抄。
7. 按请求类型回传:
   - `type=fix`:直接改代码,完成后 `done <id> <改了哪些文件、做了什么>`。
   - `type=style_suggestion`:不改代码。看截图 + `styles`,给出 2-3 个方向,`respond <id> '{"suggestions":[{"title":"…","desc":"…","terms":["新拟态"]},…],"note":"…"}'`。
   - `type=preview_image`:不改代码。用 ImageGen 按"当前元素现状 + 用户意见 + 术语"生成一张效果预览图,再 `cli.js preview <id> <生成文件路径> <备注>`。
8. 收尾:`done <id> <总结>`(失败用 `fail`)。总结写清改了哪个文件、用户刷新页面即可看到。

## 术语速查(与插件内置术语库一致)

布局:瀑布流布局、Bento 网格、卡片式布局、杂志分栏、居中单栏、时间轴布局、吸顶悬浮
风格:新拟态(neumorphism)、玻璃拟态(glassmorphism)、极简留白、粗野主义(neo-brutalism)、扁平化、质感拟物、暗黑模式、科技感
色彩:莫兰迪低饱和、渐变色点缀、高对比撞色、单色系层次
排版:衬线大标题、字重层级、加大行距留白
动效:卡片悬浮抬升、骨架屏加载、渐入滚动动画、视差滚动、微交互反馈

## Pitfalls

- Windows 路径含空格/反斜杠时一律加引号。
- `respond` 的 JSON 在 Windows cmd 下注意引号转义;复杂 JSON 建议先写成临时文件再 `node -e` 读取 POST,或直接用 heredoc 调 curl。
- 截图可能只覆盖视口内部分;元素超出视口时截图是裁剪后的,结合 `rect` 尺寸判断。
- `selector` 是启发式生成的,可能不精确;优先用截图 + 文案 Grep 交叉定位,别只信选择器。
- 处理完提醒用户刷新页面(dev server 热更新通常自动生效)。
- 队列里的请求可能来自不同项目,逐条核对 `projectPath`,别把 A 项目的样式改到 B 项目。

## Verification

- 每条请求处理后 `cli.js show <id>` 确认状态为 done/failed 且 summary 非空。
- 若项目有 lint/build/dev 命令,改完跑一次确认无报错再 done。
- 全部处理完后 `cli.js list pending` 应为空。
