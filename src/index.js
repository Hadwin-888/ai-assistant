require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 支持反向代理的 base path（用于 /ai-assistant/ 等路径部署）
const BASE_PATH = process.env.BASE_PATH || '';

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件 - 使用 base path
app.use(BASE_PATH + '/', express.static(path.join(__dirname, '../public')));
app.use(BASE_PATH + '/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(BASE_PATH + '/outputs', express.static(path.join(__dirname, '../outputs')));

// API路由 - 使用 base path
app.use(BASE_PATH + '/api', apiRoutes);

// 首页
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI助手 - 合同审核 | 数据对比 | PPT生成</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { 
          color: white; 
          text-align: center; 
          margin-bottom: 10px;
          font-size: 2.5em;
        }
        .subtitle { 
          color: rgba(255,255,255,0.8); 
          text-align: center; 
          margin-bottom: 40px;
        }
        .cards { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 50px rgba(0,0,0,0.3);
        }
        .card h2 { 
          color: #333; 
          font-size: 1.3em;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card p { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .card input, .card textarea, .card select {
          width: 100%;
          padding: 12px;
          border: 2px solid #eee;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 10px;
          transition: border-color 0.3s;
        }
        .card input:focus, .card textarea:focus, .card select:focus {
          outline: none;
          border-color: #667eea;
        }
        .card textarea { min-height: 100px; resize: vertical; }
        .card button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          width: 100%;
          transition: opacity 0.3s;
        }
        .card button:hover { opacity: 0.9; }
        .card button:disabled { opacity: 0.5; cursor: not-allowed; }
        .result {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          display: none;
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-size: 13px;
          line-height: 1.6;
        }
        .result.show { display: block; }
        .loading { color: #667eea; text-align: center; display: none; }
        .loading.show { display: block; }
        .file-upload {
          border: 2px dashed #ddd;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .file-upload:hover { border-color: #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 AI助手</h1>
        <p class="subtitle">合同审核 · 数据对比 · PPT生成</p>
        
        <div class="cards">
          <!-- 合同审核 -->
          <div class="card">
            <h2>📄 合同审核</h2>
            <p>上传合同文档或输入合同内容，AI智能识别风险点</p>
            <input type="file" id="contractFile" accept=".pdf,.doc,.docx,.txt">
            <textarea id="contractText" placeholder="或直接输入合同内容..."></textarea>
            <button onclick="reviewContract()">开始审核</button>
            <div class="loading" id="contractLoading">处理中...</div>
            <div class="result" id="contractResult"></div>
          </div>
          
          <!-- 数据对比 -->
          <div class="card">
            <h2>📊 数据对比</h2>
            <p>对比两组数据，找出差异并分析原因</p>
            <input type="file" id="dataFile1" accept=".xls,.xlsx,.pdf,.txt" placeholder="选择第一个文件">
            <input type="file" id="dataFile2" accept=".xls,.xlsx,.pdf,.txt" placeholder="选择第二个文件">
            <textarea id="dataText1" placeholder="或输入第一组数据..."></textarea>
            <textarea id="dataText2" placeholder="或输入第二组数据..."></textarea>
            <button onclick="compareData()">开始对比</button>
            <div class="loading" id="dataLoading">处理中...</div>
            <div class="result" id="dataResult"></div>
          </div>
          
          <!-- PPT生成 -->
          <div class="card">
            <h2>📑 PPT生成</h2>
            <p>上传文档或输入主题，AI自动生成演示文稿</p>
            <input type="file" id="pptFile" accept=".pdf,.doc,.docx,.txt">
            <input type="text" id="pptTopic" placeholder="输入PPT主题（可选）">
            <select id="pptScene">
              <option value="通用场景">通用场景</option>
              <option value="商业计划">商业计划</option>
              <option value="工作汇报">工作汇报</option>
              <option value="教育培训">教育培训</option>
              <option value="产品发布">产品发布</option>
              <option value="项目路演">项目路演</option>
            </select>
            <select id="pptAudience">
              <option value="大众">大众</option>
              <option value="企业高管">企业高管</option>
              <option value="专业技术人员">专业</option>
              <option value="学生">学生</option>
              <option value="投资者">投资者</option>
            </select>
            <select id="pptLang">
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="zh-Hant">繁体中文</option>
              <option value="ja">日本語</option>
            </select>
            <input type="number" id="pptPages" placeholder="页数" value="10">
            <input type="text" id="pptStyle" placeholder="风格要求（如：简约、时尚、商务）">
            <button onclick="generatePPT()">生成PPT</button>
            <div class="loading" id="pptLoading">处理中...（可能需要30秒-1分钟）</div>
            <div class="result" id="pptResult"></div>
          </div>
          
          <!-- AI对话 -->
          <div class="card">
            <h2>💬 AI对话</h2>
            <p>与AI进行自由对话</p>
            <textarea id="chatMessage" placeholder="输入您的问题..."></textarea>
            <button onclick="chat()">发送</button>
            <div class="loading" id="chatLoading">处理中...</div>
            <div class="result" id="chatResult"></div>
          </div>
        </div>
      </div>
      
      <script>
        // 合同审核
        async function reviewContract() {
          const file = document.getElementById('contractFile').files[0];
          const text = document.getElementById('contractText').value;
          const resultEl = document.getElementById('contractResult');
          const loadingEl = document.getElementById('contractLoading');
          
          if (!file && !text) {
            alert('请上传文件或输入内容');
            return;
          }
          
          loadingEl.classList.add('show');
          resultEl.classList.remove('show');
          
          try {
            let result;
            if (file) {
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch('/api/contract/review-file', {
                method: 'POST',
                body: formData
              });
              const data = await res.json();
              result = data.result;
            } else {
              const res = await fetch('/api/contract/review-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
              });
              const data = await res.json();
              result = data.result;
            }
            
            resultEl.textContent = result;
            resultEl.classList.add('show');
          } catch (err) {
            resultEl.textContent = '错误: ' + err.message;
            resultEl.classList.add('show');
          }
          
          loadingEl.classList.remove('show');
        }
        
        // 数据对比
        async function compareData() {
          const file1 = document.getElementById('dataFile1').files[0];
          const file2 = document.getElementById('dataFile2').files[0];
          const text1 = document.getElementById('dataText1').value;
          const text2 = document.getElementById('dataText2').value;
          const resultEl = document.getElementById('dataResult');
          const loadingEl = document.getElementById('dataLoading');
          
          if (!file1 && !text1) { alert('请提供第一组数据'); return; }
          if (!file2 && !text2) { alert('请提供第二组数据'); return; }
          
          loadingEl.classList.add('show');
          resultEl.classList.remove('show');
          
          try {
            let result;
            if (file1 && file2) {
              const formData = new FormData();
              formData.append('files', file1);
              formData.append('files', file2);
              const res = await fetch('/api/data/compare-files', {
                method: 'POST',
                body: formData
              });
              const data = await res.json();
              result = data.result;
            } else {
              const res = await fetch('/api/data/compare-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data1: text1, data2: text2 })
              });
              const data = await res.json();
              result = data.result;
            }
            
            resultEl.textContent = result;
            resultEl.classList.add('show');
          } catch (err) {
            resultEl.textContent = '错误: ' + err.message;
            resultEl.classList.add('show');
          }
          
          loadingEl.classList.remove('show');
        }
        
        // PPT生成
        async function generatePPT() {
          const topic = document.getElementById('pptTopic').value;
          const pages = parseInt(document.getElementById('pptPages').value) || 10;
          const scene = document.getElementById('pptScene').value;
          const audience = document.getElementById('pptAudience').value;
          const lang = document.getElementById('pptLang').value;
          const style = document.getElementById('pptStyle').value;
          const fileInput = document.getElementById('pptFile');
          const file = fileInput.files[0];
          const resultEl = document.getElementById('pptResult');
          const loadingEl = document.getElementById('pptLoading');

          // 验证：需要有主题或文件
          if (!topic && !file) {
            alert('请输入PPT主题或上传参考文档');
            return;
          }

          loadingEl.classList.add('show');
          resultEl.classList.remove('show');

          try {
            const formData = new FormData();
            if (topic) formData.append('topic', topic);
            formData.append('pages', pages);
            formData.append('scene', scene);
            formData.append('audience', audience);
            formData.append('lang', lang);
            if (style) formData.append('style', style);
            if (file) formData.append('file', file);

            const res = await fetch('/api/ppt/generate', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();

            if (data.success) {
              resultEl.innerHTML = 'PPT生成成功！<br><a href="' + data.result.url + '" download>点击下载</a>';
            } else {
              resultEl.textContent = '错误: ' + data.error;
            }
            resultEl.classList.add('show');
          } catch (err) {
            resultEl.textContent = '错误: ' + err.message;
            resultEl.classList.add('show');
          }

          loadingEl.classList.remove('show');
        }
        
        // AI对话
        async function chat() {
          const message = document.getElementById('chatMessage').value;
          const resultEl = document.getElementById('chatResult');
          const loadingEl = document.getElementById('chatLoading');
          
          if (!message) { alert('请输入消息'); return; }
          
          loadingEl.classList.add('show');
          resultEl.classList.remove('show');
          
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message })
            });
            const data = await res.json();
            
            resultEl.textContent = data.result;
            resultEl.classList.add('show');
          } catch (err) {
            resultEl.textContent = '错误: ' + err.message;
            resultEl.classList.add('show');
          }
          
          loadingEl.classList.remove('show');
        }
      </script>
    </body>
    </html>
  `);
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // 生产环境不泄露详细错误信息
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction ? '服务器内部错误' : err.message;

  res.status(500).json({ error: errorMessage });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 AI助手服务已启动
   http://localhost:${PORT}
  `);
});

module.exports = app;
