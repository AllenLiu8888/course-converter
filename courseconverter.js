#!/usr/bin/env node
// ------------------------------------- MODULES -----------------------------------------
// Built-in modules
// CN: 内置模块
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party modules
// CN: 第三方模块
import { program } from 'commander';
import * as tar from 'tar';
import { XMLParser } from 'fast-xml-parser';

// Get current file path - ES Modules requirement
// CN: 获取当前文件路径 - ES Modules 要求
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ------------------------------------- CLI -----------------------------------------
// Configure command line interface
// CN: 配置命令行界面
program
  .name('courseconverter')
  .description('Convert Open edX OLX courses to LiaScript Markdown format')
  .version('1.0.0')
  .argument('<input>', 'Input path: single .tar.gz file or directory containing multiple courses')
  .argument('<output>', 'Output directory for converted courses')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--print-tree', 'Print parsed course structure tree to stdout', false)
  .helpOption('-h, --help', 'Display help information')
  .parse(process.argv);

// Get parsed options
// CN: 获取解析后的选项
const options = program.opts();
const [inputPath, outputPath] = program.args;

// Resolve absolute paths
// CN: 解析绝对路径
const resolvedInputPath = path.resolve(process.cwd(), inputPath);
const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
const TEMP_ROOT = path.join(process.cwd(), 'temp');

// ------------------------------------- FUNCTIONS ------------------------------------

// ------------------------------------- 调试模式信息显示 displayConfiguration ✅ ------------------------------------
/**
 * Display configuration information
 * CN: 如果是调试模式verbose，则显示配置信息
 * @description Shows current configuration when verbose mode is enabled
 * @example
 * displayConfiguration();
 * Output: 📋 Configuration:
 *           Input: /path/to/input
 *           Output: /path/to/output
 */
function displayConfiguration() {
  if (options.verbose) {
    console.log('📋 Configuration:');
    console.log(`   Input: ${resolvedInputPath}`);
    console.log(`   Output: ${resolvedOutputPath}`);
    console.log(`   Verbose: ${options.verbose}`);
  }
}

// --------------------------------- 初始化Temp文件夹 prepareTempRoot ✅ -------------------------------------
/**
 * Prepare temp root: clean previous run artifacts and recreate root
 * CN: 准备临时目录：在新进程开始时清理并重建 temp 根目录
 */
function prepareTempRoot() {
  try {
    if (fs.existsSync(TEMP_ROOT)) {
      fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
      if (options.verbose) console.log(`Cleaned temp root: ${TEMP_ROOT}`);
    }
    fs.mkdirSync(TEMP_ROOT, { recursive: true });
    if (options.verbose) console.log(`Ready temp root: ${TEMP_ROOT}`);
  } catch (e) {
    console.error(`Failed to prepare temp root: ${e.message}`);
    process.exit(1);
  }
}

// --------------------------------- 获取输入，判断是文件还是目录，文件或者内部文件是否是tar.gz结尾 getFileInfo ✅ -------------------------------------

/**
 * Get file information and validate input path
 * CN: 获取文件信息并验证输入路径
 * @param {string} inputPath - Path to validate
 * @returns {Object} - Object containing validation result and file list
 * @description Validates input path and returns file information
 * @throws {Error} When input path is invalid
 * @example
 * const result = getFileInfo('/path/to/courses');
 * Returns: { isValid: true, isFile: false, isDirectory: true, files: ['file1.tar.gz', 'file2.tar.gz'] }
 */
function getFileInfo(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path does not exist: ${inputPath}`);
  }
  
  const stats = fs.statSync(inputPath);
  const result = {
    isValid: false,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    files: []
  };
  
  if (stats.isFile()) {
    // Single file validation
    // CN: 单个文件验证
    if (!inputPath.endsWith('.tar.gz')) {
      throw new Error(`Input file must be a .tar.gz file: ${inputPath}`);
    }
    result.isValid = true;
    result.files = [inputPath];
    
  } else if (stats.isDirectory()) {
    // Directory validation
    // CN: 目录验证
    const files = fs.readdirSync(inputPath); //CN: readdirSync 读取指定目录下的所有文件和子目录的名称
    const tarGzFiles = files.filter(file => file.endsWith('.tar.gz')); // Return: ['file1.tar.gz', 'file2.tar.gz']
    
    if (tarGzFiles.length === 0) { //CN: 如果tarGzFiles为空，则抛出错误
      throw new Error(`Input directory contains no .tar.gz files: ${inputPath}`);
    }
    
    result.isValid = true;
    result.files = tarGzFiles.map(file => path.join(inputPath, file)); // Return: ['/path/to/input/file1.tar.gz', '/path/to/input/file2.tar.gz']
    

    if (options.verbose && result.isValid) { //CN: 如果verbose为true，则输出找到的.tar.gz文件的数量和文件名
      if (result.files.length === 1) {  //CN: 如果result.files的长度为1，则输出找到的.tar.gz文件的文件名
        console.log(`Found single .tar.gz file: ${path.basename(result.files[0])}`);
      } else { //CN: 如果result.files的长度大于1，则输出找到的.tar.gz文件的数量和文件名
        console.log(`Found ${result.files.length} .tar.gz files:`);
        result.files.forEach(file => console.log(`   - ${path.basename(file)}`));
      }
    }

  }
  
  return result;
}

// --------------------------------- 从整个的getFileInfo得到的obj内单独取出是否有效的判断，返回布尔值 validateInputPath ✅ -------------------------------------

/**
 * Validate input path
 * CN: 验证输入路径
 * @param {string} inputPath - Path to validate
 * @returns {boolean} - Whether path is valid
 * @description Validates that input path exists and contains valid .tar.gz files
 * @throws {Error} When input path is invalid
 */
function validateInputPath(inputPath) {
  try {
    const fileInfo = getFileInfo(inputPath); // from throw error
    return fileInfo.isValid;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

// --------------------------------- 从整个的getFileInfo得到的obj内单独取出文件(s) TarGzFiles ✅ -------------------------------------

/**
 * Get list of .tar.gz files to process
 * CN: 获取要处理的 .tar.gz 文件列表
 * @param {string} inputPath - Input path (file or directory)
 * @returns {string[]} - Array of .tar.gz file paths
 * @description Scans input path and returns array of .tar.gz files
 * @throws {Error} When input path is invalid
 */
function getTarGzFiles(inputPath) {
  const fileInfo = getFileInfo(inputPath);
  return fileInfo.files;
}

// --------------------------------- 检测是否有output文件夹，如果没有，则创建 createOutputDirectory ✅ -------------------------------------

/**
 * Create output directory structure
 * CN: 创建输出目录结构
 * @param {string} outputPath - Output directory path
 * @description Creates output directory if it doesn't exist
 * @throws {Error} When directory creation fails
 * @example
 * createOutputDirectory('/path/to/output');
 */
function createOutputDirectory(outputPath) {
  try {
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      if (options.verbose) {
        console.log(`Created output directory: ${outputPath}`);
      }
    } else {
      if (options.verbose) {
        console.log(`Output directory already exists: ${outputPath}`);
      }
    }
  } catch (error) {
    console.error(`Error creating output directory: ${error.message}`);
    process.exit(1);
  }
}

// --------------------------------- 如果输入的ouput路径正确，则创建输出文件夹 validateAndSetup ✅ -------------------------------------

/**
 * Validate input and setup output directory
 * CN: 验证输入并设置输出目录
 * @returns {string[]} - Array of .tar.gz file paths to process
 * @description Validates input, creates output directory, and returns file list
 * @throws {Error} When validation fails
 * @example
 * const files = validateAndSetup();
 * Returns: ['course1.tar.gz', 'course2.tar.gz']
 */
function validateAndSetup() {
  // Validate input path
  // CN: 验证输入路径
  if (!validateInputPath(resolvedInputPath)) {
    throw new Error('Input validation failed');
  }
  
  // Create output directory
  // CN: 创建输出目录
  createOutputDirectory(resolvedOutputPath);
  
  // Get list of files to process
  // CN: 获取要处理的文件列表
  const tarGzFiles = getTarGzFiles(resolvedInputPath);
  
  console.log(`Found ${tarGzFiles.length} course(s) to process`);
  
  return tarGzFiles;
}

// --------------------------------- 创建临时目录，并且使用tar解压拿到的tarGZ文件 extractCourse ✅ -------------------------------------

/**
 * Extract .tar.gz file to temporary directory
 * CN: 解压 .tar.gz 文件到临时目录
 * @param {string} tarGzPath - Path to .tar.gz file
 * @returns {Promise<string>} - Path to extracted directory
 * @description Extracts course file and returns path to extracted content
 * @throws {Error} When extraction fails
 * @example
 * const extractedDir = await extractCourse('/path/to/course.tar.gz');
 * Returns: '/path/to/temp/course/'
 */
async function extractCourse(tarGzPath) {
  // Create temporary directory for extraction
  // CN: 创建临时目录用于解压
  const tempDir = path.join(TEMP_ROOT, path.basename(tarGzPath, '.tar.gz')); //CN: (路径，要删除的后缀)
  
  // Clean up existing temp directory if it exists
  // CN: 如果临时目录已存在，先清理
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Create temp directory
  // CN: 创建临时目录
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // Extract .tar.gz file using tar library
    // CN: 使用 tar 库解压 .tar.gz 文件
    await tar.extract({
      file: tarGzPath, // CN: 要解压的文件
      cwd: tempDir, // CN: 解压到哪个目录
      strip: 1 // CN: 删除最上层的路径层级（course文件夹） // Del root folder - course
    });
    
    if (options.verbose) {
      console.log(`Extracted to: ${tempDir}`);
    }
    
    return tempDir;
  } catch (error) {
    // Clean up temp directory on error
    // CN: 出错时清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw new Error(`Failed to extract course: ${error.message}`);
  }
}

// --------------------------------- 如果Temp文件夹存在，则清理Temp文件夹 cleanupTempFiles ✅ -------------------------------------

/**
 * Clean up temporary extracted files
 * CN: 清理临时解压文件
 * @param {string} tempDir - Path to temporary directory
 * @description Removes temporary directory and its contents
 * @example
 * cleanupTempFiles('/path/to/temp/course/');
 */
function cleanupTempFiles(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      if (options.verbose) {
        console.log(`Cleaned up: ${tempDir}`);
      }
    }
  } catch (error) {
    if (options.verbose) {
      console.warn(`Warning: Could not clean up ${tempDir}: ${error.message}`);
    }
  }
}

// --------------------------------- 引入Xml解析器，并且使用特殊符号区分子元素和属性 createXmlParser ✅ -------------------------------------
/**
 * Create XML parser instance
 * CN: 创建 XML 解析器实例
 */
function createXmlParser() {
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }); //CN: 区分子元素和属性
}

// --------------------------------- 读取Xml文件，调用解析器分析，输出xml内容用obj呈现 readXmlAsObject ✅ -------------------------------------
/**
 * Read and parse XML file
 * CN: 读取并解析 XML 文件
 */
function readXmlAsObject(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = createXmlParser();
  return parser.parse(xml);
}

// --------------------------------- 如果元素有单一子元素，内容不会以数组形式呈现，使用需统一为数组呈现 toArray ✅ -------------------------------------
/**
 * Normalize value to array
 * CN: 将值规范化为数组
 */
function toArray(maybeArray) {
  if (maybeArray == null) return [];
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

// --------------------------------- 根据是否可以从课程文件夹找到course.xml，来判断是否是正确的course resolveCourseRoot ✅ -------------------------------------
/**
 * Resolve course root directory
 * CN: 解析课程根目录
 * @param {string} extractedDir - Path to extracted directory
 * @returns {string} - Path to course root directory
 * @description Resolves course root directory from extracted directory
 * @throws {Error} When course root directory cannot be resolved
 * @example
 * const courseRoot = resolveCourseRoot('/path/to/extracted/course/');
 * Returns: '/path/to/extracted/course/'
 */
function resolveCourseRoot(extractedDir) {
  // CN: 解析课程根目录（简化结构：extractedDir/course.xml）
  const courseXmlPath = path.join(extractedDir, 'course.xml');
  
  if (fs.existsSync(courseXmlPath)) {
    // CN: course.xml 直接在解压目录下
    return extractedDir;
  } else {
    throw new Error(`course.xml not found under ${extractedDir}`);
  }
}

// --------------------------------- 根据coures.xml文件找到root文件夹 coures下的CourseName.xml文件，根据里面的信息得到root信息，并且得到chapterRef内容 parseCourseXml ✅ -------------------------------------
function parseCourseXml(courseRoot) {
  const courseXmlPath = path.join(courseRoot, 'course.xml');
  if (!fs.existsSync(courseXmlPath)) {
    throw new Error(`course.xml not found at ${courseXmlPath}`);
  }
  // 1. Basic root info
  const rootObj = readXmlAsObject(courseXmlPath);
  const rootNode = rootObj.course || rootObj.COURSE || {};
  const urlName = rootNode['@_url_name'];
  const org = rootNode['@_org'];
  const courseCode = rootNode['@_course'];

  // 2. Details
  const detailedPath = urlName ? path.join(courseRoot, 'course', `${urlName}.xml`) : null;
  const detailedExists = detailedPath && fs.existsSync(detailedPath);
  const obj = detailedExists ? readXmlAsObject(detailedPath) : rootObj;
  const node = obj.course || obj.COURSE || {};

  const title = node['@_display_name'] || node.display_name || urlName || 'Untitled Course';
  const courseId = node['@_course'] || courseCode || node['@_url_name'] || urlName || 'unknown';
  const chapterRefs = toArray(node.chapter || node.CHAPTER || [])
    .map(n => n['@_url_name'])
    .filter(Boolean);
  return { title, courseId, chapterRefs };
}

// --------------------------------- parseChapters ✅ 根据ChapterRef内容找到sequentialRef -------------------------------------
function parseChapters(courseRoot, chapterRefs) {
  return chapterRefs.map(ref => {
    const chapterPath = path.join(courseRoot, 'chapter', `${ref}.xml`);
    if (!fs.existsSync(chapterPath)) {
      if (options.verbose) console.warn(`Missing chapter file: ${chapterPath}`);
      return { id: ref, title: `Missing chapter ${ref}`, sequentials: [] };
    }
    const obj = readXmlAsObject(chapterPath);
    const node = obj.chapter || obj.CHAPTER || {};
    const title = node['@_display_name'] || node.display_name || ref;
    const sequentialRefs = toArray(node.sequential || node.SEQUENTIAL || [])
      .map(n => n['@_url_name'])
      .filter(Boolean);
    const sequentials = parseSequentials(courseRoot, sequentialRefs);
    return { id: ref, title, sequentials };
  });
}

// --------------------------------- parseSequentials ✅ 根据sequentialRef内容找到VerticalsRef -------------------------------------
function parseSequentials(courseRoot, sequentialRefs) {
  return sequentialRefs.map(ref => {
    const sequentialPath = path.join(courseRoot, 'sequential', `${ref}.xml`);
    if (!fs.existsSync(sequentialPath)) {
      if (options.verbose) console.warn(`Missing sequential file: ${sequentialPath}`);
      return { id: ref, title: `Missing sequential ${ref}`, verticals: [] };
    }
    const obj = readXmlAsObject(sequentialPath);
    const node = obj.sequential || obj.SEQUENTIAL || {};
    const title = node['@_display_name'] || node.display_name || ref;
    const verticalRefs = toArray(node.vertical || node.VERTICAL || [])
      .map(n => n['@_url_name'])
      .filter(Boolean);
    const verticals = parseVerticals(courseRoot, verticalRefs);
    return { id: ref, title, verticals };
  });
}

// --------------------------------- parseVerticals ✅ 根据VerticalsRef内容找到ComponentRefs -------------------------------------
function parseVerticals(courseRoot, verticalRefs) {
  return verticalRefs.map(ref => {
    const verticalPath = path.join(courseRoot, 'vertical', `${ref}.xml`);
    if (!fs.existsSync(verticalPath)) {
      if (options.verbose) console.warn(`Missing vertical file: ${verticalPath}`);
      return { id: ref, title: `Missing vertical ${ref}`, components: [] };
    }
    const obj = readXmlAsObject(verticalPath);
    const node = obj.vertical || obj.VERTICAL || {};
    const title = node['@_display_name'] || node.display_name || ref;
    const components = collectComponentRefs(node);
    return { id: ref, title, components };
  });
}

// --------------------------------- collectComponentRefs ✅ 通过遍历各种组件类型，得到所有的组件details -------------------------------------
function collectComponentRefs(verticalNode) {
  const components = [];
  const knownKinds = ['html', 'problem', 'video', 'about'];
  
  for (const kind of knownKinds) {
    const items = toArray(verticalNode[kind] || verticalNode[kind.toUpperCase()] || []);
    for (const it of items) {
      const id = it['@_url_name'] || it['@_url'] || it['@_filename'] || undefined;
      components.push({ kind, id: id || 'unknown' });
    }
  }
  
  return components;
}

// --------------------------------- parseHtmlComponent ✅ 主动------------------------------------
/**
 * Parse HTML component content
 * CN: 解析 HTML 组件内容
 * @param {string} courseRoot - Course root directory path
 * @param {string} componentId - Component ID (filename without extension)
 * @returns {Object} - Parsed HTML component data
 * @description Reads HTML component XML and HTML files, extracts content
 * @throws {Error} When component files are not found
 * @example
 * const htmlData = parseHtmlComponent('/temp/course1', 'content1');
 * Returns: { type: 'html', content: '<p>Hello World</p>', filename: 'content1' }
 */
function parseHtmlComponent(courseRoot, componentId) {
  // CN: 构建 HTML 组件的 XML 和 HTML 文件路径
  const htmlXmlPath = path.join(courseRoot, 'html', `${componentId}.xml`);
  const htmlContentPath = path.join(courseRoot, 'html', `${componentId}.html`);
  
  // CN: 检查文件是否存在
  if (!fs.existsSync(htmlXmlPath)) {
    throw new Error(`HTML component XML not found: ${htmlXmlPath}`);
  }
  
  if (!fs.existsSync(htmlContentPath)) {
    throw new Error(`HTML component content not found: ${htmlContentPath}`);
  }
  
  // CN: 读取 HTML 内容
  const htmlContent = fs.readFileSync(htmlContentPath, 'utf8');
  
  // CN: 解析 XML 文件（虽然当前只有 filename 属性，但保持一致性）
  const xmlObj = readXmlAsObject(htmlXmlPath);
  const xmlNode = xmlObj.html || xmlObj.HTML || {};
  
  // CN: 返回解析后的 HTML 组件数据
  return {
    type: 'html',
    content: htmlContent,
    filename: componentId,
    displayName: xmlNode['@_display_name'] || componentId
  };
}

// --------------------------------- renderHtmlContent ❌ -------------------------------------
/**
 * Render HTML content to LiaScript Markdown
 * CN: 将 HTML 内容渲染为 LiaScript Markdown
 * @param {Object} htmlIR - HTML component intermediate representation
 * @returns {string} - LiaScript Markdown content
 * @description Converts HTML content to LiaScript Markdown format
 * @example
 * const markdown = renderHtmlContent(htmlData);
 * Returns: "# HTML Content\n\n<p>Hello World</p>"
 */
function renderHtmlContent(htmlIR) {
  // CN: 验证输入数据
  if (!htmlIR || htmlIR.type !== 'html') {
    throw new Error('Invalid HTML component data');
  }
  
  // CN: 提取 HTML 内容
  const htmlContent = htmlIR.content;
  
  // CN: 简单的 HTML 到 Markdown 转换
  // 注意：这里使用简单的字符串替换，实际项目中可能需要更复杂的 HTML 解析器
  let markdown = htmlContent;
  
  // CN: 转换常见的 HTML 标签
  markdown = markdown
    // 处理 <strong> 标签
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    // 处理 <em> 标签
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    // 处理 <br /> 标签
    .replace(/<br\s*\/?>/gi, '\n')
    // 处理 <p> 标签
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    // 处理 <h1> 到 <h6> 标签
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
    // 处理 <ul> 和 <li> 标签
    .replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '- $1\n') + '\n';
    })
    // 处理 <ol> 和 <li> 标签
    .replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n';
    })
    // 处理 <a> 标签
    .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    // 清理多余的空白字符
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // CN: 如果内容为空，返回默认文本
  if (!markdown || markdown.trim() === '') {
    markdown = '*No content available*';
  }
  
  return markdown;
}

// --------------------------------- parseComponent ❌ -------------------------------------
/**
 * Parse component content based on type
 * CN: 根据类型解析组件内容
 * @param {string} courseRoot - Course root directory path
 * @param {Object} component - Component reference object
 * @returns {Object} - Parsed component data
 * @description Unified entry point for parsing different component types
 * @throws {Error} When component type is not supported or parsing fails
 * @example
 * const componentData = parseComponent('/temp/course1', { kind: 'html', id: 'content1' });
 * Returns: { type: 'html', content: '...', filename: 'content1' }
 */
function parseComponent(courseRoot, component) {
  // CN: 验证输入参数
  if (!courseRoot || !component) {
    throw new Error('Invalid parameters: courseRoot and component are required');
  }
  
  if (!component.kind || !component.id) {
    throw new Error('Invalid component: kind and id are required');
  }
  
  const { kind, id } = component;
  
  // CN: 根据组件类型调用相应的解析函数
  switch (kind.toLowerCase()) {
    case 'html':
      return parseHtmlComponent(courseRoot, id);
      
    case 'problem':
      // TODO: 实现问题组件解析
      return {
        type: 'problem',
        content: `*Problem component not yet implemented: ${id}*`,
        filename: id,
        displayName: id
      };
      
    case 'video':
      // TODO: 实现视频组件解析
      return {
        type: 'video',
        content: `*Video component not yet implemented: ${id}*`,
        filename: id,
        displayName: id
      };
      
    case 'about':
      // TODO: 实现关于组件解析
      return {
        type: 'about',
        content: `*About component not yet implemented: ${id}*`,
        filename: id,
        displayName: id
      };
      
    default:
      // CN: 未知组件类型，返回占位符
      if (options.verbose) {
        console.warn(`⚠️ Unknown component type: ${kind} (${id})`);
      }
      return {
        type: 'unknown',
        content: `*Unsupported component type: ${kind} (${id})*`,
        filename: id,
        displayName: id
      };
  }
}

// --------------------------------- renderComponent ❌ -------------------------------------
/**
 * Render component to LiaScript Markdown
 * CN: 将组件渲染为 LiaScript Markdown
 * @param {Object} componentIR - Component intermediate representation
 * @returns {string} - LiaScript Markdown content
 * @description Unified entry point for rendering different component types
 * @throws {Error} When component type is not supported or rendering fails
 * @example
 * const markdown = renderComponent(componentData);
 * Returns: "# Component Title\n\nComponent content in Markdown format"
 */
function renderComponent(componentIR) {
  // CN: 验证输入数据
  if (!componentIR || !componentIR.type) {
    throw new Error('Invalid component data: type is required');
  }
  
  const { type } = componentIR;
  
  // CN: 根据组件类型调用相应的渲染函数
  switch (type.toLowerCase()) {
    case 'html':
      return renderHtmlContent(componentIR);
      
    case 'problem':
      // TODO: 实现问题组件渲染
      return `## Problem: ${componentIR.displayName || componentIR.filename}\n\n${componentIR.content}\n\n---\n`;
      
    case 'video':
      // TODO: 实现视频组件渲染
      return `## Video: ${componentIR.displayName || componentIR.filename}\n\n${componentIR.content}\n\n---\n`;
      
    case 'about':
      // TODO: 实现关于组件渲染
      return `## About: ${componentIR.displayName || componentIR.filename}\n\n${componentIR.content}\n\n---\n`;
      
    case 'unknown':
      // CN: 未知组件类型，返回占位符
      return `## Unsupported Component: ${componentIR.displayName || componentIR.filename}\n\n${componentIR.content}\n\n---\n`;
      
    default:
      // CN: 未知组件类型，返回错误信息
      if (options.verbose) {
        console.warn(`⚠️ Unknown component type for rendering: ${type}`);
      }
      return `## Unknown Component Type: ${type}\n\n*Component type "${type}" is not supported for rendering*\n\n---\n`;
  }
}

// --------------------------------- buildCourseTree ✅ 打印树，用于测试  -------------------------------------
function buildCourseTree(courseRoot) {
  const meta = parseCourseXml(courseRoot);
  const chapters = parseChapters(courseRoot, meta.chapterRefs);
  return { id: meta.courseId, title: meta.title, chapters };
}

// --------------------------------- printCourseTree ✅ 打印树，用于测试  -------------------------------------
/**
 * Pretty print course tree to stdout
 * CN: 以树形打印课程结构
 */
function printCourseTree(courseTree) {
  const lines = [];
  lines.push(`${courseTree.title} [${courseTree.id}]`);
  courseTree.chapters.forEach((ch, i) => {
    const chPrefix = `  ├─`;
    lines.push(`${chPrefix} Chapter: ${ch.title} [${ch.id}]`);
    ch.sequentials.forEach((sq, j) => {
      const sqPrefix = `  │  ├─`;
      lines.push(`${sqPrefix} Unit: ${sq.title} [${sq.id}]`);
      sq.verticals.forEach((vt, k) => {
        const vtPrefix = `  │  │  ├─`;
        lines.push(`${vtPrefix} Vertical: ${vt.title} [${vt.id}]`);
        vt.components.forEach((c, m) => {
          const cPrefix = `  │  │  │  ├─`;
          lines.push(`${cPrefix} Component: ${c.kind} (${c.id})`);
        });
      });
    });
  });
  console.log(lines.join('\n'));
}

// --------------------------------- processCourses ✅ -------------------------------------

/**
 * Process course files (extract and prepare for conversion)
 * CN: 处理课程文件（解压并准备转换）
 * @param {string[]} tarGzFiles - Array of .tar.gz file paths
 * @description Extracts each course file and prepares for conversion
 * @example
 * processCourses(['course1.tar.gz', 'course2.tar.gz']);
 */
async function processCourses(tarGzFiles) {
  console.log('Processing courses...');
  
  const extractedDirs = [];
  const parsedSummaries = [];
  const trees = [];
  
  // Process each course file
  // CN: 处理每个课程文件
  for (let i = 0; i < tarGzFiles.length; i++) {
    const file = tarGzFiles[i];
    const fileName = path.basename(file, '.tar.gz');
    
    console.log(`Processing course ${i + 1}/${tarGzFiles.length}: ${fileName}`);
    
    try {
      // Extract course file
      // CN: 解压课程文件
      const extractedDir = await extractCourse(file);
      extractedDirs.push({ fileName, extractedDir });
      
      console.log(`Successfully extracted: ${fileName}`);
      
      // Resolve course root and build course tree (parse structure)
      // CN: 解析课程根目录并构建课程树（解析结构）
      const courseRoot = resolveCourseRoot(extractedDir);
      const courseTree = buildCourseTree(courseRoot);
      parsedSummaries.push({ fileName, title: courseTree.title, chapters: courseTree.chapters.length });
      trees.push({ fileName, tree: courseTree });
      
    } catch (error) {
      console.error(`Failed to extract ${fileName}: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
  }
  
  // Report parsing summary
  // CN: 输出解析摘要
  console.log(`\n Extracted ${extractedDirs.length} courses successfully`);
  if (parsedSummaries.length > 0) {
    console.log('Parsed course structures:');
    parsedSummaries.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.fileName} → "${s.title}" (chapters: ${s.chapters})`);
    });
  }
  if (options.printTree && trees.length > 0) {
    console.log('\nCourse Trees:');
    trees.forEach(({ fileName, tree }, idx) => {
      console.log(`\n#${idx + 1} ${fileName}`);
      printCourseTree(tree);
    });
  }
  console.log('Next step: Transform components to LiaScript Markdown');
  
  // Do not clean temp in this run; keep files for inspection
  // CN: 本次进程内不清理 temp，保留供检查
}


// --------------------------------- displayResults ✅ -------------------------------------

/**
 * Display processing results
 * CN: 显示处理结果
 * @param {string[]} tarGzFiles - Array of .tar.gz file paths
 * @description Shows summary of files to be processed
 * @example
 * displayResults(['course1.tar.gz', 'course2.tar.gz']);
 *  Output: 1. course1 -> /output/course1/
 *          2. course2 -> /output/course2/
 */
function displayResults(tarGzFiles) {
  // List files to be processed
  // CN: 列出要处理的文件
  tarGzFiles.forEach((file, index) => {
    const fileName = path.basename(file, '.tar.gz');
    console.log(`   ${index + 1}. ${fileName} -> ${path.join(resolvedOutputPath, fileName)}/`);
  });
  
  console.log('✅ Input validation and file processing completed');
  console.log('📝 Next step: Implement course extraction and conversion');
}

// --------------------------------- transformCourseToMarkdown ❌ -------------------------------------
/**
 * Transform course tree to LiaScript Markdown
 * CN: 将课程树转换为 LiaScript Markdown
 * @param {Object} courseTree - Course tree structure
 * @param {string} courseRoot - Course root directory path
 * @returns {string} - Complete LiaScript Markdown content
 * @description Converts complete course structure to LiaScript Markdown format
 * @throws {Error} When transformation fails
 * @example
 * const markdown = transformCourseToMarkdown(courseTree, '/temp/course1');
 * Returns: "# Course Title\n\n## Chapter 1\n\n### Unit 1\n\nComponent content..."
 */
function transformCourseToMarkdown(courseTree, courseRoot) {
  // CN: 验证输入参数
  if (!courseTree || !courseTree.title || !courseTree.chapters) {
    throw new Error('Invalid course tree: title and chapters are required');
  }
  
  if (!courseRoot) {
    throw new Error('Course root directory is required');
  }
  
  const lines = [];
  
  // CN: 添加课程标题
  lines.push(`# ${courseTree.title}\n`);
  
  // CN: 添加课程元数据
  lines.push(`**Course ID:** ${courseTree.id}\n`);
  lines.push(`**Total Chapters:** ${courseTree.chapters.length}\n\n`);
  lines.push('---\n');
  
  // CN: 递归处理每个章节
  courseTree.chapters.forEach((chapter, chapterIndex) => {
    lines.push(transformChapterToMarkdown(chapter, chapterIndex + 1, courseRoot));
  });
  
  // CN: 添加课程结束标记
  lines.push('\n---\n');
  lines.push('*Course conversion completed*\n');
  
  return lines.join('\n');
}

// --------------------------------- transformChapterToMarkdown ❌ -------------------------------------
/**
 * Transform chapter to Markdown
 * CN: 将章节转换为 Markdown
 * @param {Object} chapter - Chapter object
 * @param {number} chapterNumber - Chapter number
 * @param {string} courseRoot - Course root directory path
 * @returns {string} - Chapter Markdown content
 * @description Converts chapter structure to Markdown format
 */
function transformChapterToMarkdown(chapter, chapterNumber, courseRoot) {
  const lines = [];
  
  // CN: 添加章节标题
  lines.push(`## ${chapterNumber}. ${chapter.title}\n`);
  
  // CN: 添加章节元数据
  lines.push(`**Chapter ID:** ${chapter.id}\n`);
  lines.push(`**Total Units:** ${chapter.sequentials.length}\n\n`);
  
  // CN: 处理每个序列（单元）
  chapter.sequentials.forEach((sequential, sequentialIndex) => {
    lines.push(transformSequentialToMarkdown(sequential, sequentialIndex + 1, courseRoot));
  });
  
  // CN: 添加章节分隔线
  lines.push('\n---\n');
  
  return lines.join('\n');
}

// --------------------------------- transformSequentialToMarkdown ❌ -------------------------------------
/**
 * Transform sequential (unit) to Markdown
 * CN: 将序列（单元）转换为 Markdown
 * @param {Object} sequential - Sequential object
 * @param {number} sequentialNumber - Sequential number
 * @param {string} courseRoot - Course root directory path
 * @returns {string} - Sequential Markdown content
 * @description Converts sequential structure to Markdown format
 */
function transformSequentialToMarkdown(sequential, sequentialNumber, courseRoot) {
  const lines = [];
  
  // CN: 添加单元标题
  lines.push(`### ${sequentialNumber}. ${sequential.title}\n`);
  
  // CN: 添加单元元数据
  lines.push(`**Unit ID:** ${sequential.id}\n`);
  lines.push(`**Total Verticals:** ${sequential.verticals.length}\n\n`);
  
  // CN: 处理每个垂直单元
  sequential.verticals.forEach((vertical, verticalIndex) => {
    lines.push(transformVerticalToMarkdown(vertical, verticalIndex + 1, courseRoot));
  });
  
  // CN: 添加单元分隔线
  lines.push('\n---\n');
  
  return lines.join('\n');
}

// --------------------------------- transformVerticalToMarkdown ❌ -------------------------------------
/**
 * Transform vertical to Markdown
 * CN: 将垂直单元转换为 Markdown
 * @param {Object} vertical - Vertical object
 * @param {number} verticalNumber - Vertical number
 * @param {string} courseRoot - Course root directory path
 * @returns {string} - Vertical Markdown content
 * @description Converts vertical structure to Markdown format
 */
function transformVerticalToMarkdown(vertical, verticalNumber, courseRoot) {
  const lines = [];
  
  // CN: 添加垂直单元标题
  lines.push(`#### ${verticalNumber}. ${vertical.title}\n`);
  
  // CN: 添加垂直单元元数据
  lines.push(`**Vertical ID:** ${vertical.id}\n`);
  lines.push(`**Total Components:** ${vertical.components.length}\n\n`);
  
  // CN: 处理每个组件
  vertical.components.forEach((component, componentIndex) => {
    try {
      // CN: 解析组件内容
      const componentIR = parseComponent(courseRoot, component);
      
      // CN: 渲染组件为 Markdown
      const componentMarkdown = renderComponent(componentIR);
      
      // CN: 添加组件内容
      lines.push(componentMarkdown);
      
    } catch (error) {
      // CN: 组件处理失败，添加错误信息
      if (options.verbose) {
        console.warn(`⚠️ Failed to process component ${component.kind} (${component.id}): ${error.message}`);
      }
      
      lines.push(`#### Component ${componentIndex + 1}: ${component.kind} (${component.id})\n`);
      lines.push(`*Error processing component: ${error.message}*\n\n---\n`);
    }
  });
  
  // CN: 添加垂直单元分隔线
  lines.push('\n---\n');
  
  return lines.join('\n');
}


// ------------------------------------- Main -----------------------------------------
// ------------------------------------------------------------------------------------
// Main function
// CN: 主函数
async function main() {
  console.log('🚀 Starting course conversion...');
  
  try {
    // Prepare temp root at the beginning of the run
    // CN: 在进程开始时清理并创建临时目录根
    prepareTempRoot();

    // Display configuration
    // CN: 显示配置
    displayConfiguration();
    
    // Validate input and setup output
    // CN: 验证输入并设置输出
    const tarGzFiles = validateAndSetup();
    
    // Process courses
    // CN: 处理课程
    await processCourses(tarGzFiles);
    
    // Display results
    // CN: 显示结果
    displayResults(tarGzFiles);
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
// CN: 运行主函数
main();
