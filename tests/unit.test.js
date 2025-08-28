import fs from 'fs';
import path from 'path';
import {
  createXmlParser,
  readXmlAsObject,
  toArray,
  sanitizeFileName,
  rewriteMediaPaths,
  parseHtmlComponent,
  renderHtmlContent,
  determineProblemType,
  parseProblemComponent
} from '../courseconverter.js';

describe('Course Converter Unit Tests (Direct Function Calls)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = global.createTempDir('unit');
  });

  afterEach(() => {
    global.cleanupTempDir(tempDir);
  });

  describe('XML Parser Functions', () => {
    it('should create XML parser with correct configuration', () => {
      const parser = createXmlParser();
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should parse XML file correctly', () => {
      const xmlContent = '<course display_name="Test"><chapter url_name="ch1"/></course>';
      const xmlPath = path.join(tempDir, 'test.xml');
      fs.writeFileSync(xmlPath, xmlContent);
      
      const result = readXmlAsObject(xmlPath);
      
      expect(result.course).toBeDefined();
      expect(result.course['@_display_name']).toBe('Test');
      expect(result.course.chapter['@_url_name']).toBe('ch1');
    });

    it('should normalize values to arrays', () => {
      expect(toArray(null)).toEqual([]);
      expect(toArray(undefined)).toEqual([]);
      expect(toArray('single')).toEqual(['single']);
      expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(toArray({ key: 'value' })).toEqual([{ key: 'value' }]);
    });
  });

  describe('File Name Sanitization', () => {
    it('should sanitize file names correctly', () => {
      expect(sanitizeFileName('normal_file.jpg')).toBe('normal_file.jpg');
      expect(sanitizeFileName('file with spaces.png')).toBe('file_with_spaces.png');
      expect(sanitizeFileName('file,with,commas.pdf')).toBe('file_with_commas.pdf');
      expect(sanitizeFileName('file@#$%^&*().txt')).toBe('file_.txt');
      expect(sanitizeFileName('___multiple___underscores___')).toBe('multiple_underscores');
    });
  });

  describe('Media Path Rewriting', () => {
    it('should rewrite static paths in HTML', () => {
      const html = '<img src="/static/images/test.png" alt="test"><a href="/static/docs/guide.pdf">Guide</a>';
      const result = rewriteMediaPaths(html);
      
      expect(result).toContain('src="./media/images_test.png"');
      expect(result).toContain('href="./media/docs_guide.pdf"');
    });

    it('should handle HTML with spaces in paths', () => {
      const html = '<img src="/static/my image file.jpg" alt="test">';
      const result = rewriteMediaPaths(html);
      
      expect(result).toContain('./media/my_image_file.jpg');
    });

    it('should return unchanged content for null/empty input', () => {
      expect(rewriteMediaPaths(null)).toBe(null);
      expect(rewriteMediaPaths('')).toBe('');
    });
  });

  describe('HTML Component Processing', () => {
    it('should parse HTML component successfully', () => {
      const courseRoot = tempDir;
      fs.mkdirSync(path.join(courseRoot, 'html'));
      
      const xmlContent = '<html display_name="Test HTML" filename="test.html"/>';
      fs.writeFileSync(path.join(courseRoot, 'html', 'test.xml'), xmlContent);
      
      const htmlContent = '<h1>Hello World</h1><p>Test content</p>';
      fs.writeFileSync(path.join(courseRoot, 'html', 'test.html'), htmlContent);
      
      const result = parseHtmlComponent(courseRoot, 'test');
      
      expect(result.type).toBe('html');
      expect(result.content).toBe(htmlContent);
      expect(result.filename).toBe('test');
      expect(result.displayName).toBe('Test HTML');
    });

    it('should throw error for missing files', () => {
      const courseRoot = tempDir;
      fs.mkdirSync(path.join(courseRoot, 'html'));
      
      expect(() => {
        parseHtmlComponent(courseRoot, 'nonexistent');
      }).toThrow('HTML component XML not found');
    });

    it('should render HTML to Markdown', () => {
      const htmlIR = {
        type: 'html',
        content: '<h1>Title</h1><p>Content with <strong>bold</strong> text</p>',
        filename: 'test',
        displayName: 'Test'
      };
      
      const result = renderHtmlContent(htmlIR);
      
      expect(result).toContain('# Title');
      expect(result).toContain('**bold**');
      expect(result).toContain('Content with');
    });

    it('should handle empty HTML content', () => {
      const htmlIR = {
        type: 'html',
        content: '   ',
        filename: 'empty',
        displayName: 'Empty'
      };
      
      const result = renderHtmlContent(htmlIR);
      expect(result).toBe('*No content available*');
    });

    it('should throw error for invalid HTML component data', () => {
      expect(() => {
        renderHtmlContent({ type: 'problem' });
      }).toThrow('Invalid HTML component data');
      
      expect(() => {
        renderHtmlContent(null);
      }).toThrow('Invalid HTML component data');
    });
  });

  describe('Problem Type Detection', () => {
    it('should identify different problem types', () => {
      expect(determineProblemType({ multiplechoiceresponse: {} })).toBe('multiple_choice');
      expect(determineProblemType({ choiceresponse: {} })).toBe('choice');
      expect(determineProblemType({ optionresponse: {} })).toBe('selection');
      expect(determineProblemType({ stringresponse: {} })).toBe('text_input');
      expect(determineProblemType({ numericalresponse: {} })).toBe('number_input');
      expect(determineProblemType({ formularesponse: {} })).toBe('formula');
      expect(determineProblemType({ coderesponse: {} })).toBe('code');
      expect(determineProblemType({ unknowntype: {} })).toBe('unknown');
    });
  });

  describe('Problem Component Processing', () => {
    it('should parse problem component', () => {
      const courseRoot = tempDir;
      fs.mkdirSync(path.join(courseRoot, 'problem'));
      
      const problemXml = `
        <problem display_name="Test Problem">
          <multiplechoiceresponse>
            <p>What is 1+1?</p>
            <choicegroup>
              <choice correct="false">1</choice>
              <choice correct="true">2</choice>
            </choicegroup>
          </multiplechoiceresponse>
        </problem>
      `;
      fs.writeFileSync(path.join(courseRoot, 'problem', 'test.xml'), problemXml);
      
      const result = parseProblemComponent(courseRoot, { id: 'test', displayName: 'Test' });
      
      expect(result.type).toBe('problem');
      expect(result.filename).toBe('test');
      expect(result.displayName).toBe('Test Problem');
      expect(result.problemType).toBe('multiple_choice');
    });

    it('should throw error for missing problem file', () => {
      const courseRoot = tempDir;
      fs.mkdirSync(path.join(courseRoot, 'problem'));
      
      expect(() => {
        parseProblemComponent(courseRoot, { id: 'nonexistent' });
      }).toThrow('Problem file not found');
    });

    it('should throw error for invalid XML structure', () => {
      const courseRoot = tempDir;
      fs.mkdirSync(path.join(courseRoot, 'problem'));
      
      fs.writeFileSync(path.join(courseRoot, 'problem', 'invalid.xml'), '<invalid>content</invalid>');
      
      expect(() => {
        parseProblemComponent(courseRoot, { id: 'invalid' });
      }).toThrow('Invalid problem XML structure');
    });
  });


  describe('Error Handling Coverage', () => {

    it('should handle file system errors', () => {
      expect(() => {
        readXmlAsObject('/nonexistent/path/file.xml');
      }).toThrow();
    });
  });
});