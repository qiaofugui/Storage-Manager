# Storage Manager - 浏览器存储管理扩展

一个功能强大的浏览器扩展，用于管理网页的 localStorage 和 sessionStorage 数据。基于 Vue 3 + Vite + Tailwind CSS + Naive UI 构建，提供现代化的用户界面和丰富的数据操作功能。

## ✨ 主要特性

### 📊 双存储支持
- **localStorage 管理** - 持久化存储数据管理
- **sessionStorage 管理** - 会话级存储数据管理
- **标签页切换** - 便捷切换不同存储类型

### 🔍 数据操作
- **实时查看** - 自动读取当前网页的存储数据
- **搜索过滤** - 支持按键名或值内容搜索
- **添加数据** - 新增键值对数据项
- **编辑数据** - 修改现有数据项
- **删除数据** - 删除单个或全部数据

### 📝 高级编辑功能
- **JSON 编辑器** - 支持多种编辑模式（树形、代码、表单、文本、预览）
- **批量编辑** - 一次性编辑所有存储数据
- **格式验证** - 实时JSON格式验证和错误提示
- **格式化** - 自动格式化JSON数据

### 📋 数据交换
- **复制功能** - 复制单个数据项到剪贴板（JSON格式）
- **粘贴功能** - 从剪贴板粘贴JSON数据
- **重复检测** - 粘贴时自动检测重复键名
- **批量导入** - 支持批量粘贴多个键值对

### 🎨 用户体验
- **现代化UI** - 基于 Naive UI 的美观界面
- **响应式设计** - 适配不同屏幕尺寸
- **实时反馈** - 操作结果即时提示
- **键盘友好** - 支持常用快捷键操作

## 📦 安装和使用

### 开发环境安装

```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建扩展
npm run build
```

### 浏览器安装

#### Chrome/Edge 安装
1. 运行 `npm run build` 构建扩展
2. 打开浏览器扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `dist` 文件夹

#### Firefox 安装
1. 打开 `about:debugging`
2. 点击「此Firefox」
3. 点击「临时载入附加组件」
4. 选择 `dist` 文件夹中的 `manifest.json`

## 🚀 功能使用指南

### 基本操作
1. **查看数据** - 点击扩展图标打开面板，自动显示当前页面的存储数据
2. **切换存储类型** - 点击 localStorage/sessionStorage 标签页切换
3. **搜索数据** - 在搜索框中输入关键词过滤数据

### 数据管理
- **新增数据** - 点击「新增」按钮，填写键名和值
- **编辑数据** - 点击数据行的编辑按钮修改
- **删除数据** - 点击删除按钮移除单个数据项
- **清空数据** - 点击「清除」按钮删除所有存储数据

### 高级功能
- **JSON编辑** - 在编辑框中可切换多种编辑模式
- **批量编辑** - 点击「批量编辑」一次性修改所有数据
- **复制数据** - 点击复制按钮将数据以JSON格式复制到剪贴板
- **粘贴数据** - 点击「粘贴」按钮从剪贴板导入JSON数据

### 数据格式说明
- **简单值** - 字符串、数字、布尔值直接存储
- **复杂数据** - 对象和数组自动转换为JSON字符串
- **粘贴格式** - 支持标准JSON对象格式：`{"key1": "value1", "key2": "value2"}`

## 🛠️ 技术架构

### 核心技术栈
- **Vue 3** - 渐进式JavaScript框架，使用Composition API
- **Vite** - 现代化前端构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Naive UI** - Vue 3 组件库
- **json-editor-vue3** - JSON编辑器组件

### 项目结构
```
src/
├── components/           # Vue组件
│   ├── LocalStorageManager.vue  # 主管理组件
│   ├── StorageTabs.vue          # 存储类型标签页
│   ├── ActionButtons.vue        # 操作按钮组件
│   ├── StorageTable.vue         # 数据表格组件
│   ├── AddEditModal.vue         # 添加/编辑模态框
│   └── EditAllModal.vue         # 批量编辑模态框
├── composables/          # 组合式函数
│   ├── useJsonEditor.js         # JSON编辑器功能
│   └── useIcons.js              # 图标管理
├── App.vue              # 根组件
├── main.js              # 应用入口
└── style.css            # 全局样式
```

### 核心功能模块
- **存储管理** - Chrome Extension API 实现跨标签页存储操作
- **JSON处理** - 智能解析和序列化JSON数据
- **剪贴板操作** - 现代浏览器剪贴板API集成
- **数据验证** - 实时格式验证和错误处理

## 🔧 扩展权限说明

```json
{
  "permissions": [
    "activeTab",      // 访问当前激活标签页
    "storage",        // 扩展自身存储
    "scripting",      // 在页面中执行脚本
    "clipboardRead"   // 读取剪贴板内容
  ]
}
```

## ⚠️ 使用注意事项

1. **页面要求** - 扩展需要在目标网页上使用，无法管理扩展页面的存储
2. **权限限制** - 仅能访问当前激活标签页的存储数据
3. **数据安全** - 所有操作均在本地进行，不会上传到任何服务器
4. **格式要求** - 粘贴数据必须是有效的JSON格式
5. **重复键名** - 粘贴时会自动检测并阻止重复键名覆盖

## 🤝 开发贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [Vue 3 文档](https://vuejs.org/)
- [Naive UI](https://www.naiveui.com/)
- [Tailwind CSS](https://tailwindcss.com/) 