FROM node:20-alpine

WORKDIR /app

# 安装中文字体支持
RUN apk add --no-cache \
    fontconfig \
    freetype \
    ttf-freefont \
    libmagic \
    # Python for some npm packages
    python3 \
    make \
    g++

# 复制 package files
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY . .

# 创建必要目录
RUN mkdir -p uploads outputs

# 暴露端口
EXPOSE 3000

# 环境变量
ENV BASE_PATH=${BASE_PATH:-}

# 启动命令
CMD ["sh", "-c", "node src/index.js"]
