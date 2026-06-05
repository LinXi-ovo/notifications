---
name: gh-search-reference
description: 用 GitHub CLI 搜索开源项目，调研现有实现和最佳实践
trigger: 需要调研某个技术的开源生态/参考实现时
---

# GitHub 搜索 — 开源调研

当需要寻找参考实现、对比方案、学习最佳实践时，用 `gh search repos` 和 `gh search code` 直接搜 GitHub，比搜索引擎更精准。

## 用法

```
调研请求
  ↓
gh search repos "关键词" --limit 20 --json fullName,description,url,stars
  ↓
扫一遍结果，挑 star 高/描述相关的看
  ↓
gh search code "关键词" --limit 10 --json path,url,repository
  ↓
总结发现，给出推荐
```

## 示例

```
# 搜 Tiptap Mermaid 相关仓库
gh search repos "tiptap mermaid" --limit 10 --json fullName,description,url
```

## 搜索类型

| 类型 | 命令 | 用途 |
|------|------|------|
| 仓库搜素 | `gh search repos "..."` | 找现有实现 |
| 代码搜索 | `gh search code "..."` | 搜具体代码模式 |
| API 搜索 | `gh api /search/repositories?q=...` | 灵活参数 |
| 技能搜索 | `npx skills find "..."` | 同时搜 skills 生态 |

## 原则

先 `gh search repos` 再 `npx skills find`——GitHub 上有更大、更活跃的开源生态。
