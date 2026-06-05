"""Write File MCP Server — 文件写入 MCP 工具.

提供 write_file 和 append_file 两个工具，通过 STDIO 与 MCP 宿主通信。
"""

from pathlib import Path

from mcp.server import FastMCP

mcp = FastMCP("write-file")


@mcp.tool()
def write_file(path: str, content: str, encoding: str = "utf-8") -> str:
    """写入文件，若父目录不存在则自动创建。

    Args:
        path: 目标文件的绝对或相对路径
        content: 要写入的文件内容
        encoding: 文件编码，默认 utf-8

    Returns:
        操作结果描述
    """
    target = Path(path).expanduser().resolve()

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding=encoding)
        return f"✓ 已写入 {target} ({len(content)} 字符, {encoding})"
    except OSError as e:
        return f"✗ 写入失败: {e}"
    except UnicodeEncodeError as e:
        return f"✗ 编码错误: {e} — 请尝试其他 encoding 参数"


@mcp.tool()
def append_file(path: str, content: str, encoding: str = "utf-8") -> str:
    """追加内容到文件末尾，若文件或父目录不存在则自动创建。

    Args:
        path: 目标文件的绝对或相对路径
        content: 要追加的内容
        encoding: 文件编码，默认 utf-8

    Returns:
        操作结果描述
    """
    target = Path(path).expanduser().resolve()

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        old_size = target.stat().st_size if target.exists() else 0
        with open(target, "a", encoding=encoding) as f:
            f.write(content)
        new_size = target.stat().st_size
        added = new_size - old_size
        return f"✓ 已追加到 {target} (+{added} 字节, {encoding})"
    except OSError as e:
        return f"✗ 追加失败: {e}"
    except UnicodeEncodeError as e:
        return f"✗ 编码错误: {e} — 请尝试其他 encoding 参数"


def main():
    """STDIO 模式启动 MCP Server。"""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
