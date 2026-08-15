# ViberFix · 软件研发全流程协同的多 Agent 闭环设计

> 参赛赛道:Agent Infra 新智基座 · 方向三:软件研发全流程协同
> 队伍:猹码古道
> 协同设计基点:[AgentTeams](https://github.com/agentscope-ai/AgentTeams)(原名 Hiclaw)
> 生态协同:[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(dsh 插件)、[cran-code 猹询码](https://github.com/NLPark-Cran/cran-code)(MCP)

## 1. 场景与问题

Vibe coding 让非专业前端也能"说"出页面,但**视觉反馈无法结构化地回到研发流程**:用户看着不爽却说不出哪里不对,更写不出 Agent 能执行的精准前端指令。传统研发协同里,这类反馈散落在截图、聊天、Issue 中,去重、定位、修复、验证全靠人肉中转。

ViberFix 把"哪里不爽点哪里"变成研发闭环的**任务输入层**:浏览器扩展框选元素/区域 → 自动截图、生成选择器、猜测语义角色(侧边栏/导航/卡片列表…)、附带设计术语 → 进入本地桥接队列 → 多 Agent 协同完成定位、修复、验证、沉淀。

该场景具有行业普遍性:任何"AI 生成前端 + 人类验收"的工作流(独立开发者、设计评审、产品走查、客户验收)都需要同样的反馈→修复闭环。

## 2. Agent Identity 清单(≥3 个不同职能)

| ID | 名称 | 职能 | 运行时映射(AgentTeams) | 能力边界 | 协同关系 |
|---|---|---|---|---|---|
| A1 | 哨兵 Scout | 缺陷/需求聚合:框选采集、截图、语义猜测、去重结构化 | 任务输入源 + QwenPaw Worker(浏览器侧) | 只采集与结构化,不改代码 | 产出请求入共享队列;向 Manager 上报新任务 |
| A2 | 调度 Manager | 任务拆解与分派、状态追踪、异常重试 | AgentTeams Manager(OpenClaw/QwenPaw) | 不直接改代码;负责编排与升级人工 | 从队列领取任务,分派给 A3/A4;在 Matrix 房间全程可见 |
| A3 | 巧匠 Fixer | 代码根因定位、影响面分析、修复方案生成与自动编码 | Hermes / cran-code Worker(自主编码运行时) | 只在 projectPath 内改码;每次修复独立 git 提交(可回滚) | 消费 A1 的结构化请求;修复后交 A4 验证 |
| A4 | 验收 Verifier | 测试验证(build/lint)、生图预览对比、人工确认、发布确认 | QwenPaw Worker + 人类(Matrix 房间内) | 不改代码;只验证与裁决 | 验证失败 → 回退 A3 并附证据;通过 → 交 A5 |
| A5 | 沉淀 Archivist | 上线复盘、执行证据归档、术语库/案例库演进 | OpenClaw Worker | 只读轨迹与结果,写知识库 | 消费 trace 与 done 总结,反哺 A1 的术语推荐 |

> 5 个职能 Agent ≥ 赛题要求 3 个;人类始终是 Matrix 房间成员(Human-in-the-Loop)。

## 3. 映射到 AgentTeams 框架能力

| 赛题要求 | AgentTeams 能力 | ViberFix 本地等价实现(当前代码) |
|---|---|---|
| 角色编排 | Manager-Workers CRD(Team/Worker/Human 声明式资源) | skill viber-fix 扮演 Manager 编排;cran-code/dsh 扮演 Worker |
| 任务拆解 | Manager 分派 + TeamHarness | 请求 type 三分(fix / style_suggestion / preview_image)即拆解维度 |
| 上下文传递 | Matrix 房间消息 + MinIO 共享文件系统 | 桥接队列 JSON + data/uploads 截图目录(共享状态) |
| 协同执行 | 多运行时 Worker 同房间协作(OpenClaw/QwenPaw/Hermes) | QwenWork skill / cran-code(MCP)/ dsh(插件)三运行时消费同一队列 |
| 状态追踪 | Worker 生命周期 + Manager 心跳 | 请求状态机 pending→picked_up→done/failed + trace.jsonl |
| 人工可见与干预 | Element Web + Matrix,默认 Human-in-the-Loop | 扩展面板即人类裁决点(预览叠加对比、"就按这个改") |
| 凭证隔离 | Higress 网关持真凭证,Worker 只见消费令牌 | 桥接只暴露本地回环;Agent 不持有任何第三方密钥 |

## 4. 端到端闭环(赛题八项)

1. **任务输入**:扩展框选 → POST /api/requests(截图+selector+roleGuess+comment+terms+projectPath)。
2. **任务拆解**:Manager(skill/dsh/cran-code 任一编排者)按 type 与 roleGuess 分派。
3. **上下文传递**:队列 JSON 承载结构化上下文;截图以文件共享;terms 带英文 prompt 作跨 Agent 语义锚点。
4. **工具调用**:Skill(viber-fix 等)+ MCP(mcp-server.js)+ dsh 工具(同一契约三形态)。
5. **结果验证**:Verifier 跑 build/lint;生图预览叠加对比;用户确认。
6. **执行证据沉淀**:trace.jsonl(状态流转)+ 截图/预览图存档 + done summary。
7. **审批与回滚**:高风险动作(改码)前置人工确认(预览对比/Matrix 房间);每次修复独立提交,回滚 = git revert;failed 状态附原因。
8. **经验沉淀**:Archivist 将高频术语组合与成功案例写回术语库(rolePresets 演进),形成可复用 Skill。

## 5. Skill 清单(必选项,九字段)

### 5.1 viber-fix(编排与修复)

- 用途:消费整改队列,驱动 Agent 定位源码并定向修改
- 输入:队列请求 id(或全量 pending)
- 输出:代码修改 + 状态回写(done/failed + summary)
- 调用条件:用户口令"处理整改请求"或定时任务
- 依赖工具:bridge CLI / HTTP API、Read(看截图)、Grep/编辑(改码)
- 失败处理:bridge 未启动则自启重试;定位失败 fail 附原因,不静默吞错
- 安全边界:只在 projectPath 内修改;不改 git 配置;不提交密钥文件
- 复用价值:任何"视觉反馈→代码修改"场景可复用(设计走查、客户验收)
- 与多 Agent 关系:Manager 职能的执行体

### 5.2 viberfix-style-advisor(AI 样式推荐)

- 用途:看截图+计算样式,产出 2-3 个设计方向供用户一键应用
- 输入:style_suggestion 请求(截图、styles、roleGuess)
- 输出:respond JSON(suggestions[])
- 调用条件:用户在扩展点"✦ AI 推荐样式"
- 依赖工具:Read 截图、术语库
- 失败处理:超时插件端提示;不产出空推荐
- 安全边界:只读,不改码
- 复用价值:任何前端设计决策辅助场景
- 与多 Agent 关系:Verifier/顾问职能,输出经人类选择后流入 Fixer

### 5.3 viberfix-preview(生图预览)

- 用途:把整改意见画成预览图,叠加页面对比,降低沟通成本
- 输入:preview_image 请求(截图+意见+术语)
- 输出:preview 图片回传
- 调用条件:用户点"✎ 生成效果预览"
- 依赖工具:ImageGen、bridge preview API
- 失败处理:生图失败 fail 附原因,用户可退化为纯文字意见
- 安全边界:只读现状+生成图片,不改码
- 复用价值:设计提案、A/B 视觉对比
- 与多 Agent 关系:Verifier 的裁决依据之一

## 6. MCP 与工具集成契约

- 协议:MCP stdio(JSON-RPC 2.0),`bridge/mcp-server.js`,零依赖
- 鉴权:本地回环 + 可选 env 覆盖端口;无第三方凭证
- 输入输出 Schema:8 个工具(list/get/pickup/respond/preview/done/fail/trace),参数与返回见 mcp-server.js TOOLS
- 错误处理:ECONNREFUSED 明确提示启动命令;404/400 转 isError 文本
- 审计:所有状态流转写 trace.jsonl
- 幂等:pickup/done 为状态机迁移,重复调用无副作用
- 降级:MCP 不可用时,CLI 与 HTTP 提供等价能力(同一桥接)
- 迁移成本:本就是 MCP,无迁移;AgentTeams 可以 CRD 声明式挂载

## 7. 上下文能力(四选二,实际三项)

1. **共享状态管理**:桥接队列 + uploads 目录 = 本地版 MinIO 共享文件系统,多运行时(QwenWork/cran-code/dsh)读写同一状态。
2. **轨迹可观测**:trace.jsonl(Log/Trace 两类数据),覆盖请求生命周期与工具调用结果;/api/trace 与 CLI/MCP 三入口可读。
3. **知识库 RAG(轻量)**:设计术语库(30+ 术语带英文 prompt)+ rolePresets 案例库,作为检索增强上下文注入整改指令。

## 8. 开放/开源计划

- 仓库 MIT(规划),当前公开可访问:github.com/NLPark-Cran/viber-fix
- 三形态工具契约( Skill / MCP / dsh 插件)同源同状态,天然可复用
- 术语库 terms.json 独立可分发,欢迎社区贡献词条
- 上游协同:作为 dsh 生态插件(dsh-plugin topic)与 cran-code 生态技能双线演进
