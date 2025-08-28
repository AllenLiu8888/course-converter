import fs from 'fs';
import path from 'path';
import {
  // XML utilities
  createXmlParser,
  readXmlAsObject,
  toArray,
  
  // File utilities  
  getFileInfo,
  validateInputPath,
  prepareTempRoot,
  
  // Component processing
  parseHtmlComponent,
  renderHtmlContent,
  parseProblemComponent,
  determineProblemType,
  renderProblemComponent,
  renderMultipleChoiceProblem,
  parseVideoComponent,
  determineVideoType,
  renderVideoComponent,
  renderYouTubeVideo,
  parseAboutComponent,
  renderAboutComponent,
  parseComponent,
  renderComponent,
  
  // Media processing
  sanitizeFileName,
  rewriteMediaPaths,
  
  // Course structure
  parseCourseXml,
  buildCourseTree,
  transformCourseToMarkdown
} from '../courseconverter.js';

describe('Course Converter Direct Function Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = global.createTempDir('direct');
  });

  afterEach(() => {
    global.cleanupTempDir(tempDir);
  });

  describe('XML Utilities', () => {
    it('should create XML parser', () => {
      const parser = createXmlParser();
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should read and parse XML file', () => {
      const xmlContent = '<course display_name="Test Course"><chapter url_name="ch1"/></course>';
      const xmlPath = path.join(tempDir, 'test.xml');
      fs.writeFileSync(xmlPath, xmlContent);
      
      const result = readXmlAsObject(xmlPath);
      expect(result.course['@_display_name']).toBe('Test Course');
      expect(result.course.chapter['@_url_name']).toBe('ch1');
    });

    it('should normalize to array', () => {
      expect(toArray(null)).toEqual([]);
      expect(toArray('single')).toEqual(['single']);
      expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('File Utilities', () => {
    it('should validate file info', () => {
      // Create a test tar.gz file
      const testFile = path.join(tempDir, 'test.tar.gz');
      fs.writeFileSync(testFile, 'dummy content');
      
      const result = getFileInfo(testFile);
      expect(result.isValid).toBe(true);
      expect(result.isFile).toBe(true);
      expect(result.files).toEqual([testFile]);
    });

    it('should reject non-tar.gz files', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'dummy content');
      
      expect(() => getFileInfo(testFile)).toThrow('Input file must be a .tar.gz file');
    });

    it('should validate input path', () => {
      const testFile = path.join(tempDir, 'valid.tar.gz');
      fs.writeFileSync(testFile, 'dummy');
      
      expect(validateInputPath(testFile)).toBe(true);
      expect(validateInputPath('/nonexistent/path')).toBe(false);
    });
  });

  describe('Media Processing', () => {
    it('should sanitize file names', () => {
      expect(sanitizeFileName('normal_file.jpg')).toBe('normal_file.jpg');
      expect(sanitizeFileName('file with spaces.png')).toBe('file_with_spaces.png');
      expect(sanitizeFileName('file@#$%^&*().txt')).toBe('file_.txt');
    });

    it('should rewrite media paths', () => {
      const html = '<img src="/static/images/test.png"><a href="/static/docs/guide.pdf">Link</a>';
      const result = rewriteMediaPaths(html);
      
      expect(result).toContain('src="./media/images_test.png"');
      expect(result).toContain('href="./media/docs_guide.pdf"');
    });
  });

  describe('HTML Component Processing', () => {
    it('should parse HTML component', () => {
      // Setup directory structure
      fs.mkdirSync(path.join(tempDir, 'html'));
      
      const xmlContent = '<html display_name="Test HTML"/>';
      fs.writeFileSync(path.join(tempDir, 'html', 'test.xml'), xmlContent);
      
      const htmlContent = '<h1>Hello</h1><p>World</p>';
      fs.writeFileSync(path.join(tempDir, 'html', 'test.html'), htmlContent);
      
      const result = parseHtmlComponent(tempDir, 'test');
      
      expect(result.type).toBe('html');
      expect(result.content).toBe(htmlContent);
      expect(result.displayName).toBe('Test HTML');
    });

    it('should render HTML to Markdown', () => {
      const htmlIR = {
        type: 'html',
        content: '<h1>Title</h1><p>Content with <strong>bold</strong></p>',
        filename: 'test'
      };
      
      const result = renderHtmlContent(htmlIR);
      expect(result).toContain('# Title');
      expect(result).toContain('**bold**');
    });

    it('should handle empty HTML', () => {
      const htmlIR = {
        type: 'html',
        content: '   ',
        filename: 'empty'
      };
      
      const result = renderHtmlContent(htmlIR);
      expect(result).toBe('*No content available*');
    });
  });

  describe('Problem Processing', () => {
    it('should determine problem types', () => {
      expect(determineProblemType({ multiplechoiceresponse: {} })).toBe('multiple_choice');
      expect(determineProblemType({ choiceresponse: {} })).toBe('choice');
      expect(determineProblemType({ optionresponse: {} })).toBe('selection');
      expect(determineProblemType({ stringresponse: {} })).toBe('text_input');
      expect(determineProblemType({ numericalresponse: {} })).toBe('number_input');
    });

    it('should parse problem component', () => {
      fs.mkdirSync(path.join(tempDir, 'problem'));
      
      const problemXml = `
        <problem display_name="Test Problem">
          <multiplechoiceresponse>
            <p>Question?</p>
            <choicegroup>
              <choice correct="true">Right</choice>
              <choice correct="false">Wrong</choice>
            </choicegroup>
          </multiplechoiceresponse>
        </problem>
      `;
      fs.writeFileSync(path.join(tempDir, 'problem', 'test.xml'), problemXml);
      
      const result = parseProblemComponent(tempDir, { id: 'test' });
      
      expect(result.type).toBe('problem');
      expect(result.problemType).toBe('multiple_choice');
      expect(result.displayName).toBe('Test Problem');
    });

    it('should render multiple choice problem', () => {
      const content = {
        multiplechoiceresponse: {
          p: 'What is 2+2?',
          choicegroup: {
            choice: [
              { '@_correct': 'false', '#text': '3' },
              { '@_correct': 'true', '#text': '4' }
            ]
          }
        }
      };
      
      const result = renderMultipleChoiceProblem(content, 'Math');
      expect(result).toContain('What is 2+2?');
      expect(result).toContain('[[X]] 4');
      expect(result).toContain('[[ ]] 3');
    });
  });

  describe('Video Processing', () => {
    it('should determine video types', () => {
      expect(determineVideoType({ '@_youtube': '1.00:test123' })).toBe('youtube');
      expect(determineVideoType({ '@_html5_sources': 'video.mp4' })).toBe('html5');
      expect(determineVideoType({ '@_url_name': 'external' })).toBe('external');
      expect(determineVideoType({ '@_other': 'unknown' })).toBe('unknown');
    });

    it('should parse video component', () => {
      fs.mkdirSync(path.join(tempDir, 'video'));
      
      const videoXml = '<video display_name="Test Video" youtube="1.00:dQw4w9WgXcQ"/>';
      fs.writeFileSync(path.join(tempDir, 'video', 'test.xml'), videoXml);
      
      const result = parseVideoComponent(tempDir, { id: 'test' });
      
      expect(result.type).toBe('video');
      expect(result.videoType).toBe('youtube');
      expect(result.displayName).toBe('Test Video');
    });

    it('should render YouTube video', () => {
      const content = { '@_youtube': '1.00:dQw4w9WgXcQ' };
      const result = renderYouTubeVideo(content, 'Test Video');
      
      expect(result).toContain('**Test Video**');
      expect(result).toContain('youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toContain('!?[Test Video]');
    });
  });

  describe('About Processing', () => {
    it('should parse about component', () => {
      fs.mkdirSync(path.join(tempDir, 'about'));
      
      const htmlContent = '<h1>About</h1><p>Course description</p>';
      fs.writeFileSync(path.join(tempDir, 'about', 'overview.html'), htmlContent);
      
      const result = parseAboutComponent(tempDir, { id: 'overview' });
      
      expect(result.type).toBe('about');
      expect(result.content).toBe(htmlContent);
      expect(result.aboutType).toBe('html');
    });
  });

  describe('Component Dispatcher', () => {
    it('should parse different component types', () => {
      // Setup HTML component
      fs.mkdirSync(path.join(tempDir, 'html'));
      fs.writeFileSync(path.join(tempDir, 'html', 'test.xml'), '<html/>');
      fs.writeFileSync(path.join(tempDir, 'html', 'test.html'), '<p>Test</p>');
      
      const result = parseComponent(tempDir, { kind: 'html', id: 'test' });
      expect(result.type).toBe('html');
    });

    it('should handle unknown component types', () => {
      const result = parseComponent(tempDir, { kind: 'unknown', id: 'test' }, { verbose: false });
      expect(result.type).toBe('unknown');
      expect(result.content).toContain('Unsupported component type');
    });

    it('should render components', () => {
      const htmlIR = {
        type: 'html',
        content: '<h1>Test</h1>',
        filename: 'test'
      };
      
      const result = renderComponent(htmlIR);
      expect(result).toContain('# Test');
    });
  });

  describe('Course Structure Processing', () => {
    it('should parse course XML', () => {
      // Create course structure
      fs.writeFileSync(path.join(tempDir, 'course.xml'), 
        '<course display_name="Test" course="TEST" org="ORG" url_name="test_2024"><chapter url_name="ch1"/></course>');
      
      fs.mkdirSync(path.join(tempDir, 'course'));
      fs.writeFileSync(path.join(tempDir, 'course', 'test_2024.xml'), 
        '<course display_name="Test Course"><chapter url_name="ch1"/></course>');
      
      const result = parseCourseXml(tempDir);
      
      expect(result.title).toBe('Test Course');
      expect(result.courseId).toBe('TEST');
      expect(result.chapterRefs).toEqual(['ch1']);
    });

    it('should build course tree', () => {
      // Create minimal course structure
      fs.writeFileSync(path.join(tempDir, 'course.xml'), 
        '<course display_name="Test" course="TEST" org="ORG" url_name="test_2024"><chapter url_name="ch1"/></course>');
      
      fs.mkdirSync(path.join(tempDir, 'course'));
      fs.writeFileSync(path.join(tempDir, 'course', 'test_2024.xml'), 
        '<course display_name="Test Course"><chapter url_name="ch1"/></course>');
      
      fs.mkdirSync(path.join(tempDir, 'chapter'));
      fs.writeFileSync(path.join(tempDir, 'chapter', 'ch1.xml'), 
        '<chapter display_name="Chapter 1"><sequential url_name="s1"/></chapter>');
      
      fs.mkdirSync(path.join(tempDir, 'sequential'));
      fs.writeFileSync(path.join(tempDir, 'sequential', 's1.xml'), 
        '<sequential display_name="Seq 1"><vertical url_name="v1"/></sequential>');
      
      fs.mkdirSync(path.join(tempDir, 'vertical'));
      fs.writeFileSync(path.join(tempDir, 'vertical', 'v1.xml'), 
        '<vertical display_name="Unit 1"/>');
      
      const result = buildCourseTree(tempDir);
      
      expect(result.title).toBe('Test Course');
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0].title).toBe('Chapter 1');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', () => {
      expect(() => parseHtmlComponent(tempDir, 'nonexistent')).toThrow();
      expect(() => parseProblemComponent(tempDir, { id: 'nonexistent' })).toThrow();
      expect(() => parseVideoComponent(tempDir, { id: 'nonexistent' })).toThrow();
    });

    it('should handle invalid component data', () => {
      expect(() => renderHtmlContent({ type: 'invalid' })).toThrow();
      expect(() => renderProblemComponent({ type: 'invalid' })).toThrow();
      expect(() => renderVideoComponent({ type: 'invalid' })).toThrow();
    });
  });
});