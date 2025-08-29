# 课程转换器 (Course Converter)

一个功能强大的命令行工具，用于将 OpenEdx OLX 格式的课程转换为 LiaScript Markdown 格式。


## 功能特性

- **批量转换**: 支持单个 `.tar.gz` 文件或包含多个课程的文件夹
- **完整支持**: 转换课程结构、内容、媒体文件和交互式问题
- **问题类型**: 支持多选题、单选题、下拉选择、文本输入、数字输入、Hints支持
- **媒体处理**: 自动处理图片和视频文件
- **错误处理**: 健壮的错误处理，单个课程失败不影响其他课程
- **函数式编程**: 采用现代 JavaScript 函数式编程范式

## 快速开始

### 安装依赖

```bash
npm install
```

### 基本使用

```bash
# 转换单个课程文件
node courseconverter.js input-course.tar.gz output-folder

# 转换包含多个课程的文件夹
node courseconverter.js input-folder output-folder

# 显示帮助信息
node courseconverter.js --help
```

### 示例

```bash
# 转换单个课程
node courseconverter.js input-courses/simple-course.tar.gz output-courses

# 转换多个课程
node courseconverter.js input-courses/ output-courses/

# 详细模式（显示更多信息）
node courseconverter.js --verbose input-courses/ output-courses/
```

## 输出结构

转换后的课程将按以下结构组织：

```
output-courses/
├── course1/
│   ├── course.md          # 转换后的 LiaScript Markdown 文件
│   └── media/             # 媒体文件目录
│       ├── image1.png
│       ├── image2.jpg
│       └── video1.mp4
├── course2/
│   ├── course.md
│   └── media/
└── ...
```

## 支持的问题类型

### 1. 多选题 (Multiple Choice)

### 2. 单选题 (Single Choice)

### 3. 下拉选择题 (Dropdown/Selection)

### 4. 文本输入题 (Text Input)

### 5. 数字输入题 (Number Input)

### 6. Hints 功能

### 7. CheckBox 功能



## 视频支持

### YouTube 视频

### 外部 URL 视频

## 图片处理

自动处理课程中的图片文件：

- 将图片从 `/static/` 路径转换为 `./media/` 相对路径
- 自动复制图片文件到输出目录
- 支持多种图片格式 (PNG, JPG, GIF, SVG)

## 测试

运行测试套件：

```bash
# 运行所有测试
npm test
```

## 项目结构

```
my-course-converter/
├── courseconverter.js      # 主程序文件
├── package.json            # 项目配置
├── jest.config.js          # Jest 测试配置
├── tests/                  # 测试文件
│   ├── core-requirements.test.js
│   └── ...
├── input-courses/          # 输入课程文件
├── output-courses/         # 输出课程文件
└── temp/                   # 临时文件目录
```

## 技术栈

- **Node.js**: 运行时环境
- **ES Modules**: JavaScript 模块系统
- **Commander.js**: 命令行参数解析
- **fast-xml-parser**: XML 解析
- **node-html-markdown**: HTML 到 Markdown 转换
- **tar**: 压缩文件处理
- **Jest**: 测试框架

## 错误处理

- 单个课程转换失败不会影响其他课程
- 详细的错误信息和堆栈跟踪（详细模式）
- 优雅降级处理不支持的内容类型
- 自动清理临时文件



## AI 辅助开发声明

本项目在开发过程中使用了以下 AI 工具进行辅助：

- **ChatGPT**: 帮助梳理代码运作思路和架构设计
- **Cursor**: 协助完成 README 文档编写和部分代码调试
- **Claude Code**: 协助完成 Jest 测试文档编写和 Jest 教学指导

这些 AI 工具在开发过程中提供了宝贵的思路指导和代码辅助，但所有最终代码实现、架构决策和功能设计均由开发者独立完成。


## 作者

Yikai Liu