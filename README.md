# Ads Alliance System V2

广告联盟系统 V2 — 通过海外代理自动播放含广告视频并获取收益的自动化系统。

## 功能

- **代理管理** — 批量导入、自动验证、健康检测、一键清除不可用代理
- **视频管理** — 管理广告播放视频列表
- **任务引擎** — 自动调度播放任务，支持并发控制、代理轮换
- **AI 辅助检测** — 集成 DeepSeek/ChatGPT 分析任务异常，自动纠错
- **收益统计** — 播放数据可视化统计
- **系统日志** — 代理/任务/登录/AI 检测全链路日志
- **多用户支持** — 管理员/用户角色权限管理

## 技术栈

### 后端
- **运行时**: Node.js (Express 4)
- **数据库**: SQLite (better-sqlite3)
- **浏览器自动化**: Playwright
- **代理支持**: proxy-chain (HTTP/SOCKS5 转换)
- **AI 集成**: DeepSeek API / OpenAI API (ChatGPT)

### 前端
- **框架**: React 18
- **UI**: Material UI 5 + Tailwind CSS
- **状态管理**: Zustand
- **构建**: Vite 5

## 部署

### 系统要求
- Node.js >= 18
- npm >= 9

### 安装

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置 PORT（默认 5680）

# 构建前端
npm run build

# 启动
npm start
```

### 首次使用
1. 访问 `http://localhost:5680`
2. 使用默认管理员登录：`admin / admin123`
3. 在系统设置中配置 KDL 订单号或通过"从API拉取"导入代理

## API 概览

| 路径 | 说明 |
|------|------|
| `POST /api/auth/login` | 管理员登录 |
| `GET/POST /api/proxies` | 代理 CRUD |
| `POST /api/proxies/health-check` | 代理健康检测 |
| `POST /api/proxies/api-fetch` | 从外部 API 拉取代理 |
| `DELETE /api/proxies/by-status/:status` | 按状态删除代理 |
| `GET/POST /api/tasks` | 任务 CRUD |
| `POST /api/tasks/:id/start` | 启动任务 |
| `GET/POST /api/videos` | 视频管理 |
| `GET /api/earnings` | 收益统计 |
| `GET/PUT /api/ai/settings` | AI 检测配置 |
| `GET /api/logs/*` | 系统日志查询 |

## 许可证

MIT
