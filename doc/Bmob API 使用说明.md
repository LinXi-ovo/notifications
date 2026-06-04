# Bmob 后端云 API 使用说明

> SDK: `hydrogen-js-sdk` v3.0.2  
> 官网: https://bmob.cn  
> 文档: https://doc.bmobapp.com

---

## 初始化

```javascript
import Bmob from 'hydrogen-js-sdk'

// Secret Key 和 API 安全码在 Bmob 控制台 → 设置 → 安全验证 中获取
Bmob.initialize('你的SecretKey', '你的API安全码')
```

## 数据库操作（Bmob.Query）

### 查询列表

```javascript
const query = Bmob.Query('表名')

// 条件筛选：equalTo(key, operator, value)
query.equalTo('type', '==', 'course')     // 等于
query.equalTo('priority', '>=', 1)         // 大于等于
query.equalTo('title', '!=', 'test')       // 不等于

// 模糊搜索（需要付费套餐）
query.equalTo('title', '==', { '$regex': '关键字.*' })

// 数组包含
query.containedIn('tags', ['重要', '紧急'])

// 排序：字段名前加负号表示降序
query.order('-priority', '-createdAt')     // 多字段排序

// 分页
query.limit(20)      // 每页条数（默认10，最大1000）
query.skip(0)        // 跳过条数

// 执行查询
const results = await query.find()
// results 是数组，每项有 objectId 和字段数据

// 统计数量
const count = await query.count()
```

### 获取单条

```javascript
const query = Bmob.Query('表名')
const item = await query.get('objectId')
// item.objectId, item.title, item.createdAt ...
```

### 新增

```javascript
const query = Bmob.Query('表名')
query.set('title', '通知标题')
query.set('content', '<p>正文内容</p>')
query.set('type', 'course')
const result = await query.save()
// result: { objectId: '...', createdAt: '...' }
```

### 修改

```javascript
const query = Bmob.Query('表名')
query.set('id', '要修改的objectId')    // 关键：设置 id 表示更新
query.set('title', '新标题')
const result = await query.save()
// result: { updatedAt: '...' }
```

### 删除

```javascript
const query = Bmob.Query('表名')
const result = await query.destroy('objectId')
// result: { msg: 'ok' }
```

## 用户系统（Bmob.User）

### 注册

```javascript
await Bmob.User.register({
  username: '用户名',
  password: '密码',
  email: 'email@example.com'
})
```

### 登录

```javascript
await Bmob.User.login('用户名', '密码')
```

### 当前用户

```javascript
const user = Bmob.User.current()
// user: { objectId, username, email, sessionToken, ... } 或 null
```

### 退出

```javascript
Bmob.User.logout()
```

## 文件上传（Bmob.File）

### 浏览器文件上传

```javascript
// fileObject 是 <input type="file"> 或拖拽/粘贴得到的 File 对象
const file = new Bmob.File('文件名.jpg', fileObject)
const result = await file.save()
// result.url — 文件的可访问 URL
// result.fileId — 文件 ID
```

### 限制

- 单文件最大 10MB（免费版）
- 支持类型：图片、音频、视频、PDF、Office 文档等

## 常用查询对照

| 场景 | 写法 |
|---|---|
| 等值查询 | `query.equalTo('field', '==', value)` |
| 范围查询 | `query.equalTo('field', '>', 5)` |
| 模糊搜索 | `query.equalTo('title', '==', { '$regex': '关键词' })` |
| 多条件 AND | 连续调用多个 `equalTo` |
| 多条件 OR | `query.or([cond1, cond2])` |
| 排序 | `query.order('-field')` 降序，`query.order('field')` 升序 |
| 分页 | `query.limit(n)` + `query.skip(n)` |

## 注意事项

1. **表名**：在 Bmob 控制台创建表时，注意大小写
2. **权限**：在 Bmob 控制台 → 数据表 → 权限设置 中配置读写权限
3. **索引**：大量数据时建议为常用查询字段建索引（控制台可配）
4. **付费**：模糊搜索和 count 统计需要付费套餐
5. **Secret Key**：前端代码中的 Secret Key 是可见的，Bmob 设计如此（通过权限表控制安全）
