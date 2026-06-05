# 🛠 开发者工具

本项目包含的开发者工具和脚本，用于加速开发和测试。

## 快速创建测试通知

```bash
node dev_tools/create-test-notification.cjs
```

从项目根目录运行，自动读取 `.env` 中的 Bmob 凭据。

### 用法示例

```bash
# 创建 Mermaid 三图测试通知（默认）
node dev_tools/create-test-notification.cjs

# 创建纯文本通知
node dev_tools/create-test-notification.cjs -t basic

# 创建带截止日期的通知
node dev_tools/create-test-notification.cjs -t deadline

# 创建活动通知（含表格）
node dev_tools/create-test-notification.cjs -t rich

# 创建 5 条批量测试通知
node dev_tools/create-test-notification.cjs -t basic -n 5

# 自定义标题和分类
node dev_tools/create-test-notification.cjs -t basic --title "测试通知" --type course --priority 2

# 设置来源和标签
node dev_tools/create-test-notification.cjs --group "年级群" --person "张老师" --tags "通知,重要"

# 查看所有可用模板
node dev_tools/create-test-notification.cjs --list

# 查看帮助
node dev_tools/create-test-notification.cjs --help
```

### 模板列表

| 模板名 | 说明 | 用途 |
|--------|------|------|
| `mermaid`（默认） | 三种 Mermaid 图表（流程图/时序图/甘特图） | 测试 Mermaid SVG 渲染 |
| `basic` | 纯文本 + 基础格式 | 测试基本渲染、批量创建 |
| `deadline` | 含截止日期的通知 | 测试截止日期显示 |
| `rich` | 富文本/表格/活动通知 | 测试表格和富内容渲染 |

### 完整选项

```
--template, -t <名称>   选择模板
--title <文本>          通知标题
--type <分类>           分类 (other|zongce|baoyan|course|activity|homework)
--priority, -p <0-3>    优先级 (0=普通, 1=置顶, 2=重要, 3=紧急)
--group, -g <文本>      来源群组
--person <文本>         发布人
--tags <tag1,tag2>      标签 (逗号分隔)
--count, -n <数字>      创建数量 (仅 basic 模板)
--list, -l              列出可用模板
--help, -h              显示帮助
```

## 添加新模板

编辑 `create-test-notification.js`，在 `TEMPLATES` 对象中添加：

```javascript
myTemplate: {
  title: '默认标题',
  content: (title) => `<h2>${title}</h2><p>HTML 内容</p>`,
  priority: 0,
  tags: ['标签1', '标签2'],
},
```

要求：
- `content` 可以是字符串或返回字符串的函数
- `title` 为模板默认标题，可通过 `--title` 覆盖
- `priority` 为模板默认优先级，可通过 `--priority` 覆盖（未设置时默认 0）
- `tags` 为模板默认标签，可通过 `--tags` 覆盖

## 其他工具

_(其他开发工具后续添加)_
