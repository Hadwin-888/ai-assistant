const fs = require('fs');
const path = require('path');

// PDF解析
async function parsePDF(filePath) {
  const pdf = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

// Word解析
async function parseWord(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

// Excel解析
async function parseExcel(filePath) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  let result = '';
  workbook.eachSheet((worksheet) => {
    result += `\n=== ${worksheet.name} ===\n`;
    worksheet.eachRow((row) => {
      result += row.values.join(' | ') + '\n';
    });
  });
  return result;
}

// 根据文件类型解析
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return parsePDF(filePath);
    case '.doc':
    case '.docx':
      return parseWord(filePath);
    case '.xls':
    case '.xlsx':
      return parseExcel(filePath);
    case '.txt':
      return fs.readFileSync(filePath, 'utf-8');
    default:
      throw new Error(`不支持的文件类型: ${ext}`);
  }
}

module.exports = {
  parsePDF,
  parseWord,
  parseExcel,
  parseFile
};
