const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

async function generatePPT(outline, outputPath) {
  const pres = new PptxGenJS();
  
  // 设置背景色
  const bgColor = '1F4E79';
  const textColor = 'FFFFFF';
  
  // 解析大纲JSON
  let pptData;
  try {
    pptData = JSON.parse(outline);
  } catch (e) {
    // 如果不是JSON，尝试提取关键信息
    pptData = {
      title: 'AI生成PPT',
      slides: [{ page: 1, title: '内容', content: [outline] }]
    };
  }

  // 封面页
  const slide1 = pres.addSlide();
  slide1.background = { color: bgColor };
  slide1.addText(pptData.title || '演示文稿', {
    x: 1, y: 2, w: '80%', h: 1,
    fontSize: 44, color: textColor, bold: true, align: 'center'
  });
  slide1.addText('AI智能生成', {
    x: 1, y: 3.5, w: '80%', h: 0.5,
    fontSize: 18, color: textColor, align: 'center'
  });

  // 内容页
  if (pptData.slides && pptData.slides.length > 0) {
    pptData.slides.forEach((slide, index) => {
      const s = pres.addSlide();
      
      // 标题栏
      s.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.8,
        fill: { color: bgColor }
      });
      s.addText(slide.title || `第${slide.page}页`, {
        x: 0.5, y: 0.15, w: '90%', h: 0.5,
        fontSize: 24, color: textColor, bold: true
      });
      
      // 内容
      const contentLines = Array.isArray(slide.content) 
        ? slide.content 
        : [slide.content];
      
      s.addText(contentLines.map((line, i) => 
        `${i + 1}. ${line}`
      ).join('\n'), {
        x: 0.5, y: 1.2, w: '90%', h: 4,
        fontSize: 18, color: '333333'
      });
    });
  }

  // 保存
  await pres.writeFile(outputPath);
  return outputPath;
}

module.exports = { generatePPT };
