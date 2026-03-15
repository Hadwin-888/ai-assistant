const axios = require('axios');

class MiniMaxService {
  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY;
    this.baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';

    // 检查 API Key 是否配置
    if (!this.apiKey) {
      console.warn('警告: MINIMAX_API_KEY 未配置，AI 功能将不可用');
    }
  }

  // 检查服务是否可用
  isAvailable() {
    return !!this.apiKey;
  }

  // 抛出错误如果服务不可用
  checkAvailable() {
    if (!this.apiKey) {
      throw new Error('AI服务未配置，请设置 MINIMAX_API_KEY 环境变量');
    }
  }

  async chat(prompt, systemPrompt = '你是一个专业的AI助手。') {
    this.checkAvailable();

    try {
      const response = await axios.post(
        `${this.baseUrl}/text/chatcompletion_v2`,
        {
          model: 'abab6.5s-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 8192
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('MiniMax API Error:', error.response?.data || error.message);
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
  }

  // 合同审核
  async reviewContract(contractText) {
    const prompt = `请审核以下合同，识别潜在风险点并给出建议：

${contractText}

请从以下维度进行分析：
1. 合同主体资格
2. 权利义务条款
3. 违约责任
4. 争议解决
5. 其他风险提示

请用中文回复，结构化输出。`;

    return this.chat(prompt, '你是一位专业的法律顾问，擅长合同审核和风险评估。');
  }

  // 数据对比
  async compareData(data1, data2, type = 'excel') {
    const prompt = `请对比以下两组数据，找出差异：

【第一组数据】
${data1}

【第二组数据】
${data2}

请分析：
1. 差异点有哪些
2. 差异原因分析
3. 建议的处理方式

请用中文回复，结构化输出。`;

    return this.chat(prompt, '你是一位数据分析师，擅长数据对比和分析。');
  }

  // 生成PPT大纲
  async generatePPTOutline(topic, pages = 10) {
    const prompt = `请为"${topic}"生成一个${pages}页的PPT大纲。

请返回JSON格式：
{
  "title": "PPT标题",
  "slides": [
    {"page": 1, "title": "页面标题", "content": ["要点1", "要点2", "要点3"]},
    ...
  ]
}`;

    return this.chat(prompt, '你是一位PPT制作专家，擅长生成结构化的演示文稿大纲。');
  }
}

module.exports = new MiniMaxService();
