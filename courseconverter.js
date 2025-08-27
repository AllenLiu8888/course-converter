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

// --------------------------------- processCourses ❌ -------------------------------------

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
