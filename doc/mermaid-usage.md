# 📊 Mermaid 流程图使用说明

## 两种用法

### 用法 1：从 AI 生成代码 → 粘贴

让豆包/DeepSeek 输出 Mermaid 代码，然后：

```
① 复制 AI 给的 Mermaid 代码
② 在编辑器中点击 📊 按钮
③ 删除默认代码，粘贴你的代码
④ 点 ✅ 完成预览
```

### 用法 2：直接编写

```
① 点击 📊 按钮
② 在代码编辑区直接写 Mermaid
③ 实时预览
④ 点 ✅ 完成
```

## 示例

### 流程图（graph）

```
graph TD
    A[收到通知] --> B{有截止日期?}
    B -->|是| C[记录截止日期]
    B -->|否| D[直接发布]
    C --> E[设置提前提醒]
    E --> F[截止前弹窗通知]
    D --> G[通知上线]
```

![流程图示例](https://mermaid.ink/img/pako:eNpVkM9qwzAMxl9F6JRCvkBvLYNCOmh31rUXYxtNsYhscPxTQum7z3HSrbuL9Pv0Sd9JK4tAK2rhYJ0i2d2kvsdPjy7S2OPhS8VQ1k8UCEk6FTHk4g2H_yeYw8XeGnJo4C7Q-Jus0qVdo09vjX19RxbjH6TRrn-TGJ3B3D-OntUZPBw_yvGH9rPs5ZQq80DKmUjbW0MywITrmJutTJGxaqDPmF9y75-0Ge1OLiNRZ3mY0FUBDfn_QVGl1fVRlM8LzC85f5aaDtC1wZ5gum3a2q4L6rL6BqiXbQA?type=png)

### 时序图（sequenceDiagram）

```
sequenceDiagram
    用户->>系统: 打开通知
    系统->>数据库: 查询截止日期
    数据库-->>系统: 返回 deadline
    系统->>用户: 显示倒计时
    系统->>用户: 截止前推送提醒
```

### 甘特图（gantt）

```
gantt
    title 综测工作推进计划
    dateFormat  YYYY-MM-DD
    section 材料提交
    学生提交材料     :2026-06-01, 20d
    班级初审         :2026-06-21, 5d
    section 审核
    学院复核         :2026-06-26, 5d
    公示             :2026-07-01, 3d
```

## Mermaid 常用图表类型

| 类型 | 关键字 | 用途 |
|------|--------|------|
| 流程图 | `graph TD` / `graph LR` | 流程、决策树 |
| 时序图 | `sequenceDiagram` | 交互顺序 |
| 甘特图 | `gantt` | 时间线、进度 |
| 类图 | `classDiagram` | 数据结构 |
| 饼图 | `pie` | 占比 |
| 思维导图 | `mindmap` | 脑图 |

## 粘贴格式兼容

对话框支持三种粘贴格式，自动识别：

| 粘贴内容 | 示例 | 是否兼容 |
|----------|------|---------|
| 纯代码 | `graph TD\n  A --> B` | ✅ |
| 带 ` ```mermaid` | ` ```mermaid \n graph TD\n  A --> B \n ``` ` | ✅ 自动剥离标记 |
| 带 ` ``` ` | ` ``` \n graph TD\n  A --> B \n ``` ` | ✅ 同上 |

从豆包/DeepSeek/AI 复制出来的代码直接粘贴就行，不用手动去掉代码块标记。

## 注意事项

- 详情页自动渲染，无需额外操作
- `{{图片: xxx}}` 占位符和流程图互不冲突
