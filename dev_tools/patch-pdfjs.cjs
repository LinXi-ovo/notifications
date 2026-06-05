/**
 * 修补 pdfjs-dist，注释掉跨域检查
 *
 * PDF.js 默认对跨域 PDF 请求进行 origin 校验，
 * 当 PDF 托管在 COS 等跨域存储服务时会抛出
 * "Expected range response-origin ... to match ..."
 *
 * 修补后将 ensureResponseOrigin 的 throw 注释掉，
 * 允许跨域加载 PDF（配合 CORS 头使用）。
 *
 * 此脚本通过 postinstall 钩子自动运行。
 */

const fs = require('fs')
const path = require('path')

const targets = [
  'node_modules/pdfjs-dist/build/pdf.mjs',
  'node_modules/pdfjs-dist/legacy/build/pdf.mjs',
]

const ORIG = `function ensureResponseOrigin(rangeOrigin, origin) {
  if (rangeOrigin !== origin) {
    throw new Error(\`Expected range response-origin "\${rangeOrigin}" to match "\${origin}".\`);
  }
}`

const PATCHED = `function ensureResponseOrigin(rangeOrigin, origin) {
  // if (rangeOrigin !== origin) {
  //   throw new Error(\`Expected range response-origin "\${rangeOrigin}" to match "\${origin}".\`);
  // }
}`

const projectRoot = path.resolve(__dirname, '..')

for (const rel of targets) {
  const file = path.join(projectRoot, rel)
  if (!fs.existsSync(file)) {
    console.log(`[patch-pdfjs] 跳过（不存在）: ${rel}`)
    continue
  }
  const content = fs.readFileSync(file, 'utf-8')
  if (!content.includes('ensureResponseOrigin')) {
    console.log(`[patch-pdfjs] 跳过（无 ensureResponseOrigin）: ${rel}`)
    continue
  }
  if (content.includes('// if (rangeOrigin !== origin)')) {
    console.log(`[patch-pdfjs] 已修补，跳过: ${rel}`)
    continue
  }
  const patched = content.replace(ORIG, PATCHED)
  fs.writeFileSync(file, patched, 'utf-8')
  console.log(`[patch-pdfjs] ✅ 已修补: ${rel}`)
}
