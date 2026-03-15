const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const minimaxService = require('../services/minimax');
const fileParser = require('../services/fileParser');
const { generatePPT, downloadPPT } = require('../services/pptGenerator');

const router = express.Router();

// 输入验证常量
const MAX_TEXT_LENGTH = 500000; // 50万字符
const MAX_MESSAGE_LENGTH = 10000; // 1万字符
const MAX_TOPIC_LENGTH = 500; // 500字符
const MAX_PAGES = 50;
const MIN_PAGES = 1;

// 验证字符串输入
function validateString(value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (!value || typeof value !== 'string') {
    return `${fieldName}不能为空`;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${fieldName}不能为空`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldName}长度不能超过${maxLength}字符`;
  }
  return null;
}

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
  fileFilter: (req, file, cb) => {
    // 允许的扩展名
    const allowedExt = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
    // 允许的 MIME 类型
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // 检查扩展名
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`不支持的文件类型: ${ext}`));
    }

    // 检查 MIME 类型（如果文件有 MIME 信息）
    if (mime && mime !== 'application/octet-stream') {
      if (!allowedMimes.some(allowed => mime.includes(allowed) || allowed.includes(mime))) {
        return cb(new Error(`文件类型不匹配: ${mime}`));
      }
    }

    cb(null, true);
  }
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 合同审核 - 文本直接输入
router.post('/contract/review-text', async (req, res) => {
  try {
    const { text } = req.body;

    // 验证输入
    const validationError = validateString(text, '合同文本', MAX_TEXT_LENGTH);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await minimaxService.reviewContract(text.trim());
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 合同审核 - 文件上传
router.post('/contract/review-file', upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    filePath = req.file.path;
    const text = await fileParser.parseFile(filePath);
    const result = await minimaxService.reviewContract(text);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // 清理上传文件（异步，不阻塞响应）
    if (filePath) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('文件清理失败:', err.message);
      });
    }
  }
});

// 数据对比 - 文本输入
router.post('/data/compare-text', async (req, res) => {
  try {
    const { data1, data2 } = req.body;

    // 验证输入
    const error1 = validateString(data1, '第一组数据', MAX_TEXT_LENGTH);
    if (error1) return res.status(400).json({ error: error1 });

    const error2 = validateString(data2, '第二组数据', MAX_TEXT_LENGTH);
    if (error2) return res.status(400).json({ error: error2 });

    const result = await minimaxService.compareData(data1.trim(), data2.trim());
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 数据对比 - 文件上传（两个文件）
router.post('/data/compare-files', upload.array('files', 2), async (req, res) => {
  const filePaths = [];
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: '请上传两个文件进行对比' });
    }

    filePaths.push(req.files[0].path, req.files[1].path);
    const text1 = await fileParser.parseFile(req.files[0].path);
    const text2 = await fileParser.parseFile(req.files[1].path);

    const result = await minimaxService.compareData(text1, text2);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // 清理上传文件（异步，不阻塞响应）
    filePaths.forEach(f => {
      fs.unlink(f, (err) => {
        if (err) console.error('文件清理失败:', err.message);
      });
    });
  }
});

// 生成PPT - 使用文多多 AiPPT API (支持文件上传)
router.post('/ppt/generate', upload.single('file'), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const { topic, pages, outline, scene, audience, lang, prompt, style } = req.body;

    // 验证主题（如果提供了文件，则主题可以为空）
    if (!req.file && !topic) {
      return res.status(400).json({ error: '请提供PPT主题或上传参考文档' });
    }

    // 处理上传的文件
    if (req.file) {
      uploadedFilePath = req.file.path;
      console.log('已上传文件:', req.file.originalname, '大小:', req.file.size);
    }

    // 映射页数到篇幅长度
    let length = 'medium';
    if (pages) {
      const pageNum = parseInt(pages);
      if (pageNum <= 15) {
        length = 'short';
      } else if (pageNum <= 25) {
        length = 'medium';
      } else {
        length = 'long';
      }
    }

    // 生成PPT文件
    const outputDir = path.join(__dirname, '../../outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `ppt-${Date.now()}.pptx`;
    const outputPath = path.join(outputDir, filename);

    // 构建生成选项
    const pptOptions = {
      title: topic ? topic.trim() : 'PPT演示',
      length,
      scene: scene || '通用场景',
      audience: audience || '大众',
      lang: lang || 'zh',
      prompt: prompt || outline || style || '',
      outputPath,
      filePath: uploadedFilePath
    };

    console.log('开始生成PPT，选项:', JSON.stringify(pptOptions));

    // 调用文多多 API 生成 PPT
    const result = await generatePPT(pptOptions);

    // 返回结果
    res.json({
      success: true,
      result: {
        taskId: result.taskId,
        filename,
        url: `/outputs/${filename}`,
        message: result.message
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // 清理上传文件
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath, (err) => {
        if (err) console.error('清理上传文件失败:', err.message);
      });
    }
  }
});

// 下载PPT - 防止路径遍历攻击
router.get('/ppt/download/:filename', (req, res) => {
  const filename = req.params.filename;

  // 验证文件名：只允许字母、数字、下划线、连字符和点
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return res.status(400).json({ error: '无效的文件名' });
  }

  // 禁止路径遍历
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: '无效的文件名' });
  }

  const filePath = path.join(__dirname, '../../outputs', filename);

  // 验证文件路径在允许的目录内
  const outputsDir = path.resolve(__dirname, '../../outputs');
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(outputsDir)) {
    return res.status(400).json({ error: '无效的文件路径' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  res.download(filePath);
});

// AI对话
router.post('/chat', async (req, res) => {
  try {
    const { message, systemPrompt } = req.body;

    // 验证消息
    const msgError = validateString(message, '消息内容', MAX_MESSAGE_LENGTH);
    if (msgError) {
      return res.status(400).json({ error: msgError });
    }

    // 验证 systemPrompt（如果提供）
    if (systemPrompt) {
      const spError = validateString(systemPrompt, '系统提示', MAX_MESSAGE_LENGTH);
      if (spError) {
        return res.status(400).json({ error: spError });
      }
    }

    const result = await minimaxService.chat(message.trim(), systemPrompt?.trim());
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
