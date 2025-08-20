#!/usr/bin/env node

// Built-in modules
// CN: 内置模块
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party modules
// CN: 第三方模块
import { program } from 'commander';

// Get current file path - ES Modules requirement
// CN: 获取当前文件路径 - ES Modules 要求
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure command line interface
// CN: 配置命令行界面
program
  .name('courseconverter')
  .description('Convert Open edX OLX courses to LiaScript Markdown format')
  .version('1.0.0')
  .argument('<input>', 'Input path: single .tar.gz file or directory containing multiple courses')
  .argument('<output>', 'Output directory for converted courses')
  .option('-v, --verbose', 'Enable verbose logging')
  .helpOption('-h, --help', 'Display help information')
  .parse(process.argv);

// Get parsed options
// CN: 获取解析后的选项
const options = program.opts();
const [inputPath, outputPath] = program.args;

// Resolve absolute paths
// CN: 解析绝对路径

// Notes on path.resolve(process.cwd(), inputPath):
// - Normalize to an absolute path; handles relative paths, '.', '..', and trailing slashes
// - If inputPath is absolute, it is returned as-is (cwd is ignored)
// - If inputPath is relative, it is resolved against process.cwd()
// - Pure string operations: no filesystem access or symlink resolution; use fs.realpathSync(...) for the real path
// - Passing process.cwd() explicitly improves clarity and guards against later process.chdir(...)

// CN: 关于 path.resolve(process.cwd(), inputPath) 的说明：
// CN: - 规范化为绝对路径；处理相对路径、.、..、以及尾随斜杠
// CN: - 若 inputPath 为绝对路径，将原样返回（忽略 cwd）
// CN: - 若 inputPath 为相对路径，将基于 process.cwd() 解析
// CN: - 仅字符串运算：不访问文件系统、不解析符号链接；真实路径可用 fs.realpathSync(...)
// CN: - 显式传入 process.cwd() 更直观，并可避免后续 process.chdir(...) 带来的歧义

const resolvedInputPath = path.resolve(process.cwd(), inputPath);
const resolvedOutputPath = path.resolve(process.cwd(), outputPath);

// Main function
// CN: 主函数
function main() {
  console.log('🚀 Starting course conversion...');
  
  // Input requirements:
  // - input: .tar.gz file or directory containing .tar.gz files
  // - output: directory name for converted courses
  // - Both paths can be relative or absolute
  // CN: 输入要求：
  // CN: - input: .tar.gz 文件或包含 .tar.gz 文件的目录
  // CN: - output: 转换后课程的目录名称
  // CN: - 两个路径都可以是相对路径或绝对路径
  
  // TODO: Add input validation
  // 1. Check if input file/directory exists
  // 2. Validate .tar.gz file format
  // 3. Check file permissions
  // 4. Validate output directory can be created
  // 5. Handle empty or invalid arguments
  // CN: TODO: 添加输入验证
  // CN: 1. 检查输入文件/目录是否存在
  // CN: 2. 验证 .tar.gz 文件格式
  // CN: 3. 检查文件权限
  // CN: 4. 验证输出目录是否可以创建
  // CN: 5. 处理空或无效参数
  
  if (options.verbose) {
    console.log('📋 Configuration:');
    console.log(`   Input: ${resolvedInputPath}`);
    console.log(`   Output: ${resolvedOutputPath}`);
    console.log(`   Verbose: ${options.verbose}`);
  }
  
  console.log('✅ CLI setup completed');
  console.log('📝 Next step: Implement input validation and file processing');
}

// Run main function
// CN: 运行主函数
main();
