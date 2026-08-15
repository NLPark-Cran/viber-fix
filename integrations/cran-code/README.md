# cran-code(猹询码)× ViberFix 协同

[cran-code](https://github.com/NLPark-Cran/cran-code) 是 NLPark 团队的 CLI Agent(Kimi Code CLI fork),原生支持 MCP(`kimi mcp` / `--mcp-config-file`)。ViberFix 桥接自带标准 MCP server,因此 cran-code 可以零改造地消费整改队列,承担「根因定位 + 修复执行」职能。

## 接入方式

```sh
# 方式一:配置文件
kimi --mcp-config-file integrations/cran-code/cran-code.mcp.json

# 方式二:交互式添加
kimi mcp   # 按提示添加 viberfix server,command: node, args: <repo>/bridge/mcp-server.js
```

注意把 `cran-code.mcp.json` 里的路径改为你本机的仓库绝对路径。

## 协同闭环(方向三:软件研发全流程协同)

1. **缺陷/需求聚合**:用户在浏览器用 ViberFix 扩展框选不满意的元素/区域 → 截图+选择器+意见+术语进入桥接队列(多源反馈的统一聚合层)。
2. **根因定位**:cran-code 调 `viberfix_get_request`,拿截图与选择器,在 `projectPath` 里 grep class/文案定位源文件,分析影响面。
3. **修复执行**:cran-code 按意见+术语(带英文 prompt 关键词)直接编辑代码,自主规划与调整。
4. **结果验证**:跑项目 build/lint;需要时调 `viberfix_preview` 回传生图预览,用户在扩展里叠加对比并确认(人工审批点)。
5. **证据沉淀**:`viberfix_trace` 记录全链路状态流转;完成后 `viberfix_done` 写总结。

## 为什么是 MCP

MCP 是本赛题推荐的外部工具接入协议。cran-code 通过 MCP 接入 ViberFix,意味着同一套工具契约也能被 AgentTeams Worker(声明式 MCP CRD)、QwenWork 等任意 MCP 客户端复用——工具连接层与任务能力层(Skill)解耦。
