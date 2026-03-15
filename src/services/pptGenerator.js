const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 文多多 API 配置
const DOCMEE_API_KEY = process.env.DOCMEE_API_KEY || 'ak_sJJCB5EppsrFr8pfuC';

/**
 * 上传文件到文多多并获取文件URL
 * @param {string} token - API Token
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<string>} 文件URL
 */
async function uploadFile(token, filePath) {
  const FormData = require('form-data');

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const options = {
      hostname: 'open.docmee.cn',
      path: '/api/ppt/v2/uploadFile',
      method: 'POST',
      headers: {
        'token': token,
        ...form.getHeaders()
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 && result.data) {
            resolve(result.data);
          } else {
            reject(new Error(result.message || '文件上传失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * 创建文多多 API Token
 */
async function createDocmeeToken(uid, limit, timeOfHours = 2) {
  if (!DOCMEE_API_KEY) {
    throw new Error('DOCMEE_API_KEY 未配置');
  }

  const options = {
    hostname: 'open.docmee.cn',
    path: '/api/user/createApiToken',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': DOCMEE_API_KEY
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 && result.data) {
            resolve(result.data);
          } else {
            reject(new Error(result.message || '创建 Token 失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({
      uid,
      limit,
      timeOfHours
    }));
    req.end();
  });
}

/**
 * 使用文多多 AI 生成 PPT
 * @param {Object} options - 生成选项
 * @param {string} options.title - PPT 标题
 * @param {string} options.length - 篇幅长度: short/medium/long
 * @param {string} options.scene - 演示场景
 * @param {string} options.audience - 受众
 * @param {string} options.lang - 语言: zh/zh-Hant/en/ja/ko/ar/de/fr/it/pt/es/ru
 * @param {string} options.prompt - 用户要求（小于50字）
 * @param {string} options.outputPath - 输出文件路径
 * @param {string} options.filePath - 上传的文件路径（可选）
 * @returns {Promise<string>} 输出文件路径
 */
async function generatePPT(options) {
  const {
    title,
    length = 'medium',
    scene = '通用场景',
    audience = '大众',
    lang = 'zh',
    prompt = '',
    outputPath,
    filePath
  } = options;

  if (!DOCMEE_API_KEY) {
    throw new Error('DOCMEE_API_KEY 未配置');
  }

  // 1. 创建 API Token
  console.log('正在创建 API Token...');
  const tokenData = await createDocmeeToken(null, 1, 1);
  const token = tokenData.token;
  console.log('Token 创建成功:', token.substring(0, 20) + '...');

  // 2. 如果有上传的文件，先上传到文多多
  let uploadedFileUrl = null;
  if (filePath) {
    console.log('正在上传参考文档...');
    uploadedFileUrl = await uploadFile(token, filePath);
    console.log('文件上传成功:', uploadedFileUrl);
  }

  // 3. 创建 PPT 生成任务
  const taskId = `task_${Date.now()}`;

  const createTaskOptions = {
    hostname: 'open.docmee.cn',
    path: '/api/ppt/v2/createTask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': token
    }
  };

  console.log('正在创建 PPT 生成任务...');

  // 构建请求体
  const requestBody = {
    id: taskId,
    stream: true,
    length,
    scene,
    audience,
    lang,
    prompt: prompt || title
  };

  // 如果有上传的文件，添加到请求体
  if (uploadedFileUrl) {
    requestBody.fileUrl = uploadedFileUrl;
  }

  const taskResult = await new Promise((resolve, reject) => {
    const req = https.request(createTaskOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('创建任务响应:', JSON.stringify(result));
          if (result.code === 0) {
            resolve(result);
          } else {
            reject(new Error(result.message || '创建任务失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(requestBody));
    req.end();
  });

  console.log('PPT 生成任务已创建, taskId:', taskId);

  // 4. 轮询获取 PPT 生成状态并下载
  console.log('开始轮询获取 PPT 生成状态...');
  try {
    const finalOutputPath = await downloadPPT(token, taskId, outputPath);
    console.log('PPT 生成并下载成功:', finalOutputPath);
    return {
      taskId,
      outputPath: finalOutputPath,
      message: 'PPT 生成成功'
    };
  } catch (error) {
    console.error('PPT 生成失败:', error.message);
    throw error;
  }
}

/**
 * 获取 PPT 生成状态并下载
 * @param {string} token - API Token
 * @param {string} taskId - 任务ID
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 输出文件路径
 */
async function downloadPPT(token, taskId, outputPath) {
  const maxRetries = 60; // 最多等待 60 次
  const retryInterval = 3000; // 每 3 秒查询一次

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 获取任务状态
      const status = await getTaskStatus(token, taskId);
      console.log(`第 ${i + 1} 次查询任务状态:`, status.status, status.progress ? `进度: ${status.progress}%` : '');

      if (status.status === 'success' || status.status === 'completed') {
        // 下载 PPT 文件
        console.log('PPT 生成完成，正在下载...');
        const downloadUrl = status.data?.downloadUrl || status.downloadUrl;
        if (downloadUrl) {
          await downloadFile(downloadUrl, outputPath);
          return outputPath;
        } else {
          throw new Error('未获取到下载链接');
        }
      } else if (status.status === 'failed' || status.status === 'error') {
        throw new Error(status.message || 'PPT 生成失败');
      }

      // 等待后继续轮询
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    } catch (e) {
      console.error('查询状态出错:', e.message);
      if (i === maxRetries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }

  throw new Error('PPT 生成超时，请稍后重试');
}

/**
 * 获取任务状态
 * @param {string} token - API Token
 * @param {string} taskId - 任务ID
 */
async function getTaskStatus(token, taskId) {
  const options = {
    hostname: 'open.docmee.cn',
    path: `/api/ppt/v2/getTask?id=${taskId}`,
    method: 'GET',
    headers: {
      'token': token
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            resolve(result);
          } else {
            reject(new Error(result.message || '获取任务状态失败'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 下载文件
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      const file = fs.createWriteStream(outputPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

module.exports = { generatePPT, downloadPPT };
