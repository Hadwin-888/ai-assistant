# AI 助手 (AI Assistant)

基于 MiniMax API 的智能助手，提供合同审核、数据对比、PPT生成等功能。

**在线访问**: https://www.dianhaha.xyz

---

## 功能列表

### 1. 合同审核 (Contract Review)
- **文本审核**: 直接输入合同文本进行AI审核
- **文件审核**: 上传 PDF/Word/Excel/TXT 文件进行审核

### 2. 数据对比 (Data Comparison)
- **文本对比**: 输入两段文本进行差异对比
- **文件对比**: 上传两个文件进行差异对比

### 3. PPT 生成 (PPT Generation)
- 根据主题自动生成 PPT 演示文稿

### 4. AI 对话 (AI Chat)
- 通用 AI 对话功能

---

## 技术栈

- **后端**: Node.js + Express
- **AI 引擎**: MiniMax API
- **文件处理**:
  - PDF: pdf-parse
  - Word: mammoth
  - Excel: exceljs
  - PPT: pptxgenjs
- **部署**: Docker + Cloudflare Tunnel

---

## 项目结构

```
ai-assistant/
├── src/
│   ├── index.js          # 主入口
│   ├── routes/
│   │   └── api.js        # API 路由
│   └── services/
│       ├── minimax.js    # MiniMax API 服务
│       ├── fileParser.js # 文件解析服务
│       └── pptGenerator.js # PPT 生成服务
├── public/               # 前端静态文件
├── uploads/              # 上传文件目录
├── outputs/              # 输出文件目录
├── Dockerfile           # Docker 配置
├── docker-compose.yml   # Docker Compose 配置
├── package.json
└── .env.example         # 环境变量示例
```

---

## 环境变量

在 `.env` 文件中配置：

```bash
# MiniMax API 配置
MINIMAX_API_KEY=your_api_key_here
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# 服务配置
PORT=3000
NODE_ENV=development

# 反向代理路径（使用 Cloudflare Tunnel 时设为空，使用 Nginx 路径代理时设为 /ai-assistant）
BASE_PATH=
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 启动开发服务器
npm run dev

# 启动生产服务器
npm start
```

---

## Docker 部署

```bash
# 构建镜像
docker build -t hadwin8156/ai-assistant:latest .

# 运行容器
docker run -d -p 3000:3000 \
  --name ai-assistant \
  -e MINIMAX_API_KEY=your_api_key \
  -e BASE_PATH= \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  hadwin8156/ai-assistant:latest
```

---

## API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/contract/review-text` | 合同文本审核 |
| POST | `/api/contract/review-file` | 合同文件审核 |
| POST | `/api/data/compare-text` | 数据文本对比 |
| POST | `/api/data/compare-files` | 数据文件对比 |
| POST | `/api/ppt/generate` | 生成 PPT |
| POST | `/api/chat` | AI 对话 |
| GET | `/api/health` | 健康检查 |

---

## 待开发功能清单

> 如需新增功能，在此列表中描述，我会帮你实现

- [ ] **功能名称**: 描述
- [ ] **功能名称**: 描述
- [ ] **功能名称**: 描述

---

## 部署说明

### Cloudflare Tunnel 部署（推荐）

1. 安装 cloudflared:
   ```bash
   brew install cloudflared
   ```

2. 创建 Tunnel:
   ```bash
   cloudflared tunnel create ai-assistant
   ```

3. 配置 DNS:
   ```bash
   cloudflared tunnel route dns --overwrite-dns ai-assistant www.yourdomain.com
   ```

4. 创建配置文件 `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: ai-assistant
   credentials-file: /path/to/credentials.json

   ingress:
     - hostname: www.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. 启动服务:
   ```bash
   # 启动 Node 服务
   npm start &

   # 启动 Tunnel
   cloudflared tunnel run ai-assistant
   ```

---

## 更新日志

### 2026-03-15
- 添加 BASE_PATH 支持，适应反向代理部署
- 优化 Cloudflare Tunnel 部署

---

*如需新增功能，请在此文件中添加描述，我会帮你实现*
