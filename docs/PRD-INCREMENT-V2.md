# 广告联盟系统 V2 — 增量 PRD

> 文档版本：1.0 | 日期：2025-07-25 | 作者：许清楚（PM）

---

## 一、项目信息

| 字段 | 值 |
|------|-----|
| 项目名称 | ads-alliance-system-v2-increment |
| 前端技术栈 | React 18 + MUI 5 + Tailwind CSS + Zustand |
| 后端技术栈 | Express 4 + better-sqlite3 + Playwright + proxy-chain |
| 数据库 | SQLite（5 现有表 + 2 新增表） |
| 语言 | 中文 |
| 部署地址 | 119.28.162.119:5680 |

### 原始需求复述

在现有 V2 广告联盟系统基础上，新增 4 个功能模块：① 代理批量导入增强（智能解析 + IP 地理位置自动检测 + 验证出口 IP）；② 视频管理模块（CRUD + 元数据自动提取 + 预览）；③ 任务执行时显示当前代理 IP；④ 多用户登录系统（含访客模式）。

---

## 二、产品目标

| # | 目标 | 衡量指标 |
|---|------|----------|
| G1 | **降低代理管理操作成本**：从逐条手动添加到批量粘贴导入，自动解析多种格式，减少 80% 代理录入时间 | 单次导入 100 条代理 < 10 秒（含解析） |
| G2 | **提升任务可观测性**：用户能实时看到任务使用的代理 IP 和地理位置，快速定位异常代理 | 运行中任务 IP 可见延迟 < 3 秒 |
| G3 | **支持多用户独立使用**：不同用户数据隔离，同时保留无需登录的演示入口 | 多用户并发操作无数据串扰 |

---

## 三、用户故事

| # | 角色 | 故事 | 验收标准 |
|---|------|------|----------|
| US1 | 运营人员 | 我希望能批量粘贴代理列表一键导入，这样不用逐条手动添加 | 支持 3 种格式自动解析；导入结果返回成功/重复/失败计数 |
| US2 | 运营人员 | 我希望看到每个代理的地理位置和实际出口 IP，这样能判断代理是否在目标地区 | 代理列表显示国家/城市列和出口 IP 列；地理位置在添加时自动检测 |
| US3 | 运营人员 | 我希望一键验证代理的实际出口 IP，这样能确认代理没有被服务商欺骗 | 点击"验证 IP"按钮后 5 秒内返回结果；结果持久化存储 |
| US4 | 运营人员 | 我希望能管理视频 URL 并自动获取标题和时长，这样创建任务时不需要手动查找视频信息 | 粘贴视频 URL 后自动抓取标题和时长；支持 upbolt.to 等站点 |
| US5 | 运营人员 | 我希望在任务执行时看到当前使用的代理 IP，这样能实时监控任务状态 | 运行中任务卡片/日志实时显示当前 IP；IP 切换时 3 秒内更新 |
| US6 | 系统管理员 | 我希望能创建多个用户账号并分配权限，这样团队成员能独立使用系统 | 支持用户 CRUD；数据按用户隔离 |
| US7 | 演示访客 | 我希望无需登录就能浏览系统，这样能快速了解功能 | 访客可查看所有页面数据但无法执行写操作 |

---

## 四、需求池

### P0 — 必须完成（MVP）

| ID | 需求 | 所属功能 | 说明 |
|----|------|----------|------|
| P0-01 | 批量粘贴导入代理 | 功能1 | 支持文本区域粘贴，自动解析 `ip:port`、`ip:port:user:pass`、`protocol://ip:port:user:pass` 三种格式 |
| P0-02 | IP 地理位置自动检测 | 功能1 | 添加/导入代理时，后端调用 GeoIP 服务（如 ip-api.com）获取国家+城市，写入数据库 |
| P0-03 | 代理表增加地理位置列 | 功能1 | 代理列表表格新增"国家/城市"列，显示 flag emoji + 国家 + 城市 |
| P0-04 | 验证 IP 功能 | 功能1 | 单个代理"验证 IP"按钮，通过该代理请求外部 API（如 httpbin.org/ip），返回实际出口 IP 并持久化 |
| P0-05 | 代理表增加实际 IP 列 | 功能1 | 代理列表表格新增"实际 IP"列，显示验证后的出口 IP |
| P0-06 | 视频管理 CRUD | 功能2 | 新增视频管理页面，支持添加/删除/编辑视频 URL |
| P0-07 | 视频元数据自动提取 | 功能2 | 后端通过 Playwright 访问视频 URL，自动提取标题和时长 |
| P0-08 | 任务执行显示当前 IP | 功能3 | 运行中任务卡片显示当前使用的代理 IP；执行日志每条记录关联 proxy_id |
| P0-09 | 用户登录 | 功能4 | 用户名+密码登录；JWT 鉴权；默认管理员 admin/admin123 |
| P0-10 | 用户数据隔离 | 功能4 | 代理/任务/视频/收益数据按 user_id 隔离，登录后只看自己的数据 |
| P0-11 | 数据库新增 users 表 | 功能4 | 字段：id, username, password_hash, role(admin/user/guest), created_at, updated_at |
| P0-12 | 数据库新增 videos 表 | 功能2 | 字段：id, user_id, url, title, duration, site, created_at, updated_at |

### P1 — 应该完成

| ID | 需求 | 所属功能 | 说明 |
|----|------|----------|------|
| P1-01 | 视频预览播放 | 功能2 | 视频详情中内嵌 iframe 播放器预览 |
| P1-02 | 视频管理集成到任务创建 | 功能2 | 任务创建时可从视频库选择，而非手动输入 URL |
| P1-03 | 代理表按地理位置筛选 | 功能1 | 筛选栏增加国家下拉筛选 |
| P1-04 | 批量验证 IP | 功能1 | 支持选中多个代理批量验证出口 IP（并发限制 5） |
| P1-05 | 访客模式 | 功能4 | 未登录用户可浏览所有页面（只读），导航栏显示"访客模式"标识，写操作弹登录提示 |
| P1-06 | 用户管理页面 | 功能4 | 管理员可创建/编辑/删除普通用户账号 |

### P2 — 可以做

| ID | 需求 | 所属功能 | 说明 |
|----|------|----------|------|
| P2-01 | 视频健康检测 | 功能2 | 定期检查视频 URL 是否可访问，标记失效视频 |
| P2-02 | 代理导入文件上传 | 功能1 | 支持 .txt/.csv 文件上传导入 |
| P2-03 | 操作审计日志 | 功能4 | 记录用户登录/关键操作日志 |
| P2-04 | IP 地理位置地图可视化 | 功能1 | Dashboard 展示代理 IP 全球分布地图 |

---

## 五、UI 设计要点

### 5.1 功能1：代理管理增强

**代理列表页（ProxyPage）变更：**

- 表格新增列（插入在"端口"列之后）：
  - **地理位置**：显示国旗 emoji + 国家代码 + 城市名，如 🇺🇸 US / Los Angeles；未检测时显示"—"
  - **实际 IP**：显示验证后的出口 IP；未验证时显示"未验证"灰色标签
- 操作列新增 **"验证 IP"** 按钮（图标：WifiTetheringIcon），点击后异步执行，按钮变为 loading 状态，完成后显示结果
- 顶部操作栏新增 **"批量验证"** 按钮（仅在选中代理时可用）

**批量导入对话框（ProxyImportDialog）增强：**

- 现有文本区域保留，增加格式提示：
  ```
  支持以下格式（每行一条）：
  · ip:port
  · ip:port:username:password
  · protocol://ip:port:username:password
  ```
- 导入结果对话框增加统计：成功 N 条 / 重复 N 条 / 格式错误 N 条
- 导入时自动触发地理位置检测（后台异步，不阻塞导入返回）

### 5.2 功能2：视频管理

**新增视频管理页面（VideoPage）：**

- 路由：`/videos`
- Sidebar 增加菜单项：🎬 视频管理，位于"代理管理"和"任务管理"之间

**页面布局：**

```
┌─────────────────────────────────────────────┐
│ 视频管理                    [添加视频] [刷新] │
├─────────────────────────────────────────────┤
│ 筛选：[站点▾] [状态▾] [搜索...]             │
├──────┬────────────┬──────┬───────┬──────────┤
│  ☑   │ 视频标题   │ 站点 │ 时长  │  操作    │
├──────┼────────────┼──────┼───────┼──────────┤
│  ☑   │ Video ...  │upbolt│ 5:30  │预览|编辑|删│
│  ☐   │ Video ...  │upbolt│ 3:45  │预览|编辑|删│
└──────┴────────────┴──────┴───────┴──────────┘
```

**添加视频对话框：**

- 输入框：视频 URL（必填）
- 点击"获取信息"按钮 → 后端自动提取标题和时长
- 显示提取结果：标题（可编辑）、时长（只读）、站点（自动识别）
- 确认添加

**视频预览：**

- 点击"预览"打开 Dialog，内嵌 iframe 加载视频页面
- Dialog 宽度 80vw，高度 70vh

### 5.3 功能3：任务执行显示当前 IP

**任务卡片（TaskCard）变更：**

- 运行状态的任务卡片增加一行状态信息：
  ```
  当前IP：203.0.113.5 (🇺🇸 US)    播放次数：12    错误：0
  ```
- IP 信息随轮询刷新（复用现有 5 秒轮询机制）

**任务详情/编辑页（TaskEditorPage）变更：**

- 运行中的任务顶部增加实时状态面板：
  ```
  ┌─ 运行状态 ─────────────────────────────┐
  │ 状态：运行中  │ 当前代理：203.0.113.5  │
  │ 播放：12     │ 代理地区：🇺🇸 US      │
  │ 完成：10     │ 切换次数：3            │
  └─────────────────────────────────────────┘
  ```

### 5.4 功能4：多用户登录

**新增登录页（LoginPage）：**

- 路由：`/login`
- 未登录时自动跳转到登录页
- 布局：居中卡片式登录表单
  ```
  ┌─────────────────────────┐
  │    广告联盟系统 V2       │
  │                         │
  │  用户名 [___________]   │
  │  密码   [___________]   │
  │                         │
  │      [登  录]           │
  │                         │
  │  以访客身份浏览 →       │
  └─────────────────────────┘
  ```

**AppLayout 变更：**

- AppBar 右侧显示当前用户名 + 退出按钮
- 访客模式显示"访客"标签 + 登录入口
- Sidebar 底部增加用户信息区域（头像 + 用户名）

**新增用户管理页面（UserManagementPage）：**

- 路由：`/users`
- 仅管理员可见（Sidebar 条件渲染）
- 表格：用户名 / 角色 / 创建时间 / 操作（编辑/删除）
- 添加用户对话框：用户名 + 密码 + 角色选择

**路由守卫：**

- 全局路由守卫：未登录 → 跳转 /login
- 访客模式：可访问所有页面，写操作 API 返回 401 时弹出登录提示
- 管理员专属页面：`/users` 仅 admin 角色可访问

---

## 六、数据库变更

### 6.1 新增表：users

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'guest')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 默认管理员
INSERT INTO users (username, password_hash, role) VALUES ('admin', '<bcrypt_hash_of_admin123>', 'admin');
```

### 6.2 新增表：videos

```sql
CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  duration INTEGER,  -- 秒数
  site TEXT,          -- 如 'upbolt.to'
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invalid')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 6.3 现有表变更：proxies

```sql
ALTER TABLE proxies ADD COLUMN country TEXT;       -- 国家代码，如 'US'
ALTER TABLE proxies ADD COLUMN city TEXT;           -- 城市名，如 'Los Angeles'
ALTER TABLE proxies ADD COLUMN actual_ip TEXT;      -- 验证后的实际出口 IP
ALTER TABLE proxies ADD COLUMN user_id INTEGER REFERENCES users(id);
```

### 6.4 现有表变更：tasks

```sql
ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id);
```

### 6.5 现有表变更：execution_logs

```sql
-- proxy_id 已存在，增加实际 IP 快照
ALTER TABLE execution_logs ADD COLUMN proxy_ip TEXT;  -- 执行时的代理出口 IP
```

### 6.6 现有表变更：earnings

```sql
ALTER TABLE earnings ADD COLUMN user_id INTEGER REFERENCES users(id);
```

---

## 七、API 变更概览

### 功能1 新增/变更接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/proxies/batch-parse` | 解析批量文本，返回解析后的结构化列表（预览，不写入数据库） |
| POST | `/api/proxies/:id/verify-ip` | 验证单个代理的出口 IP |
| POST | `/api/proxies/batch-verify-ip` | 批量验证出口 IP |
| GET | `/api/proxies/:id/geo` | 获取代理地理位置（如需手动刷新） |

### 功能2 新增接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/videos` | 视频列表（分页+筛选） |
| POST | `/api/videos` | 添加视频 |
| GET | `/api/videos/:id` | 视频详情 |
| PUT | `/api/videos/:id` | 更新视频 |
| DELETE | `/api/videos/:id` | 删除视频 |
| POST | `/api/videos/fetch-meta` | 根据 URL 抓取视频元数据（标题+时长） |

### 功能3 变更接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks/:id/runtime` | **变更**：返回值增加 `currentProxyIp`、`currentProxyGeo` 字段 |

### 功能4 新增接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 JWT |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| GET | `/api/users` | 用户列表（管理员） |
| POST | `/api/users` | 创建用户（管理员） |
| PUT | `/api/users/:id` | 更新用户（管理员） |
| DELETE | `/api/users/:id` | 删除用户（管理员） |

---

## 八、待确认问题

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| Q1 | GeoIP 服务选用哪个？ip-api.com 免费但限 45 次/分钟；ipinfo.io 付费更稳定 | 功能1 | 先用 ip-api.com 免费版，后续可切换；批量导入时后端做队列限速 |
| Q2 | 验证 IP 用的外部 API 选什么？httpbin.org/ip vs ifconfig.me vs 自建 | 功能1 | 用 httpbin.org/ip，简单可靠；可配置化方便替换 |
| Q3 | 视频元数据提取兼容哪些站点？upbolt.to 已确认，其他站点结构不同 | 功能2 | 先实现 upbolt.to，提取逻辑抽象为可扩展的 site adapter 模式 |
| Q4 | 现有数据的 user_id 如何处理？系统已有代理/任务/收益数据，迁移后需归属到 admin | 功能4 | 数据库迁移脚本：所有现有数据的 user_id 设为 1（admin） |
| Q5 | 访客模式是否需要独立的 guest 账号，还是完全无 token 访问？ | 功能4 | 建议无 token 访问，后端对未鉴权请求返回只读数据；写操作返回 401 |
| Q6 | JWT token 过期时间？ | 功能4 | 建议 24 小时过期，前端自动刷新或重新登录 |
| Q7 | 代理批量导入的解析预览是否必要？还是直接导入显示结果？ | 功能1 | 建议先直接导入显示结果，减少交互步骤；P2 可加预览 |

---

## 九、实现优先级建议

```
第一阶段（核心）：P0-09 ~ P0-12（用户系统 + 数据库） → 必须先完成，其他功能依赖 user_id
第二阶段（代理增强）：P0-01 ~ P0-05（批量导入 + 地理位置 + 验证 IP）
第三阶段（视频管理）：P0-06 ~ P0-07（视频 CRUD + 元数据提取）
第四阶段（任务 IP）：P0-08（任务执行显示当前 IP）
第五阶段（体验优化）：P1-01 ~ P1-06
```
