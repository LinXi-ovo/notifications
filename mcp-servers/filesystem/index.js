#!/usr/bin/env node
/**
 * filesystem-mcp — 自定义文件系统 MCP Server
 *
 * 为 Claude Code 提供本地文件操作能力。
 * 用法:
 *   node index.js <允许的目录1> [允许的目录2] ...
 *
 * 未传参时只允许当前工作目录。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// ─── 安全沙箱 ──────────────────────────────────────────────

const ALLOWED_DIRS = process.argv.slice(2).map((p) => path.resolve(p));
if (ALLOWED_DIRS.length === 0) ALLOWED_DIRS.push(process.cwd());

function isPathAllowed(targetPath) {
  const resolved = path.resolve(targetPath);
  for (const dir of ALLOWED_DIRS) {
    const rel = path.relative(dir, resolved);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) return true;
  }
  return false;
}

function requireAllowed(targetPath) {
  if (!isPathAllowed(targetPath)) {
    throw new Error(
      `❌ 访问被拒绝：路径 "${targetPath}" 不在允许目录 [${ALLOWED_DIRS.join(", ")}] 中`
    );
  }
}

function safePath(p) {
  const normal = path.normalize(p).replace(/\\/g, "/");
  return path.resolve(normal);
}

// ─── MCP Server ────────────────────────────────────────────

const server = new Server(
  { name: "filesystem-mcp", version: "1.2.0" },
  { capabilities: { tools: {} } }
);

// ─── 工具定义 ──────────────────────────────────────────────

const TOOLS = [
  {
    name: "read_file",
    description: "读取文件内容，返回文本。适用于代码、配置文件、文档等。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "要读取的文件路径（绝对路径）" },
        encoding: { type: "string", description: "编码，默认 utf-8" },
        limit: { type: "number", description: "最多读取行数（可选）" },
        offset: { type: "number", description: "从第几行开始读，0-based（可选）" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description: "写入文件（覆盖模式）。自动创建父目录。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径（绝对路径）" },
        content: { type: "string", description: "文件内容" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "精确替换文件中的字符串。用于部分修改无需重写整个文件。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径" },
        old_string: { type: "string", description: "要替换的旧文本（必须精确匹配，唯一）" },
        new_string: { type: "string", description: "替换后的新文本" },
      },
      required: ["file_path", "old_string", "new_string"],
    },
  },
  {
    name: "append_file",
    description: "追加内容到文件末尾。自动创建父目录。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径" },
        content: { type: "string", description: "要追加的内容" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "prepend_file",
    description: "在文件开头插入内容。自动创建父目录。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径" },
        content: { type: "string", description: "要插入的内容" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "列出目录内容，返回每个条目的名称、类型、大小和时间。",
    inputSchema: {
      type: "object",
      properties: {
        dir_path: { type: "string", description: "目录路径" },
        recursive: { type: "boolean", description: "是否递归列出（默认 false）" },
        depth: { type: "number", description: "递归深度（recursive=true 时有效，默认无限）" },
      },
      required: ["dir_path"],
    },
  },
  {
    name: "file_info",
    description: "获取文件或目录的详细信息（大小、时间、权限等）。",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件或目录路径" },
      },
      required: ["path"],
    },
  },
  {
    name: "create_directory",
    description: "创建目录（类似 mkdir -p），支持多级目录。",
    inputSchema: {
      type: "object",
      properties: {
        dir_path: { type: "string", description: "要创建的目录路径" },
      },
      required: ["dir_path"],
    },
  },
  {
    name: "delete_path",
    description: "删除文件或目录。recursive=true 时递归删除（谨慎！）。",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "要删除的文件或目录路径" },
        recursive: { type: "boolean", description: "是否递归删除目录及其内容（默认 false）" },
      },
      required: ["path"],
    },
  },
  {
    name: "copy_path",
    description: "复制文件或目录（递归复制）。自动创建目标父目录。",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "源路径" },
        destination: { type: "string", description: "目标路径" },
      },
      required: ["source", "destination"],
    },
  },
  {
    name: "move_path",
    description: "移动或重命名文件/目录。自动创建目标父目录。",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "源路径" },
        destination: { type: "string", description: "目标路径" },
      },
      required: ["source", "destination"],
    },
  },
  {
    name: "search_files",
    description: "按 glob 模式搜索文件。例如：**/*.vue, src/**/*.js, **/{*.js,*.ts}",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "glob 搜索模式" },
        root: { type: "string", description: "搜索根目录（默认当前工作目录）" },
        absolute: { type: "boolean", description: "是否返回绝对路径（默认 true）" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "search_text",
    description: "在文件中搜索文本（grep 风格）。支持正则。",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "搜索模式（正则表达式字符串）" },
        root: { type: "string", description: "搜索根目录" },
        glob_filter: { type: "string", description: "文件 glob 过滤，如 *.js, *.{vue,js}" },
        max_results: { type: "number", description: "最大结果数（默认 100）" },
        include_binary: { type: "boolean", description: "是否搜索二进制文件（默认 false）" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "read_json",
    description: "读取并解析 JSON 文件，返回格式化对象。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "JSON 文件路径" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_json",
    description: "以格式化的 JSON 写入文件。自动创建父目录。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "目标文件路径" },
        data: { type: "object", description: "要写入的数据对象" },
        minify: { type: "boolean", description: "是否压缩（不格式化，默认 false）" },
      },
      required: ["file_path", "data"],
    },
  },
  {
    name: "file_hash",
    description: "计算文件哈希值（MD5/SHA1/SHA256）。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径" },
        algorithm: {
          type: "string",
          description: "哈希算法（md5 / sha1 / sha256），默认 sha256",
          enum: ["md5", "sha1", "sha256"],
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "ensure_directory",
    description: "确保目录存在（类似 mkdir -p），返回目录路径。",
    inputSchema: {
      type: "object",
      properties: {
        dir_path: { type: "string", description: "目录路径" },
      },
      required: ["dir_path"],
    },
  },
  {
    name: "is_binary_file",
    description: "检查文件是否为二进制文件（通过扩展名和内容检测）。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "文件路径" },
      },
      required: ["file_path"],
    },
  },
];

// ─── 帮助函数 ──────────────────────────────────────────────

// 常见文本文件扩展名
const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".js", ".ts", ".jsx", ".tsx", ".vue", ".json", ".xml",
  ".html", ".htm", ".css", ".scss", ".less", ".sass", ".yaml", ".yml",
  ".toml", ".ini", ".cfg", ".conf", ".sh", ".bat", ".cmd", ".ps1",
  ".env", ".gitignore", ".gitattributes", ".editorconfig", ".npmrc",
  ".prettierrc", ".eslintrc", ".babelrc", ".svelte", ".astro", ".svg",
  ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".rs", ".go", ".rb",
  ".php", ".swift", ".kt", ".scala", ".ex", ".exs", ".cr", ".zig",
  ".sql", ".graphql", ".gql", ".proto", ".makefile", ".cmake",
  ".lock", ".patch", ".diff", ".log",
]);

function looksLikeTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (base.startsWith(".")) return true;
  if (/^(makefile|dockerfile|compose\.ya?ml)$/i.test(base)) return true;
  return false;
}

async function isBinaryContent(filePath) {
  try {
    const fd = await fs.open(filePath, "r");
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fd.read(buf, 0, 8192, 0);
    await fd.close();
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function isFileText(filePath) {
  if (!looksLikeTextFile(filePath)) {
    // 无扩展名文件，检查前 8KB
    return !(await isBinaryContent(filePath));
  }
  return true;
}

// 递归遍历目录（带深度限制）
async function* walkDir(dir, maxDepth = Infinity, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      const stat = await fs.stat(full);
      const info = {
        name: entry.name,
        fullPath: path.resolve(full),
        isDirectory: entry.isDirectory(),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        atime: stat.atime.toISOString(),
        birthtime: stat.birthtime.toISOString(),
      };
      yield info;
      if (entry.isDirectory()) {
        yield* walkDir(full, maxDepth, currentDepth + 1);
      }
    } catch {
      // 跳过权限不足的条目
    }
  }
}

// 简单的 glob 匹配（用 minimatch 风格）
function globMatch(name, pattern) {
  // 把 glob pattern 转成正则
  let regexStr = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (i + 1 < pattern.length && pattern[i + 1] === "*") {
        // ** — 匹配任意层级
        if (i + 2 < pattern.length && (pattern[i + 2] === "/" || pattern[i + 2] === "\\")) {
          regexStr += "(?:.+/)?";
          i += 3;
        } else {
          regexStr += ".*";
          i += 2;
        }
      } else {
        // * — 匹配单层
        regexStr += "[^/]*";
        i += 1;
      }
    } else if (ch === "?") {
      regexStr += "[^/]";
      i += 1;
    } else if (ch === "{") {
      const end = pattern.indexOf("}", i);
      if (end !== -1) {
        const parts = pattern.slice(i + 1, end).split(",");
        regexStr += "(?:" + parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")";
        i = end + 1;
      } else {
        regexStr += "\\{";
        i += 1;
      }
    } else if (ch === ".") {
      regexStr += "\\.";
      i += 1;
    } else {
      regexStr += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  const re = new RegExp("^" + regexStr + "$");
  return re.test(name);
}

// ─── 工具处理器 ────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ═══ 文件读写 ═══

      case "read_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        const stat = await fs.stat(fp);
        if (stat.isDirectory()) {
          throw new Error(`${fp} 是一个目录，请使用 list_directory`);
        }

        let content = await fs.readFile(fp, args.encoding || "utf-8");
        const lines = content.split("\n");

        if (args.offset !== undefined || args.limit !== undefined) {
          const offset = args.offset ?? 0;
          const limit = args.limit ?? lines.length;
          const sliced = lines.slice(offset, offset + limit);
          content = sliced.join("\n");
          if (offset + (args.limit ?? 0) < lines.length) {
            content += `\n\n--- 共 ${lines.length} 行，显示 ${offset}~${offset + sliced.length} 行 ---`;
          }
        } else if (lines.length > 2000) {
          content = lines.slice(0, 2000).join("\n");
          content += `\n\n--- 文件过长：共 ${lines.length} 行，仅显示前 2000 行（使用 offset/limit 参数读取更多）---`;
        }

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "write_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        await fs.mkdir(path.dirname(fp), { recursive: true });
        await fs.writeFile(fp, args.content, "utf-8");
        return {
          content: [{ type: "text", text: `✅ 已写入 ${path.resolve(fp)}` }],
        };
      }

      case "edit_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        const content = await fs.readFile(fp, "utf-8");
        if (!content.includes(args.old_string)) {
          // 模糊提示
          const context = args.old_string.length > 20
            ? args.old_string.slice(0, 20) + "..."
            : args.old_string;
          throw new Error(`未在 ${fp} 中找到匹配的文本："${context}"`);
        }
        if (content.split(args.old_string).length - 1 > 1) {
          throw new Error(`文本 "${args.old_string}" 在文件中出现多次，替换不明确`);
        }
        const newContent = content.replace(args.old_string, args.new_string);
        await fs.writeFile(fp, newContent, "utf-8");
        return {
          content: [{ type: "text", text: `✅ 已编辑 ${path.resolve(fp)}` }],
        };
      }

      case "append_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        await fs.mkdir(path.dirname(fp), { recursive: true });
        await fs.appendFile(fp, args.content, "utf-8");
        return {
          content: [{ type: "text", text: `✅ 已追加到 ${path.resolve(fp)}` }],
        };
      }

      case "prepend_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        await fs.mkdir(path.dirname(fp), { recursive: true });
        let existing = "";
        try {
          existing = await fs.readFile(fp, "utf-8");
        } catch {
          // 文件不存在
        }
        await fs.writeFile(fp, args.content + existing, "utf-8");
        return {
          content: [{ type: "text", text: `✅ 已前置插入到 ${path.resolve(fp)}` }],
        };
      }

      // ═══ 目录操作 ═══

      case "list_directory": {
        const dp = safePath(args.dir_path);
        requireAllowed(dp);
        const stat = await fs.stat(dp);
        if (!stat.isDirectory()) {
          throw new Error(`${dp} 不是目录`);
        }

        const entries = [];
        if (args.recursive) {
          for await (const entry of walkDir(dp, args.depth ?? Infinity)) {
            entries.push(entry);
          }
        } else {
          const items = await fs.readdir(dp, { withFileTypes: true });
          for (const item of items) {
            const full = path.join(dp, item.name);
            try {
              const s = await fs.stat(full);
              entries.push({
                name: item.name,
                fullPath: path.resolve(full),
                isDirectory: item.isDirectory(),
                size: s.size,
                mtime: s.mtime.toISOString(),
              });
            } catch {
              entries.push({
                name: item.name,
                fullPath: path.resolve(full),
                isDirectory: item.isDirectory(),
                size: 0,
                mtime: null,
              });
            }
          }
        }
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      }

      case "create_directory":
      case "ensure_directory": {
        const dp = safePath(args.dir_path);
        requireAllowed(dp);
        await fs.mkdir(dp, { recursive: true });
        return {
          content: [{ type: "text", text: `📁 ${path.resolve(dp)}` }],
        };
      }

      // ═══ 文件信息 ═══

      case "file_info": {
        const fp = safePath(args.path);
        requireAllowed(fp);
        const stat = await fs.stat(fp);
        const info = {
          path: path.resolve(fp),
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
          isSymbolicLink: stat.isSymbolicLink(),
          size: stat.size,
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
          accessed: stat.atime.toISOString(),
          permissions: stat.mode.toString(8).slice(-3),
          isText: stat.isFile() ? await isFileText(fp) : null,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        };
      }

      case "is_binary_file": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        const text = await isFileText(fp);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ path: path.resolve(fp), isText: text, isBinary: !text }),
          }],
        };
      }

      // ═══ 搜索 ═══

      case "search_files": {
        const root = args.root ? safePath(args.root) : process.cwd();
        requireAllowed(root);
        const pattern = args.pattern;
        const results = [];

        // 使用 Node 22+ 的 fs.glob
        try {
          const { glob: nodeGlob } = await import("node:fs");
          const { Glob } = await import("node:fs");
          // Node 22: 用 fs.glob
          const stream = fsSync.glob(pattern, {
            cwd: root,
            withFileTypes: true,
            absolute: args.absolute !== false,
          });
          for await (const entry of stream) {
            results.push(typeof entry === "string" ? entry : entry.fullpath);
          }
        } catch {
          // Fallback: 手动递归
          const walkOpts = {
            pattern: pattern,
            cwd: root,
          };
          const allEntries = [];
          for await (const entry of walkDir(root)) {
            if (globMatch(path.relative(root, entry.fullPath), pattern)) {
              allEntries.push(args.absolute !== false ? entry.fullPath : path.relative(root, entry.fullPath));
            }
          }
          results.push(...allEntries);
        }

        results.sort();
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "search_text": {
        const root = args.root ? safePath(args.root) : process.cwd();
        requireAllowed(root);
        const regex = new RegExp(args.pattern, "gmi");
        const maxResults = args.max_results ?? 100;
        const results = [];
        let totalMatches = 0;

        const globFilter = args.glob_filter || "**";

        // 筛选可搜索的文件
        for await (const entry of walkDir(root)) {
          if (entry.isDirectory) continue;
          if (totalMatches >= maxResults) break;

          // glob 过滤
          const relPath = path.relative(root, entry.fullPath);
          if (!globMatch(relPath, globFilter)) continue;

          // 跳过二进制
          if (!args.include_binary && !(await isFileText(entry.fullPath))) continue;

          try {
            const content = await fs.readFile(entry.fullPath, "utf-8");
            const matches = [];
            let m;
            while ((m = regex.exec(content)) !== null && matches.length < 20) {
              const lineNum = content.substring(0, m.index).split("\n").length;
              const start = Math.max(0, m.index - 40);
              const end = Math.min(content.length, m.index + m[0].length + 40);
              let context = content.slice(start, end).replace(/\n/g, "↵");
              if (start > 0) context = "..." + context;
              if (end < content.length) context = context + "...";

              matches.push({
                line: lineNum,
                match: m[0].length > 100 ? m[0].slice(0, 100) + "..." : m[0],
                context: context,
              });
              totalMatches++;
              if (totalMatches >= maxResults) break;
            }
            if (matches.length > 0) {
              results.push({
                file: path.resolve(entry.fullPath),
                matchCount: matches.length,
                matches: matches,
              });
            }
          } catch {
            // 跳过不可读文件
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ total: totalMatches, results }, null, 2) }],
        };
      }

      // ═══ JSON 操作 ═══

      case "read_json": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        const content = await fs.readFile(fp, "utf-8");
        const data = JSON.parse(content);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "write_json": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        await fs.mkdir(path.dirname(fp), { recursive: true });
        const json = args.minify
          ? JSON.stringify(args.data)
          : JSON.stringify(args.data, null, 2);
        await fs.writeFile(fp, json, "utf-8");
        return {
          content: [{ type: "text", text: `✅ 已写入 JSON ${path.resolve(fp)}` }],
        };
      }

      // ═══ 复制/移动/删除 ═══

      case "copy_path": {
        const src = safePath(args.source);
        const dst = safePath(args.destination);
        requireAllowed(src);
        requireAllowed(dst);
        await fs.mkdir(path.dirname(dst), { recursive: true });
        await fs.cp(src, dst, { recursive: true, errorOnExist: false });
        return {
          content: [{ type: "text", text: `✅ 已复制 ${path.resolve(src)} → ${path.resolve(dst)}` }],
        };
      }

      case "move_path": {
        const src = safePath(args.source);
        const dst = safePath(args.destination);
        requireAllowed(src);
        requireAllowed(dst);
        await fs.mkdir(path.dirname(dst), { recursive: true });
        await fs.rename(src, dst);
        return {
          content: [{ type: "text", text: `✅ 已移动 ${path.resolve(src)} → ${path.resolve(dst)}` }],
        };
      }

      case "delete_path": {
        const fp = safePath(args.path);
        requireAllowed(fp);
        if (args.recursive) {
          await fs.rm(fp, { recursive: true, force: true });
        } else {
          const stat = await fs.stat(fp);
          if (stat.isDirectory()) {
            // 尝试 rmdir（仅空目录）
            await fs.rmdir(fp);
          } else {
            await fs.unlink(fp);
          }
        }
        return {
          content: [{ type: "text", text: `🗑️ 已删除 ${path.resolve(fp)}` }],
        };
      }

      case "file_hash": {
        const fp = safePath(args.file_path);
        requireAllowed(fp);
        const algorithm = args.algorithm || "sha256";
        const hash = createHash(algorithm);
        const content = await fs.readFile(fp);
        hash.update(content);
        const digest = hash.digest("hex");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              file: path.resolve(fp),
              algorithm,
              hash: digest,
              size: content.length,
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `错误: ${error.message}` }],
      isError: true,
    };
  }
});

// ─── 启动 ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  console.error(`📁 filesystem-mcp v1.2.0 已启动`);
  console.error(`📂 允许的目录:`);
  for (const dir of ALLOWED_DIRS) {
    console.error(`   ${dir}`);
  }
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
