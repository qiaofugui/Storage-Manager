# Storage Manager - 浏览器存储管理扩展

一个用于管理当前网页 `localStorage`、`sessionStorage` 和 `Cookie` 数据的浏览器扩展。项目基于 Vue 3、Vite、Tailwind CSS 和 Naive UI 构建，提供查看、搜索、新增、编辑、删除、复制、粘贴和批量编辑能力。

## 主要特性

### 多类型存储管理
- `localStorage` 管理：查看和维护当前页面的持久化 Web Storage 数据
- `sessionStorage` 管理：查看和维护当前页面的会话级 Web Storage 数据
- `Cookie` 管理：查看、编辑、删除当前页面可访问的 `Cookie`，并保留域名、路径、SameSite、Secure、HttpOnly、Store ID、Partition Key 等关键属性
- 计数标签页：快速切换不同存储类型，并显示当前数据数量

### 数据操作
- 实时读取当前激活标签页的数据
- 按键名或值搜索过滤
- 新增、编辑、删除单条数据
- 清空当前存储类型
- 一键清除当前页面的 `localStorage`、`sessionStorage` 和 `Cookie`

### JSON 与批量编辑
- 使用 JSON 编辑器编辑单个值或完整数据集
- 支持树形、代码、表单、文本等编辑模式
- 简单字符串、数字、布尔值和 JSON 对象/数组均可保存
- 批量编辑保存前会验证数据格式
- 批量覆盖写入失败时会尝试恢复原始数据，降低半写入导致的数据丢失风险
- 批量编辑保存 `{}` 时会清空当前存储类型，符合覆盖式编辑语义

### 剪贴板导入导出
- 复制单个数据项为 JSON 对象
- 从剪贴板粘贴 JSON 对象
- 粘贴前检测重复键名，避免误覆盖已有数据
- Cookie 复制会包含 Cookie 身份与属性信息，便于后续恢复或迁移

### 稳定性与兼容性
- 对特殊页面协议进行拦截，例如 `chrome://`、`edge://`、`about:`、扩展页面等
- 打开弹窗时如果当前页面仍在加载，会短暂等待页面完成，减少刚点击扩展就失败的情况
- 对 Chrome Extension API 不可用的场景给出明确错误
- 对不可序列化的 JSON 数据显式报错，避免保存成错误字符串
- 搜索时会兼容非字符串值，避免数字、布尔值或空值导致过滤失败
- 批量覆盖前会先快照当前存储键名，降低恢复流程遗漏数据的风险
- Manifest 使用 `_locales` 资源声明名称和描述，便于后续多语言扩展

## 安装和使用

### 开发环境

```bash
npm install
npm run dev
```

### 构建扩展

```bash
npm run build
```

构建产物会输出到 `dist` 目录。

### Chrome / Edge 安装

1. 运行 `npm run build`
2. 打开扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 开启“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择项目的 `dist` 文件夹

### Firefox 临时安装

1. 运行 `npm run build`
2. 打开 `about:debugging`
3. 点击“此 Firefox”
4. 点击“临时载入附加组件”
5. 选择 `dist/manifest.json`

> 当前项目主要按 Chrome / Edge 的 MV3 API 实现。Firefox 的 MV3 与 Cookie、Scripting API 行为可能存在差异，发布前建议单独验证。

## 使用说明

### 查看与搜索

打开目标网页后点击扩展图标，弹窗会读取当前标签页的数据。通过顶部标签页切换 `localStorage`、`sessionStorage` 或 Cookie，通过搜索框过滤键名和值。

数据表格使用分页展示，默认每页 20 条，可切换为 10、20 或 50 条。分页模式避免和虚拟滚动叠加造成状态复杂度，也更适合扩展弹窗的固定高度窗口。

### 新增或编辑

点击新增按钮创建数据项；点击表格行操作区的编辑按钮修改已有数据。编辑已有数据时键名会锁定，避免误改成新数据项。

### 复制与粘贴

点击复制按钮会将当前数据项复制为 JSON。点击粘贴按钮会读取剪贴板中的 JSON 对象，例如：

```json
{
  "token": "abc123",
  "settings": {
    "theme": "dark"
  }
}
```

粘贴时如果发现重复键名，会阻止导入并提示用户使用批量编辑进行覆盖。

### 批量编辑

批量编辑会把当前类型的所有数据加载为 JSON 对象。保存时会覆盖当前类型的全部数据。项目已加入失败恢复逻辑：当覆盖写入中途失败时，会尝试恢复保存前的数据。

## 扩展权限说明

```json
{
  "permissions": [
    "activeTab",
    "cookies",
    "scripting",
    "clipboardRead",
    "clipboardWrite"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
```

- `activeTab`：访问用户当前主动打开的页面
- `scripting`：在当前页面上下文中读取和写入 Web Storage
- `cookies`：读取、设置和删除当前页面 Cookie
- `clipboardRead`：从剪贴板粘贴 JSON 数据
- `clipboardWrite`：将数据项复制到剪贴板
- `http://*/*`、`https://*/*`：允许在 HTTP/HTTPS 站点读取和管理当前页面 Cookie

## 技术架构

```text
src/
├── components/
│   ├── StorageManager.vue
│   ├── StorageTabs.vue
│   ├── ActionButtons.vue
│   ├── StorageTable.vue
│   ├── AddEditModal.vue
│   └── EditAllModal.vue
├── composables/
│   ├── useStorage.js
│   ├── useClipboard.js
│   ├── useJsonEditor.js
│   ├── useIcons.js
│   └── useMessageManager.js
├── constants/
│   └── index.js
├── utils/
│   ├── storage.js
│   ├── storage/
│   │   ├── async.js
│   │   ├── chromeApi.js
│   │   ├── cookieIdentity.js
│   │   ├── cookieService.js
│   │   ├── manager.js
│   │   ├── validators.js
│   │   └── webStorageService.js
│   └── performance.js
├── App.vue
├── main.js
└── style.css
```

核心模块：

- `src/utils/storage.js`：存储模块统一入口，向外导出 `StorageManager`
- `src/utils/storage/manager.js`：统一封装 Web Storage 与 Cookie 操作，提供 `getAll`、`setItem`、`removeItem`、`clear`、`setBatch` 等方法
- `src/utils/storage/chromeApi.js`：封装 Chrome Tabs 与 Scripting API，并处理页面加载中的等待逻辑
- `src/utils/storage/webStorageService.js`：负责 `localStorage` 与 `sessionStorage` 的读取、写入、删除、清空和批量覆盖
- `src/utils/storage/cookieService.js`：负责 Cookie 的读取、设置、删除、清空和批量覆盖
- `src/utils/storage/cookieIdentity.js`：处理 Cookie 的唯一标识、路径、域名、SameSite 和编辑器 key 映射
- `src/utils/storage/validators.js`：集中管理存储类型、键名、Cookie 名称和 URL 校验
- `src/composables/useStorage.js`：管理页面状态、刷新、保存、删除和批量保存流程
- `src/composables/useClipboard.js`：处理剪贴板导入
- `src/composables/useJsonEditor.js`：处理 JSON 编辑器配置、解析、验证和格式化
- `src/components/*`：弹窗 UI 和交互组件

## 开发脚本

```bash
npm run dev            # 启动 Vite 开发服务
npm run check          # 构建检查
npm run build          # 构建扩展
npm run preview        # 预览构建产物
npm run build:analyze  # 构建并分析包体积
```

## 使用注意事项

1. 扩展只能管理当前激活标签页可访问的数据，不能操作浏览器内部页面。
2. 所有读取和写入都在本地执行，不会上传到服务器。
3. Cookie 的设置会受浏览器策略、站点协议、SameSite/Secure 规则和分区 Cookie 支持情况影响。
4. 批量编辑是覆盖式操作，请在重要站点操作前先复制备份。
5. 剪贴板粘贴内容必须是 JSON 对象。

## 许可证

本项目基于 Apache License 2.0 开源，详见 [LICENSE](./LICENSE)。
