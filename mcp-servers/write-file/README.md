# mcp-write-file

STDIO 模式的 MCP Server，提供文件写入能力。

## 工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `write_file` | `path`, `content`, `encoding=utf-8` | 写入文件，自动创建父目录 |
| `append_file` | `path`, `content`, `encoding=utf-8` | 追加到文件末尾，文件不存在则自动创建 |

## 安装

### 方式一：pip（推荐）

```bash
pip install mcp-servers/write-file/
```

### 方式二：uv

```bash
cd mcp-servers/write-file
uv pip install -e .
```

### 方式三：直接运行

```bash
cd mcp-servers/write-file
pip install mcp
python server.py
```

## Claude Code 配置

在 `.claude/settings.local.json` 或项目的 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "write-file": {
      "command": "uv",
      "args": [
        "--directory",
        "${workspaceFolder}/mcp-servers/write-file",
        "run",
        "server.py"
      ]
    }
  }
}
```

如果使用 pip 安装模式：

```json
{
  "mcpServers": {
    "write-file": {
      "command": "python",
      "args": ["-m", "server"],
      "cwd": "${workspaceFolder}/mcp-servers/write-file"
    }
  }
}
```

## 手动测试

```bash
# 启动服务器，输入 JSON-RPC 请求测试
python mcp-servers/write-file/server.py

# 或在另一个终端发送测试内容
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_file","arguments":{"path":"test.txt","content":"hello"}}}' | python mcp-servers/write-file/server.py
```
