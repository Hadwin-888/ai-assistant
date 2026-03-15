const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const PptxGenJS = require('pptxgenjs');

// 文多多 API 配置
const DOCMEE_API_KEY = process.env.DOCMEE_API_KEY || 'ak_sJJCB5EppsrFr8pfuC';

/**
 * 使用本地 pptxgenjs 生成 PPT（备用方案）
 */
function generateLocalPPT(options) {
  const { title, outputPath, scene, audience, length = 'medium' } = options;

  // 根据篇幅长度确定页数
  let pageCount = 10;
  if (length === 'short') pageCount = 8;
  else if (length === 'medium') pageCount = 15;
  else if (length === 'long') pageCount = 20;

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  // 标题页
  let slide = pres.addSlide();
  slide.background = { color: '1a1a2e' };
  slide.addText(title || 'PPT演示', {
    x: 1, y: 2.5, w: '80%', h: 1,
    fontSize: 44, color: 'ffffff', bold: true, align: 'center'
  });
  slide.addText(`${scene || '演示文稿'} | ${audience || '大众'}`, {
    x: 1, y: 4, w: '80%', h: 0.5,
    fontSize: 18, color: 'aaaaaa', align: 'center'
  });

  // 目录页
  slide = pres.addSlide();
  slide.background = { color: 'ffffff' };
  slide.addText('目录', { x: 0.5, y: 0.5, w: '90%', h: 0.8, fontSize: 32, color: '1a1a2e', bold: true });
  const tocItems = [
    '项目背景', '市场分析', '产品介绍', '竞争优势',
    '商业模式', '团队介绍', '发展规划', '财务预测',
    '风险评估', '投资回报', '合作方式', '联系方式'
  ];
  const itemsPerCol = Math.ceil(tocItems.length / 2);
  tocItems.forEach((item, i) => {
    const col = i < itemsPerCol ? 0 : 1;
    const row = i % itemsPerCol;
    slide.addText(`${i + 1}. ${item}`, {
      x: 0.5 + col * 4, y: 1.5 + row * 0.6, w: 3.5, h: 0.5,
      fontSize: 16, color: '333333'
    });
  });

  // 生成内容页
  const sections = [
    { title: '项目背景', content: '介绍项目的起源、背景和核心理念' },
    { title: '市场分析', content: '分析目标市场规模、增长趋势和机会' },
    { title: '产品介绍', content: '详细展示产品功能、特点和优势' },
    { title: '竞争优势', content: '对比竞品，突出差异化优势' },
    { title: '商业模式', content: '说明盈利模式和收入来源' },
    { title: '团队介绍', content: '展示核心团队成员和背景' },
    { title: '发展规划', content: '短期和长期发展计划' },
    { title: '财务预测', content: '未来3-5年财务预期' },
    { title: '风险评估', content: '可能面临的风险和应对措施' },
    { title: '投资回报', content: '投资者的回报预期' },
    { title: '合作方式', content: '合作模式和条件' },
    { title: '联系我们', content: '联系方式和下一步计划' }
  ];

  // 根据pageCount选择显示的内容页数
  const numContentPages = Math.min(pageCount - 4, sections.length);
  for (let i = 0; i < numContentPages; i++) {
    slide = pres.addSlide();
    slide.background = { color: 'ffffff' };

    // 左侧标题
    slide.addText(sections[i].title, {
      x: 0.5, y: 0.5, w: '40%', h: 0.8,
      fontSize: 28, color: '1a1a2e', bold: true
    });

    // 右侧内容
    slide.addText(sections[i].content, {
      x: 0.5, y: 1.8, w: '90%', h: 3,
      fontSize: 18, color: '333333'
    });

    // 页码
    slide.addText(`${i + 2}/${numContentPages + 3}`, {
      x: 8, y: 5, w: 1, h: 0.3,
      fontSize: 12, color: '999999', align: 'right'
    });
  }

  // 结尾页
  slide = pres.addSlide();
  slide.background = { color: '1a1a2e' };
  slide.addText('谢谢观看', {
    x: 1, y: 2.5, w: '80%', h: 1,
    fontSize: 44, color: 'ffffff', bold: true, align: 'center'
  });
  slide.addText('AI 助手生成', {
    x: 1, y: 4, w: '80%', h: 0.5,
    fontSize: 14, color: 'aaaaaa', align: 'center'
  });

  pres.writeFile({ fileName: outputPath });
  console.log(`本地 PPT 生成成功: ${outputPath}, 共 ${pageCount} 页`);
  return outputPath;
}

/**
 * 上传文件到文多多并获取文件URL
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
    req.write(JSON.stringify({ uid, limit, timeOfHours }));
    req.end();
  });
}

/**
 * 使用文多多 AI 生成 PPT
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

  // 尝试使用文多多 API
  try {
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
      path: '/api/ppt/v2/createTask?type=1',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      }
    };

    console.log('正在创建 PPT 生成任务...');

    const requestBody = {
      id: taskId,
      outline: title || prompt || 'PPT演示'
    };

    console.log('请求体:', JSON.stringify(requestBody));

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
    const finalOutputPath = await downloadPPT(token, taskId, outputPath);
    console.log('PPT 生成并下载成功:', finalOutputPath);
    return {
      taskId,
      outputPath: finalOutputPath,
      message: 'PPT 生成成功'
    };
  } catch (error) {
    console.error('文多多 API 调用失败:', error.message);
    console.log('使用本地 pptxgenjs 生成 PPT...');

    // 备用：使用本地 pptxgenjs 生成
    const localPath = generateLocalPPT({
      title: title || prompt || 'PPT演示',
      outputPath,
      scene,
      audience,
      length
    });

    return {
      taskId: 'local',
      outputPath: localPath,
      message: 'PPT 生成成功（本地生成）'
    };
  }
}

/**
 * 获取 PPT 生成状态并下载
 */
async function downloadPPT(token, taskId, outputPath) {
  const maxRetries = 60;
  const retryInterval = 3000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await getTaskStatus(token, taskId);
      console.log(`第 ${i + 1} 次查询任务状态:`, status.status);

      if (status.status === 'success' || status.status === 'completed') {
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
 */
async function getTaskStatus(token, taskId) {
  const options = {
    hostname: 'open.docmee.cn',
    path: `/api/ppt/v2/getTask?id=${taskId}`,
    method: 'GET',
    headers: { 'token': token }
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
