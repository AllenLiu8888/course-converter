#!/usr/bin/env node
// =================================== MODULES ===================================
// Built-in modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party modules
import { program } from 'commander';
import * as tar from 'tar';
import { XMLParser } from 'fast-xml-parser';
import NodeHtmlMarkdown from 'node-html-markdown';

// Get current file path - ES Modules requirement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================================================================================
// =================================== CLI SETUP =================================================
// ===============================================================================================
// Only setup CLI when running as main script, not when imported as module

let options = { verbose: false };
let resolvedInputPath = '';
let resolvedOutputPath = '';
const TEMP_ROOT = path.join(process.cwd(), 'temp');

// Check if running as main script
const isMainScript = import.meta.url === `file://${process.argv[1]}`;

if (isMainScript) {
  // Configure command line interface
  program
    .name('courseconverter')
    .description('Convert Open edX OLX courses to LiaScript Markdown format')
    .version('1.0.0')
    .argument('<input>', 'Input path: single .tar.gz file or directory containing multiple courses')
    .argument('<output>', 'Output directory for converted courses')
    .option('-v, --verbose', 'Enable verbose logging')
    .helpOption('-h, --help', 'Display help information')
    .parse(process.argv);

  // Get parsed options and arguments
  options = program.opts();
  const [inputPath, outputPath] = program.args;

  // Resolve absolute paths
  resolvedInputPath = path.resolve(process.cwd(), inputPath);
  resolvedOutputPath = path.resolve(process.cwd(), outputPath);
}

// ================================================================================================
// =================================== Input Module ===============================================
// ================================================================================================
// display Configuration info in verbose mode
function displayConfiguration() {
  if (options.verbose) {
    console.log(`Processing: ${resolvedInputPath} → ${resolvedOutputPath}`);
  }
}

// Prepare temp root: clean previous run artifacts and recreate root
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

// Get file information and validate input path
/**
 * Get file information and validate input path
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
    if (!inputPath.endsWith('.tar.gz')) {
      throw new Error(`Input file must be a .tar.gz file: ${inputPath}`);
    }
    result.isValid = true;
    result.files = [inputPath];
    
  } else if (stats.isDirectory()) {
    // Directory validation
    const files = fs.readdirSync(inputPath);
    const tarGzFiles = files.filter(file => file.endsWith('.tar.gz')); // Return: ['file1.tar.gz', 'file2.tar.gz']
    
    if (tarGzFiles.length === 0) {
      throw new Error(`Input directory contains no .tar.gz files: ${inputPath}`);
    }
    
    result.isValid = true;
    result.files = tarGzFiles.map(file => path.join(inputPath, file)); // Return: ['/path/to/input/file1.tar.gz', '/path/to/input/file2.tar.gz']
    

    if (options.verbose && result.isValid) {
      if (result.files.length === 1) {
        console.log(`Found single .tar.gz file: ${path.basename(result.files[0])}`);
      } else {
        console.log(`Found ${result.files.length} .tar.gz files:`);
        result.files.forEach(file => console.log(`   - ${path.basename(file)}`));
      }
    }

  }
  
  return result;
}

// Validate input path
/**
 * Validate input path
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

// Get list of .tar.gz files to process
/**
 * Get list of .tar.gz files to process

 * @param {string} inputPath - Input path (file or directory)
 * @returns {string[]} - Array of .tar.gz file paths
 * @description Scans input path and returns array of .tar.gz files
 * @throws {Error} When input path is invalid
 */
function getTarGzFiles(inputPath) {
  const fileInfo = getFileInfo(inputPath);
  return fileInfo.files;
}

// ================================================================================================
// =================================== Extract Module =============================================
// ================================================================================================

// Extract .tar.gz file to temporary directory
/**
 * Extract .tar.gz file to temporary directory
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
  const tempDir = path.join(TEMP_ROOT, path.basename(tarGzPath, '.tar.gz'));
  
  // Clean up existing temp directory if it exists
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Create temp directory
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // Extract .tar.gz file using tar library
    await tar.extract({
      file: tarGzPath,
      cwd: tempDir,
      strip: 1
    });
    
    if (options.verbose) {
      console.log(`Extracted to: ${tempDir}`);
    }
    
    return tempDir;
  } catch (error) {
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw new Error(`Failed to extract course: ${error.message}`);
  }
}

/**
 * Clean up temporary extracted files

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

// Create XML parser instance from fast-xml-parser
function createXmlParser() {
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
}
// ================================================================================================
// =================================== Processing Module ===========================================
// ================================================================================================

// Read and parse XML file
function readXmlAsObject(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = createXmlParser();
  return parser.parse(xml);
}

// Normalize value to array
function toArray(maybeArray) {
  if (maybeArray == null) return [];
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

// Resolve course root directory
/**
 * Resolve course root directory

 * @param {string} extractedDir - Path to extracted directory
 * @returns {string} - Path to course root directory
 * @description Resolves course root directory from extracted directory
 * @throws {Error} When course root directory cannot be resolved
 * @example
 * const courseRoot = resolveCourseRoot('/path/to/extracted/course/');
 * Returns: '/path/to/extracted/course/'
 */
function resolveCourseRoot(extractedDir) {
  const courseXmlPath = path.join(extractedDir, 'course.xml');
  
  if (fs.existsSync(courseXmlPath)) {
    return extractedDir;
  } else {
    throw new Error(`course.xml not found under ${extractedDir}`);
  }
}

// Parse course.xml file to get course information
/**
 * Parse course.xml file to get course information
 * @param {string} courseRoot - Path to course root directory
 * @returns {Object} - Course information
 * @description Parses course.xml file to get course information
 * @throws {Error} When course.xml file is not found
 */
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

// Parse chapters from course.xml
/**
 * Parse chapters from course.xml
 * @param {string} courseRoot - Path to course root directory
 * @param {string[]} chapterRefs - Array of chapter references
 * @returns {Object[]} - Array of chapter information
 */
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

// Parse sequentials from course.xml
/**
 * Parse sequentials from course.xml
 * @param {string} courseRoot - Path to course root directory
 * @param {string[]} sequentialRefs - Array of sequential references
 * @returns {Object[]} - Array of sequential information
 */
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

// Parse verticals from course.xml
/**
 * Parse verticals from course.xml
 * @param {string} courseRoot - Path to course root directory
 * @param {string[]} verticalRefs - Array of vertical references
 * @returns {Object[]} - Array of vertical information
 */
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

// Collect component references from vertical node
/**
 * Collect component references from vertical node
 * @param {Object} verticalNode - Vertical node object
 * @returns {Object[]} - Array of component references
 */
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

// ================================================================================================
// =================================== Component Parsing Module ===================================
// ================================================================================================

// ----------------------------------- Component Parsing Main ------------------------------------

// Parse component content based on type
/**
 * Parse component content based on type

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
  if (!courseRoot || !component) {
    throw new Error('Invalid parameters: courseRoot and component are required');
  }
  
  if (!component.kind || !component.id) {
    throw new Error('Invalid component: kind and id are required');
  }
  
  const { kind, id } = component;
  
  switch (kind.toLowerCase()) {
    case 'html':
      return parseHtmlComponent(courseRoot, id);
      
    case 'problem':
      return parseProblemComponent(courseRoot, component);
      
    case 'video':
      return parseVideoComponent(courseRoot, component);
      
    case 'about':
      return parseAboutComponent(courseRoot, component);
      
    default:
      if (options.verbose) {
        console.warn(`Unknown component type: ${kind} (${id})`);
      }
      return {
        type: 'unknown',
        content: `*Unsupported component type: ${kind} (${id})*`,
        filename: id,
        displayName: id
      };
  }
}

// ----------------------------------- HTML ------------------------------------

// Parse HTML component content
/**
 * Parse HTML component content
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
  const htmlXmlPath = path.join(courseRoot, 'html', `${componentId}.xml`);
  const htmlContentPath = path.join(courseRoot, 'html', `${componentId}.html`);
  
  if (!fs.existsSync(htmlXmlPath)) {
    throw new Error(`HTML component XML not found: ${htmlXmlPath}`);
  }
  
  if (!fs.existsSync(htmlContentPath)) {
    throw new Error(`HTML component content not found: ${htmlContentPath}`);
  }
  
  const htmlContent = fs.readFileSync(htmlContentPath, 'utf8');
  
  const xmlObj = readXmlAsObject(htmlXmlPath);
  const xmlNode = xmlObj.html || xmlObj.HTML || {};
  
  return {
    type: 'html',
    content: htmlContent,
    filename: componentId,
    displayName: xmlNode['@_display_name'] || componentId
  };
}


// ----------------------------------- Problem ------------------------------------

// Parse problem component content
/**
 * Parse problem component content
 * @param {string} courseRoot - 课程根目录
 * @param {Object} component - 组件信息
 * @returns {Object} - Parsed problem component data
 * @description Reads problem XML file and returns parsed data
 * @throws {Error} When problem file is not found
 * @example
 * const problemData = parseProblemComponent('/temp/course1', 'problem1');
 * Returns: { type: 'problem', content: '<p>Hello World</p>', filename: 'problem1' }
 */
function parseProblemComponent(courseRoot, component) {
  const { id, displayName } = component;
  const problemPath = path.join(courseRoot, 'problem', `${id}.xml`);
  
  if (!fs.existsSync(problemPath)) {
    throw new Error(`Problem file not found: ${problemPath}`);
  }
  
  const xmlContent = fs.readFileSync(problemPath, 'utf8');
  const parsed = readXmlAsObject(problemPath);
  
  if (!parsed.problem) {
    throw new Error(`Invalid problem XML structure: ${id}`);
  }
  
  const problem = parsed.problem;
  const problemDisplayName = problem['@_display_name'] || displayName || id;
  
  return {
    type: 'problem',
    content: problem,
    filename: id,
    displayName: problemDisplayName,
    problemType: determineProblemType(problem)
  };
}

// Determine problem type
/**
 * Determine problem type
 * @param {Object} problem - Problem object
 * @returns {string} Problem type
 */
function determineProblemType(problem) {
  if (problem.multiplechoiceresponse) {
    return 'multiple_choice';
  } else if (problem.choiceresponse) {
    const choiceResponse = problem.choiceresponse;
    if (choiceResponse.checkboxgroup) {
      return 'multiple_choice';
    } else if (choiceResponse.choicegroup) {
      return 'choice';
    }
    return 'choice';
  } else if (problem.optionresponse) {
    return 'selection';
  } else if (problem.stringresponse) {
    return 'text_input';
  } else if (problem.numericalresponse) {
    return 'number_input';
  } else if (problem.formularesponse) {
    return 'formula';
  } else if (problem.coderesponse) {
    return 'code';
  } else {
    return 'unknown';
  }
}

// ----------------------------------- Video ------------------------------------

// Parse video component
/**
 * Parse video component
 * @param {Object} component - Component information
 * @returns {Object} Video component intermediate representation
 * @description Reads video XML file and returns parsed data
 * @throws {Error} When video file is not found
 * @example
 * const videoData = parseVideoComponent('/temp/course1', 'video1');
 * Returns: { type: 'video', content: '<p>Hello World</p>', filename: 'video1' }
 */
function parseVideoComponent(courseRoot, component) {
  const { id, displayName } = component;
  const videoPath = path.join(courseRoot, 'video', `${id}.xml`);
  
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  
  const xmlContent = fs.readFileSync(videoPath, 'utf8');
  const parsed = readXmlAsObject(videoPath);
  
  if (!parsed.video) {
    throw new Error(`Invalid video XML structure: ${id}`);
  }
  
  const video = parsed.video;
  const videoDisplayName = video['@_display_name'] || displayName || id;
  
  return {
    type: 'video',
    content: video,
    filename: id,
    displayName: videoDisplayName,
    videoType: determineVideoType(video)
  };
}

// Determine video type
/**
 * Determine video type
 * @param {Object} video - Video object
 * @returns {string} Video type
 */
function determineVideoType(video) {
  if (video['@_youtube']) {
    return 'youtube';
  } else if (video['@_url_name']) {
    return 'external';
  } else {
    return 'unknown';
  }
}


  // ----------------------------------- About ------------------------------------

// Parse about component
/**
 * Parse about component
 * @param {string} courseRoot - Course root directory path
 * @param {Object} component - Component information
 * @returns {Object} About component intermediate representation
 * @description Reads about XML file and returns parsed data
 * @throws {Error} When about file is not found
 * @example
 * const aboutData = parseAboutComponent('/temp/course1', 'about1');
 * Returns: { type: 'about', content: '<p>Hello World</p>', filename: 'about1' }
 */
function parseAboutComponent(courseRoot, component) {
  const { id, displayName } = component;
  const aboutDir = path.join(courseRoot, 'about');
  
  if (!fs.existsSync(aboutDir)) {
    throw new Error(`About directory not found: ${aboutDir}`);
  }
  
  const aboutFiles = fs.readdirSync(aboutDir);
  const htmlFiles = aboutFiles.filter(file => file.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in about directory: ${aboutDir}`);
  }
  
  const aboutHtmlPath = path.join(aboutDir, htmlFiles[0]);
  const htmlContent = fs.readFileSync(aboutHtmlPath, 'utf8');
  
  return {
    type: 'about',
    content: htmlContent,
    filename: htmlFiles[0],
    displayName: displayName || 'About This Course',
    aboutType: 'html'
  };
}


// ================================================================================================
// =================================== Component Rendering Module =================================
// ================================================================================================

// ----------------------------------- Component Rendering Main ------------------------------------

// Render component to LiaScript Markdown
/**
 * Render component to LiaScript Markdown
 * @param {Object} componentIR - Component intermediate representation
 * @returns {string} LiaScript Markdown content
 * @description Converts component data to LiaScript Markdown format
 * @throws {Error} When component data is invalid
 * @example
 * const markdown = renderComponent(componentData);
 */
function renderComponent(componentIR) {
  if (!componentIR || !componentIR.type) {
    throw new Error('Invalid component data: type is required');
  }
  
  const { type } = componentIR;
  
  switch (type.toLowerCase()) {
    case 'html':
      return renderHtmlContent(componentIR);
      
    case 'problem':
      return renderProblemComponent(componentIR);
      
    case 'video':
      return renderVideoComponent(componentIR);
      
    case 'about':
      return renderAboutComponent(componentIR);
      
    case 'unknown':
      return `## Unsupported Component: ${componentIR.displayName || componentIR.filename}\n\n${componentIR.content}\n\n---\n`;
      
    default:
      if (options.verbose) {
        console.warn(`Unknown component type for rendering: ${type}`);
      }
      return `## Unknown Component Type: ${type}\n\n*Component type "${type}" is not supported for rendering*\n\n---\n`;
  }
}

// ----------------------------------- HTML ------------------------------------

// Render HTML content to LiaScript Markdown
/**
 * Render HTML content to LiaScript Markdown
 * @param {Object} htmlIR - HTML component intermediate representation
 * @returns {string} - LiaScript Markdown content
 * @description Converts HTML content to LiaScript Markdown format using node-html-markdown
 * @example
 * const markdown = renderHtmlContent(htmlData);
 * Returns: "# HTML Content\n\nHello World"
 */
function renderHtmlContent(htmlIR) {
  if (!htmlIR || htmlIR.type !== 'html') {
    throw new Error('Invalid HTML component data');
  }
  
  const htmlContent = htmlIR.content;
  
  const processedContent = rewriteMediaPaths(htmlContent);
  
  const markdown = NodeHtmlMarkdown.NodeHtmlMarkdown.translate(processedContent, {
    bulletListMarker: '-',
    codeFence: '```',
    emDelimiter: '*',
    fence: '```',
    headingStyle: 'atx',
    hr: '---',
    strongDelimiter: '**',
    textReplace: [
      [/\s+/g, ' '],
      [/\n\s*\n\s*\n/g, '\n\n']
    ]
  });
  
  if (!markdown || markdown.trim() === '') {
    return '*No content available*';
  }
  
  return markdown.trim();
}


// ----------------------------------- Problem ------------------------------------

// Render problem component to LiaScript Markdown
/**
   * Render problem component to LiaScript Markdown
   * @param {Object} problemIR - Problem component intermediate representation
   * @returns {string} LiaScript Markdown content
   * @description Converts problem component data to LiaScript Markdown format
   * @throws {Error} When problem component data is invalid
   * @example
   * const markdown = renderProblemComponent(problemData);
 */
function renderProblemComponent(problemIR) {
  if (!problemIR || problemIR.type !== 'problem') {
    throw new Error('Invalid problem component data');
  }
  
  const { content, displayName, problemType } = problemIR;
  
  switch (problemType) {
    case 'multiple_choice':
      return renderMultipleChoiceProblem(content, displayName);
    case 'choice':
      return renderChoiceProblem(content, displayName);
    case 'selection':
      return renderSelectionProblem(content, displayName);
    case 'text_input':
      return renderTextInputProblem(content, displayName);
    case 'number_input':
      return renderNumberInputProblem(content, displayName);
    default:
      return renderUnsupportedProblem(content, displayName, problemType);
  }
}

// Extract hints from problem content
/**
 * Extract hints from problem content
 * @param {Object} content - Problem content
 * @returns {string[]} Array of hint texts
 */
function extractHints(content) {
  const hints = [];
  
  if (content.hint) {
    const hintArray = toArray(content.hint);
    hintArray.forEach(hint => {
      if (typeof hint === 'string') {
        hints.push(hint.trim());
      } else if (hint['#text']) {
        hints.push(hint['#text'].trim());
      }
    });
  }
  
  if (content.demotedhint) {
    const demotedHints = toArray(content.demotedhint);
    demotedHints.forEach(hint => {
      if (typeof hint === 'string') {
        hints.push(hint.trim());
      } else if (hint['#text']) {
        hints.push(hint['#text'].trim());
      }
    });
  }
  
  if (content.description) {
    const descriptionArray = toArray(content.description);
    descriptionArray.forEach(desc => {
      if (typeof desc === 'string') {
        hints.push(desc.trim());
      } else if (desc['#text']) {
        hints.push(desc['#text'].trim());
      }
    });
  }
  
  return hints.filter(Boolean);
}

// Render multiple choice problem
/**
 * Render multiple choice problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderMultipleChoiceProblem(content, displayName) {
  const lines = [];
  
  const multipleChoice = content.multiplechoiceresponse;
  if (multipleChoice) {
    const pContent = multipleChoice.p || '';
    const labelContent = multipleChoice.label || '';
    if (pContent) {
      lines.push(`${pContent}\n`);
    }
    if (labelContent) {
      lines.push(`${labelContent}\n`);
    }
    
    const choiceGroup = multipleChoice.choicegroup;
    if (choiceGroup && choiceGroup.choice && Array.isArray(choiceGroup.choice)) {
      choiceGroup.choice.forEach((choice, choiceIndex) => {
        const isCorrect = choice['@_correct'] === 'true';
        const choiceText = choice['#text'] || choice;
        const marker = isCorrect ? '[[X]]' : '[[ ]]';
        lines.push(`- ${marker} ${choiceText}`);
      });
    }
    
    const hints = extractHints(multipleChoice);
    hints.forEach(hint => {
      lines.push(`- [[?]] ${hint}`);
    });
  }
  
  const choiceResponse = content.choiceresponse;
  if (choiceResponse) {
    const pContent = choiceResponse.p || '';
    const labelContent = choiceResponse.label || '';
    if (pContent) {
      lines.push(`${pContent}\n`);
    }
    if (labelContent) {
      lines.push(`${labelContent}\n`);
    }
    
    const checkboxGroup = choiceResponse.checkboxgroup;
    if (checkboxGroup && checkboxGroup.choice && Array.isArray(checkboxGroup.choice)) {
      checkboxGroup.choice.forEach((choice, choiceIndex) => {
        const isCorrect = choice['@_correct'] === 'true';
        const choiceText = choice['#text'] || choice;
        const marker = isCorrect ? '[[X]]' : '[[ ]]';
        lines.push(`- ${marker} ${choiceText}`);
      });
    }
    
    const hints = extractHints(choiceResponse);
    hints.forEach(hint => {
      lines.push(`- [[?]] ${hint}`);
    });
  }
  
  return lines.join('\n');
}

// Render dropdown problem
/**
 * Render selection problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderSelectionProblem(content, displayName) {
  const lines = [];
  const node = content.optionresponse;
  if (!node) return '';

  const pContent = node.p || '';
  const labelContent = node.label || '';
  if (pContent) {
    lines.push(`${pContent}\n`);
  }
  if (labelContent) {
    lines.push(`${labelContent}\n`);
  }

  const options = toArray(node.optioninput && node.optioninput.option);
  if (options.length > 0) {
    const rendered = options
      .map(opt => {
        const text = (typeof opt === 'string') ? opt : (opt['#text'] || '');
        const isCorrect = (typeof opt === 'object') && String(opt['@_correct']).toLowerCase() === 'true';
        return isCorrect ? `( ${text} )` : `${text}`;
      })
      .join(' | ');
    lines.push(`[[ ${rendered} ]]`);
  }
  
  const hints = extractHints(node);
  hints.forEach(hint => {
    lines.push(`- [[?]] ${hint}`);
  });

  return lines.join('\n');
}

// Render choice problem
/**
 * Render choice problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderChoiceProblem(content, displayName) {
  const lines = [];
  
  const choice = content.choiceresponse;
  if (choice) {
    const pContent = choice.p || '';
    const labelContent = choice.label || '';
    if (pContent) {
      lines.push(`${pContent}\n`);
    }
    if (labelContent) {
      lines.push(`${labelContent}\n`);
    }
    
    const choiceGroup = choice.choicegroup;
    if (choiceGroup && choiceGroup.choice && Array.isArray(choiceGroup.choice)) {
      choiceGroup.choice.forEach((choice, choiceIndex) => {
        const isCorrect = choice['@_correct'] === 'true';
        const choiceText = choice['#text'] || choice;
        const marker = isCorrect ? '[(X)]' : '[( )]';
        lines.push(`- ${marker} ${choiceText}`);
      });
    }
    
    const hints = extractHints(choice);
    hints.forEach(hint => {
      lines.push(`- [[?]] ${hint}`);
    });
  }
  
  return lines.join('\n');
}

// Render text input problem
/**
 * Render text input problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderTextInputProblem(content, displayName) {
  const lines = [];
  const pContent = (content.stringresponse && content.stringresponse.p) || '';
  const labelContent = (content.stringresponse && content.stringresponse.label) || '';
  if (pContent) {
    lines.push(`${pContent}\n`);
  }
  if (labelContent) {
    lines.push(`${labelContent}\n`);
  }

  const stringResponse = content.stringresponse;
  if (stringResponse) {
    const primary = (stringResponse['@_answer'] || '').toString().trim();
    const variants = toArray(stringResponse.additional_answer)
      .map(v => (typeof v === 'string' ? v : (v['@_answer'] || '')).toString().trim())
      .filter(Boolean);
    const allAnswers = [primary, ...variants].filter(Boolean);

    if (allAnswers.length > 0) {
      lines.push(`\n    [[${allAnswers.join(' | ')}]]\n`);
    } else {
      lines.push(`\n    [[ ]]\n`);
    }
    
    const hints = extractHints(stringResponse);
    hints.forEach(hint => {
      lines.push(`- [[?]] ${hint}`);
    });
  }

  return lines.join('\n');
}

// Render number input problem
/**
 * Render number input problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderNumberInputProblem(content, displayName) {
  const lines = [];
  
  const numericalResponse = content.numericalresponse;
  if (numericalResponse) {
    const pContent = numericalResponse.p || '';
    const labelContent = numericalResponse.label || '';
    if (pContent) {
      lines.push(`${pContent}\n`);
    }
    if (labelContent) {
      lines.push(`${labelContent}\n`);
    }
    lines.push('    [[Enter a number]]\n');
    
    const hints = extractHints(numericalResponse);
    hints.forEach(hint => {
      lines.push(`- [[?]] ${hint}`);
    });
  }
  
  return lines.join('\n');
}

// Render unsupported problem
/**
 * Render unsupported problem
 * @param {Object} content - Problem content
 * @param {string} displayName - Display name
 * @param {string} problemType - Problem type
 * @returns {string} Markdown content
 */
function renderUnsupportedProblem(content, displayName, problemType) {
  const lines = [];
  const pContent = content.p || '';
  if (pContent) {
    lines.push(`${pContent}\n`);
  }
  if (displayName) {
    lines.push(`${displayName}\n`);
  }
  lines.push(`*仅支持多选、单选、下拉选择、文本输入、数字输入问题，${problemType} 类型暂不支持。*\n`);
  
  const hints = extractHints(content);
  hints.forEach(hint => {
    lines.push(`- [[?]] ${hint}`);
  });
  
  return lines.join('\n');
}


// ----------------------------------- Video ------------------------------------

// Render video component to LiaScript Markdown
/**
 * Render video component to LiaScript Markdown
 * @param {Object} videoIR - Video component intermediate representation
 * @returns {string} LiaScript Markdown content
 * @description Converts video component data to LiaScript Markdown format
 * @throws {Error} When video component data is invalid
 * @example
 * const markdown = renderVideoComponent(videoData);
 */
function renderVideoComponent(videoIR) {
  if (!videoIR || videoIR.type !== 'video') {
    throw new Error('Invalid video component data');
  }
  
  const { content, displayName, videoType } = videoIR;
  
  switch (videoType) {
    case 'youtube':
      return renderYouTubeVideo(content, displayName);
    case 'external':
      return renderExternalVideo(content, displayName);
    default:
      return renderUnsupportedVideo(content, displayName);
  }
}

// Render YouTube video
/**
 * Render YouTube video
 * @param {Object} content - Video content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderYouTubeVideo(content, displayName) {
  const lines = [];
  
  const youtubeAttr = content['@_youtube'];
  if (youtubeAttr) {
    const parts = youtubeAttr.split(':');
    if (parts.length >= 2) {
      const videoId = parts[1];
      lines.push(`**${displayName}**\n`);
      lines.push(`Watch the video below:\n`);
      lines.push(`\n!?[${displayName}](https://www.youtube.com/watch?v=${videoId})\n`);
    } else {
      lines.push(`**${displayName}**\n`);
      lines.push(`*Video ID could not be extracted*\n`);
    }
  }
  
  return lines.join('\n');
}

// Render external video
/**
 * Render external video
 * @param {Object} content - Video content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderExternalVideo(content, displayName) {
  const lines = [];
  
  const urlName = content['@_url_name'];
  if (urlName) {
    lines.push(`**${displayName}**\n`);
    lines.push(`Watch the video below:\n`);
    lines.push(`\n!?[${displayName}](${urlName})\n`);
  } else {
    lines.push(`**${displayName}**\n`);
    lines.push('*Video URL not found*\n');
  }
  
  return lines.join('\n');
}

// Render unsupported video
/**
 * Render unsupported video
 * @param {Object} content - Video content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderUnsupportedVideo(content, displayName) {
  const lines = [];
  lines.push(`**${displayName}**\n`);
  lines.push('*仅支持 YouTube 和外部 URL 视频，其他视频类型暂不支持。*\n');
  return lines.join('\n');
}


// ----------------------------------- About ------------------------------------

// Render about component to LiaScript Markdown
/**
 * Render about component to LiaScript Markdown
 * @param {Object} aboutIR - About component intermediate representation
 * @returns {string} LiaScript Markdown content
 * @description Converts about component data to LiaScript Markdown format
 * @throws {Error} When about component data is invalid
 * @example
 * const markdown = renderAboutComponent(aboutData);
 */
function renderAboutComponent(aboutIR) {
  if (!aboutIR || aboutIR.type !== 'about') {
    throw new Error('Invalid about component data');
  }
  
  const { content, displayName, aboutType } = aboutIR;
  
  switch (aboutType) {
    case 'html':
      return renderAboutHtml(content, displayName);
    default:
      return renderUnknownAbout(content, displayName);
  }
}

// Render about HTML content
/**
 * Render about HTML content
 * @param {string} content - HTML content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 * @description Converts about HTML content to LiaScript Markdown format
 * @throws {Error} When about HTML content is invalid
 * @example
 * const markdown = renderAboutHtml(aboutData);
 */
function renderAboutHtml(content, displayName) {
  const lines = [];
  lines.push(`## ${displayName}\n`);
  
  const processedContent = rewriteMediaPaths(content);
  
  const markdown = NodeHtmlMarkdown.NodeHtmlMarkdown.translate(processedContent, {
    bulletListMarker: '-',
    codeFence: '```',
    emDelimiter: '*',
    fence: '```',
    headingStyle: 'atx',
    hr: '---',
    strongDelimiter: '**',
    textReplace: [
      [/\s+/g, ' '],
      [/\n\s*\n\s*\n/g, '\n\n']
    ]
  });
  
  if (markdown && markdown.trim() !== '') {
    lines.push(markdown.trim());
  } else {
    lines.push('*No content available*');
  }
  
  lines.push('\n---\n');
  return lines.join('\n');
}

// Render unknown about type
/**
 * Render unknown about type
 * @param {Object} content - Content
 * @param {string} displayName - Display name
 * @returns {string} Markdown content
 */
function renderUnknownAbout(content, displayName) {
  const lines = [];
  lines.push(`## ${displayName}\n`);
  lines.push('*This about type is not yet supported.*\n');
  lines.push('```json\n' + JSON.stringify(content, null, 2) + '\n```\n');
  lines.push('\n---\n');
  return lines.join('\n');
}


// ================================================================================================
// =================================== Process Courses ============================================
// ================================================================================================


// --------------------------------- Process Main  -------------------------------------

// Process course files (extract and prepare for conversion)
/**
 * Process course files (extract and prepare for conversion)
 * @param {string[]} tarGzFiles - Array of .tar.gz file paths
 * @description Extracts each course file and prepares for conversion
 * @example
 * processCourses(['course1.tar.gz', 'course2.tar.gz']);
 */
async function processCourses(tarGzFiles) {
    // Step 0: Input Files
  console.log('Processing courses...');
  
  const extractedDirs = [];
  const parsedSummaries = [];
  const trees = [];
  const conversionResults = [];
  
  // Process each course file
  for (let i = 0; i < tarGzFiles.length; i++) {
    const file = tarGzFiles[i];
    const fileName = path.basename(file, '.tar.gz');
    
    console.log(`Processing course ${i + 1}/${tarGzFiles.length}: ${fileName}`);
    
    try {
      // Step 1: Extract
      // Extract course file
      const extractedDir = await extractCourse(file);
      extractedDirs.push({ fileName, extractedDir });
      
      console.log(`Successfully extracted: ${fileName}`);
      
      // Step 2: Parse Structure
      // Resolve course root and build course tree (parse structure)
      const courseRoot = resolveCourseRoot(extractedDir);
      const courseTree = buildCourseTree(courseRoot);
      parsedSummaries.push({ fileName, title: courseTree.title, chapters: courseTree.chapters.length });
      trees.push({ fileName, tree: courseTree });
      
      // Step 3: Convert to Markdown
      // Transform course to Markdown
      console.log(`Converting ${fileName} to LiaScript Markdown...`);
      const markdownContent = transformCourseToMarkdown(courseTree, courseRoot);
      
      // Step 4: Generate Output Files
      // Generate output files
      const outputResult = await generateCourseOutput(fileName, markdownContent, courseRoot);
      conversionResults.push({ fileName, ...outputResult });
      
      console.log(`Successfully converted: ${fileName}`);
      
    } catch (error) {
      console.error(`Failed to process ${fileName}: ${error.message}`);
      conversionResults.push({ 
        fileName, 
        success: false, 
        error: error.message,
        outputPath: null,
        mediaCount: 0
      });
    }
  }
  
  // Step 5: Display Results
  const successCount = conversionResults.filter(r => r.success).length;
  const failCount = conversionResults.length - successCount;
  console.log(`\nConversion completed: ${successCount} successful, ${failCount} failed`);
}

// ----------------------------------- Course Tree ------------------------------------

// Build course tree
/**
 * Build course tree
 * @param {string} courseRoot - Course root directory path
 * @returns {Object} Course tree
 */
function buildCourseTree(courseRoot) {
  const meta = parseCourseXml(courseRoot);
  const chapters = parseChapters(courseRoot, meta.chapterRefs);
  return { id: meta.courseId, title: meta.title, chapters };
}


// ================================================================================================
// =================================== Output Module =============================================
// ================================================================================================


// ----------------------------------- Output Main ------------------------------------
// Generate course output files
/**
 * Generate course output files
 * @param {string} fileName - Course file name
 * @param {string} markdownContent - Generated Markdown content
 * @param {string} courseRoot - Course root directory path
 * @returns {Object} - Output generation result
 * @description Creates course-specific directory structure and writes course files
 * @throws {Error} When output generation fails
 * @example
 * const result = await generateCourseOutput('course1', markdown, '/temp/course1');
 * Returns: { success: true, outputPath: '/output/course1', mediaCount: 5 }
 */
async function generateCourseOutput(fileName, markdownContent, courseRoot) {
  try {
    const cleanFileName = fileName.trim().replace(/\s+$/, '');
    
    const courseOutputDir = path.join(resolvedOutputPath, cleanFileName);
    const mediaDir = path.join(courseOutputDir, 'media');
    
    fs.mkdirSync(courseOutputDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });
    
    const markdownPath = path.join(courseOutputDir, 'course.md');
    fs.writeFileSync(markdownPath, markdownContent, 'utf8');
    
    if (options.verbose) {
      console.log(`📝 Wrote course.md: ${markdownPath}`);
    }
    
    const mediaCount = await processMediaFiles(courseRoot, mediaDir);
    
    return {
      success: true,
      outputPath: courseOutputDir,
      mediaCount: mediaCount
    };
    
  } catch (error) {
    throw new Error(`Failed to generate output for ${fileName}: ${error.message}`);
  }
}


// ----------------------------------- Output pathSetup ------------------------------------
// Create output directory structure
/**
 * Create output directory structure
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

// Validate input and setup output directory
/**
 * Validate input and setup output directory
 * @returns {string[]} - Array of .tar.gz file paths to process
 * @description Validates input, creates output directory, and returns file list
 * @throws {Error} When validation fails
 * @example
 * const files = validateAndSetup();
 * Returns: ['course1.tar.gz', 'course2.tar.gz']
 */
function validateAndSetup() {
  // Validate input path
  if (!validateInputPath(resolvedInputPath)) {
    throw new Error('Input validation failed');
  }
  
  // Create output directory
  createOutputDirectory(resolvedOutputPath);
  
  // Get list of files to process
  const tarGzFiles = getTarGzFiles(resolvedInputPath);
  
  console.log(`Found ${tarGzFiles.length} course(s) to process`);
  
  return tarGzFiles;
}

// ----------------------------------- Media Processing ------------------------------------

// Process and copy media files
/**
 * Process and copy media files
 * @param {string} courseRoot - Course root directory path
 * @param {string} mediaDir - Media output directory path
 * @returns {number} - Number of media files processed
 * @description Copies media files from course to output directory
 * @example
 * const count = await processMediaFiles('/temp/course1', '/output/course1/media');
 * Returns: 5
 */
async function processMediaFiles(courseRoot, mediaDir) {
  try {
    const mediaFiles = await findMediaFiles(courseRoot);
    
    let copiedCount = 0;
    for (const mediaFile of mediaFiles) {
      try {
        await copyMediaFile(mediaFile, mediaDir);
        copiedCount++;
      } catch (error) {
        if (options.verbose) {
          console.warn(`Failed to copy media file ${mediaFile.relativePath}: ${error.message}`);
        }
      }
    }
    
    if (options.verbose && copiedCount > 0) {
      console.log(`Copied ${copiedCount} media files to: ${mediaDir}`);
    }
    
    return copiedCount;
  } catch (error) {
    throw new Error(`Failed to process media files: ${error.message}`);
  }
}

// Find all media files in the course
/**
 * Find all media files in the course
 * @param {string} courseRoot - 课程根目录
 * @returns {Promise<Array>} 媒体文件信息数组
 */
async function findMediaFiles(courseRoot) {
  const mediaFiles = [];
  const staticDir = path.join(courseRoot, 'static');
  
  if (!fs.existsSync(staticDir)) {
    return mediaFiles;
  }
  
  const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.mp4', '.avi', '.mov', '.wmv', '.webm'];
  
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, itemRelativePath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (mediaExtensions.includes(ext)) {
          mediaFiles.push({
            fullPath,
            relativePath: itemRelativePath,
            fileName: item,
            extension: ext
          });
        }
      }
    }
  }
  
  scanDirectory(staticDir);
  return mediaFiles;
}

// Copy single media file
/**
 * Copy single media file
 * @param {Object} mediaFile - 媒体文件信息
 * @param {string} targetDir - 目标目录
 */
async function copyMediaFile(mediaFile, targetDir) {
  const sanitizedName = sanitizeFileName(mediaFile.fileName);
  const targetPath = path.join(targetDir, sanitizedName);
  
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  
  fs.copyFileSync(mediaFile.fullPath, targetPath);
  
  if (options.verbose) {
    console.log(`📄 Copied: ${mediaFile.relativePath} → ${sanitizedName}`);
  }
}

// Normalize media file name
/**
 * Normalize media file name
 * @param {string} fileName - Media file name
 * @returns {string} - Normalized media file name
 */
function sanitizeFileName(fileName) {
  return String(fileName)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Rewrite media file paths in HTML
/**
 * Rewrite media file paths in HTML
 * @param {string} htmlContent - HTML 内容
 * @returns {string} - 处理后的 HTML 内容
 */
function rewriteMediaPaths(htmlContent) {
  if (!htmlContent) {
    return htmlContent;
  }
  
  let processedContent = htmlContent.replace(
    /src=["']\/static\/([^"']+)["']/g,
    (m, p1) => {
      const safe = sanitizeFileName(p1);
      return `src="./media/${safe}"`;
    }
  );
  
  processedContent = processedContent.replace(
    /href=["']\/static\/([^"']+)["']/g,
    (m, p1) => {
      const safe = sanitizeFileName(p1);
      return `href="./media/${safe}"`;
    }
  );
  
  return processedContent;
}


// ================================================================================================
// =================================== Transform to Markdown =====================================
// ================================================================================================

// Transform course tree to LiaScript Markdown
/**
 * Transform course tree to LiaScript Markdown
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
  if (!courseTree || !courseTree.title || !courseTree.chapters) {
    throw new Error('Invalid course tree: title and chapters are required');
  }
  
  if (!courseRoot) {
    throw new Error('Course root directory is required');
  }
  
  const lines = [];
  
  lines.push('---');
  lines.push('author: Course Converter');
  lines.push('email: converter@example.com');
  lines.push('---');
  lines.push('');
  
  lines.push(`# ${courseTree.title}\n`);
  

  
  courseTree.chapters.forEach((chapter, chapterIndex) => {
    lines.push(transformNodeToMarkdown(chapter, chapterIndex + 1, courseRoot, 1));
  });
  
  lines.push('\n---\n');
  lines.push('*Course conversion completed*\n');
  
  return lines.join('\n');
}

// ----------------------------------- transformNodeToMarkdown ------------------------------------

// Recursively transform course structure to Markdown
/**
 * Recursively transform course structure to Markdown
 * @param {Object} node - Course structure node (chapter/sequential/vertical)
 * @param {number} nodeNumber - Node number
 * @param {string} courseRoot - Course root directory path
 * @param {number} level - Current nesting level (1=chapter, 2=sequential, 3=vertical)
 * @returns {string} - Markdown content
 * @description Converts course structure nodes to Markdown format using recursion
 * @throws {Error} When node structure is invalid
 * @example
 * const markdown = transformNodeToMarkdown(chapter, 1, '/temp/course1', 1);
 * Returns: "## 1. Chapter Title\n\n**Chapter ID:** chapter1\n\n..."
 */
function transformNodeToMarkdown(node, nodeNumber, courseRoot, level = 1) { //1=chapter, 2=sequential, 3=vertical
  if (!node || !node.title || !node.id) {
    throw new Error('Invalid node: title and id are required');
  }
  
  const lines = [];
  
  const titlePrefix = '#'.repeat(level + 1); // ## for chapter, ### for sequential, #### for vertical
  const childrenKey = ['', 'sequentials', 'verticals', 'components'][level] || 'children';
  
  if (level <= 2) {
    lines.push(`${titlePrefix} ${node.title}\n`);
  }
  
  if (level < 3) {
    node[childrenKey].forEach((child, childIndex) => {
      lines.push(transformNodeToMarkdown(child, childIndex + 1, courseRoot, level + 1));
    });
  } else {
    node.components.forEach((component, componentIndex) => {
      try {
        const componentIR = parseComponent(courseRoot, component);
        
        const componentMarkdown = renderComponent(componentIR);
        
        lines.push(componentMarkdown);
        
      } catch (error) {
        if (options.verbose) {
          console.warn(`⚠️ Failed to process component ${component.kind} (${component.id}): ${error.message}`);
        }
        
        lines.push(`#### Learning Content ${componentIndex + 1}\n`);
        lines.push(`*Content temporarily unavailable: ${error.message}*\n\n---\n`);
      }
    });
  }
  
  if (level === 1) {
    lines.push('\n---\n');
  }
  
  return lines.join('\n');
}


// ================================================================================================
// =================================== Main Function =============================================
// ================================================================================================

// ----------------------------------- Main ------------------------------------

// Main function
async function main() {
  console.log('Starting course conversion...');
  
  try {
    // Prepare temp root at the beginning of the run
    prepareTempRoot();

    // Display configuration
    displayConfiguration();
    
    // Validate input and setup output
    const tarGzFiles = validateAndSetup();
    
    // ==================== Execute Complete Flow: Steps 1-5 ====================
    // Process courses
    await processCourses(tarGzFiles);
    

    
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function only if not imported as module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for testing (only when imported as module)
export {
  // XML utilities
  createXmlParser,
  readXmlAsObject,
  toArray,
  
  // File utilities
  getFileInfo,
  validateInputPath,
  getTarGzFiles,
  prepareTempRoot,
  
  // Course processing
  extractCourse,
  resolveCourseRoot,
  parseCourseXml,
  parseChapters,
  parseSequentials,
  parseVerticals,
  collectComponentRefs,
  buildCourseTree,
  
  // Component parsing
  parseHtmlComponent,
  parseProblemComponent,
  parseVideoComponent,
  parseAboutComponent,
  parseComponent,
  
  // Component rendering  
  renderHtmlContent,
  renderProblemComponent,
  renderMultipleChoiceProblem,
  renderSelectionProblem,
  renderChoiceProblem,
  renderTextInputProblem,
  renderNumberInputProblem,

  renderUnsupportedProblem,
  renderVideoComponent,
  renderYouTubeVideo,
  renderExternalVideo,
  renderUnsupportedVideo,
  renderAboutComponent,
  renderAboutHtml,
  renderUnknownAbout,
  renderComponent,
  
  // Type detection
  determineProblemType,
  determineVideoType,
  
  // Hints processing
  extractHints,
  
  // Media processing
  sanitizeFileName,
  rewriteMediaPaths,
  processMediaFiles,
  findMediaFiles,
  copyMediaFile,
  
  // Course transformation
  transformCourseToMarkdown,
  transformNodeToMarkdown,
  
  // Output generation
  generateCourseOutput,
  
  // Main functions
  processCourses,
  validateAndSetup,
  createOutputDirectory,
  displayConfiguration,
  cleanupTempFiles,
  main
};
