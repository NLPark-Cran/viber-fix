# dsh-viberfix —— DeepSeek Harness 生态插件

把 [ViberFix](../../README.md) 的整改队列接入 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 的工具层,让 dsh 的 Agent 循环能直接消费"用户在浏览器里框选的页面整改反馈"。

DSH 的架构是**一切皆插件**(基于 [Cordis](https://github.com/cordiverse/cordis)):模型适配器、工具注册表、Agent 循环都可从配置替换。本包作为一个 bundle,通过 `cordis.patch.yml` 向插件树插入一行,挂载后向 `ctx.tools` 注册 7 个模型可见工具;卸载时注册自动回滚(effect-based)。

## 安装

```sh
# 在 dsh profile 中安装本包(out-of-tree plugin),例如:
dsh profile install /path/to/viber-fix/integrations/dsh
# 或 npm link / pnpm add 后在 profile 的 bundles 列表加入 dsh-viberfix
```

前置条件:本地运行 ViberFix 桥接服务 `node bridge/server.js`(默认 http://127.0.0.1:8787)。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `viberfix_list_requests` | 列出整改队列(截图+意见+术语的结构化请求) |
| `viberfix_get_request` | 单条详情:截图 URL、选择器、语义猜测、源码目录 |
| `viberfix_pickup` | 认领请求,多 Agent 协同时防重复 |
| `viberfix_respond` | 回传 AI 样式推荐 |
| `viberfix_preview` | 回传生图预览(本地图片路径) |
| `viberfix_done` | 标记完成并附总结 |
| `viberfix_trace` | 读取执行轨迹(可观测证据) |

## 配置覆盖

bundle 默认 `bridgeUrl: http://127.0.0.1:8787`。用户可在 profile 的 `cordis.patch.yml` 按行 id 覆盖:

```yaml
- id: viberfix-tools
  name: 'dsh-viberfix'
  config:
    bridgeUrl: 'http://127.0.0.1:9000'
```

## 与 dsh 架构的对应关系

- **工具注册**:遵循 `docs/cookbook/adding-a-tool.md` 契约(`defineTool`、参数校验、canonical JSON 输出、`output.render`)。
- **Code Mode**:注册的工具自动可作为 `await tools.viberfix_list_requests()` 调用,无需额外集成。
- **策略与观测**:不在工具内建部署策略;可用 `tools/pre-execute` 挂审批门(高风险整改先 ask),用 `tools/execute` 包指标采集。
- **发现性**:仓库带 `dsh-plugin` topic(见 package.json keywords)。

## 生态定位

同一个桥接队列有三条接入路径,状态完全一致:

1. **dsh 插件**(本包)—— DeepSeek Harness Agent 循环
2. **MCP server**(`bridge/mcp-server.js`)—— cran-code(猹询码)及任意 MCP 客户端
3. **QwenWork skill**(`skill/SKILL.md`)—— 千问办公 Agent
