# dev1 应用工作空间

本目录是工作台下**一个应用**的工作空间（`dev1` 是第一个应用，同时作为新建应用的脚手架参考）。工作台绑定一个固定父目录，应用是其中的子目录；应用之间互不共享批次、证据和 Git 仓库。Agent 配置见 `.opencode/agents/dev.md` 与 `opencode.json`。

## 工程事实（随项目补齐）

本工作空间在项目初始化时探测并补齐各目标工程的以下事实；探测不到的留空待补，不虚构命令。

| 项目 | 目录 | 栈与版本 | 构建命令 | 测试命令 | 运行命令 |
| --- | --- | --- | --- | --- | --- |
| 后端 | `backend` | Java 17.0.18 · Spring Boot 3.5.16 · Spring Cloud 2025.0.3 · Spring Data JPA · H2 2.3.232 · Maven 3.9.14 | `mvn -f backend/pom.xml clean package` | `mvn -f backend/pom.xml test` | `mvn -f backend/pom.xml spring-boot:run` |
| 前端 | `frontend` | Vue 3.5.45 · Vite 7.3.7 · Element Plus 2.14.7 · TypeScript 5.9 · Node 20.20.1 / npm 10.8.2 | `npm --prefix frontend run build` | `npm --prefix frontend run typecheck` | `npm --prefix frontend run dev` |
| 端到端自测 | `e2e` | Playwright 1.65（playwright-core，使用本机 Chrome） | — | `node e2e/run.mjs`（需先构建后端 jar 与安装前端依赖） | — |

- 后端数据落在 `backend/data/employeedb.mv.db`（H2 文件模式），重启不丢数据；接口统一前缀 `/api`。
- 前端开发/预览服务通过 Vite 代理把 `/api` 转发到 `http://127.0.0.1:8080`；后端同时配置了本地开发端口的 CORS。
- 本工作空间运行环境的 `PATHEXT` 被裁剪为 `.CPL`，直接用 `cmd`/npm 子进程查找 `node`、`java` 会失败；执行构建、测试与 E2E 前需在 shell 中设置完整 `PATHEXT`（E2E 脚本内部已为子进程补齐）。

## 批次输入

- 当前批次规则文件：`.opencode/batch/current.md`（由宿主在触发开发时生成，`opencode.json` 的 `instructions` 显式指向该文件，不使用通配）。
- 每批次的详细规格快照：`.opencode/batch/<批次ID>/specs/<需求点ID>.md`，生成后不可改写；旧批次整体移入 `.opencode/batch/archive/`，不再被匹配。
- 批次固定输入为本批次唯一开发依据；进入开发中的批次不受后续需求变化影响。切换批次后新建会话，不跨批次复用旧会话上下文。

## 交付

- 交付证据写入 `.opencode/delivery/<批次ID>.md`（模板见 `.opencode/delivery/TEMPLATE.md`）。
- 完成锚点：本批次代码与最新主干完成集成（merge）、相关自测通过、结果已更新项目远端主干、交付证据落盘。
