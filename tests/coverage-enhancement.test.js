import fs from 'fs';
import path from 'path';
import {
  // Functions that need more coverage
  displayConfiguration,
  prepareTempRoot,
  getTarGzFiles,
  extractCourse,
  resolveCourseRoot,
  cleanupTempFiles,
  createOutputDirectory,
  processMediaFiles,
  findMediaFiles,
  copyMediaFile,
  
  // Rendering functions that need more coverage
  renderSelectionProblem,
  renderChoiceProblem,
  renderTextInputProblem,
  renderNumberInputProblem,
  renderUnsupportedProblem,
  renderUnsupportedVideo,
  renderAboutHtml,
  renderUnknownAbout,
  
  // Component parsing that needs more coverage
  parseAboutComponent,
  parseVideoComponent,
  
  // Media processing
  sanitizeFileName,
  rewriteMediaPaths
} from '../courseconverter.js';

describe('Coverage Enhancement Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = global.createTempDir('coverage-enhancement');
  });

  afterEach(() => {
    global.cleanupTempDir(tempDir);
  });

  describe('CLI and Setup Functions', () => {
    it('should handle displayConfiguration with verbose mode', () => {
      // Test verbose mode
      const originalOptions = { verbose: true };
      global.options = originalOptions;
      
      // Should not throw
      expect(() => displayConfiguration()).not.toThrow();
    });

    it('should handle prepareTempRoot with existing directory', () => {
      const testTempRoot = path.join(tempDir, 'test-temp');
      fs.mkdirSync(testTempRoot, { recursive: true });
      
      // Mock TEMP_ROOT
      const originalTEMP_ROOT = process.env.TEMP_ROOT;
      process.env.TEMP_ROOT = testTempRoot;
      
      expect(() => prepareTempRoot()).not.toThrow();
      
      process.env.TEMP_ROOT = originalTEMP_ROOT;
    });

    it('should handle getTarGzFiles for directory input', () => {
      // Create test directory with tar.gz files
      const testFile1 = path.join(tempDir, 'course1.tar.gz');
      const testFile2 = path.join(tempDir, 'course2.tar.gz');
      
      fs.writeFileSync(testFile1, 'dummy content');
      fs.writeFileSync(testFile2, 'dummy content');
      
      const result = getTarGzFiles(tempDir);
      
      expect(result).toHaveLength(2);
      expect(result).toContain(testFile1);
      expect(result).toContain(testFile2);
    });

    it('should handle createOutputDirectory', () => {
      const outputPath = path.join(tempDir, 'test-output');
      
      expect(() => createOutputDirectory(outputPath)).not.toThrow();
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should handle cleanupTempFiles', () => {
      const testCleanupDir = path.join(tempDir, 'to-cleanup');
      fs.mkdirSync(testCleanupDir, { recursive: true });
      fs.writeFileSync(path.join(testCleanupDir, 'test.txt'), 'test');
      
      expect(fs.existsSync(testCleanupDir)).toBe(true);
      
      cleanupTempFiles(testCleanupDir);
      
      expect(fs.existsSync(testCleanupDir)).toBe(false);
    });
  });

  describe('Problem Rendering Functions', () => {
    it('should render selection problems', () => {
      const content = {
        optionresponse: {
          p: 'Select the correct option:',
          label: 'Test Selection',
          optioninput: {
            option: [
              { '#text': 'Option A', '@_correct': 'false' },
              { '#text': 'Option B', '@_correct': 'true' },
              { '#text': 'Option C', '@_correct': 'false' }
            ]
          }
        }
      };
      
      const result = renderSelectionProblem(content, 'Test Selection');
      
      expect(result).toContain('Select the correct option:');
      expect(result).toContain('( Option B )');
      expect(result).toContain('[[ Option A | ( Option B ) | Option C ]]');
    });

    it('should render choice problems', () => {
      const content = {
        choiceresponse: {
          p: 'Choose one:',
          label: 'Test Choice',
          choicegroup: {
            choice: [
              { '@_correct': 'false', '#text': 'Wrong answer' },
              { '@_correct': 'true', '#text': 'Correct answer' }
            ]
          }
        }
      };
      
      const result = renderChoiceProblem(content, 'Test Choice');
      
      expect(result).toContain('Choose one:');
      expect(result).toContain('[(X)] Correct answer');
      expect(result).toContain('[( )] Wrong answer');
    });

    it('should render text input problems', () => {
      const content = {
        stringresponse: {
          p: 'Enter your answer:',
          label: 'Text Input Test',
          '@_answer': 'correct answer',
          additional_answer: [
            { '@_answer': 'alternative 1' },
            { '@_answer': 'alternative 2' }
          ]
        }
      };
      
      const result = renderTextInputProblem(content, 'Text Input Test');
      
      expect(result).toContain('Enter your answer:');
      expect(result).toContain('[[correct answer | alternative 1 | alternative 2]]');
    });

    it('should render number input problems', () => {
      const content = {
        numericalresponse: {
          p: 'Enter a number:',
          label: 'Number Test'
        }
      };
      
      const result = renderNumberInputProblem(content, 'Number Test');
      
      expect(result).toContain('Enter a number:');
      expect(result).toContain('[[Enter a number]]');
    });

    it('should render unsupported problems', () => {
      const content = {
        p: 'Some problem content'
      };
      
      const result = renderUnsupportedProblem(content, 'Unsupported Test', 'formula');
      
      expect(result).toContain('Some problem content');
      expect(result).toContain('formula 类型暂不支持');
    });
  });

  describe('Video Rendering Functions', () => {
    it('should render unsupported video types', () => {
      const content = {
        '@_html5_sources': 'video.mp4'
      };
      
      const result = renderUnsupportedVideo(content, 'Test Video');
      
      expect(result).toContain('Test Video');
      expect(result).toContain('仅支持 YouTube 视频');
    });
  });

  describe('About Component Functions', () => {
    it('should render about HTML content', () => {
      const content = '<h1>Course Overview</h1><p>This is a great course!</p>';
      
      const result = renderAboutHtml(content, 'About This Course');
      
      expect(result).toContain('## About This Course');
      expect(result).toContain('Course Overview');
      expect(result).toContain('This is a great course!');
    });

    it('should render unknown about content', () => {
      const content = { unknown_type: 'some data' };
      
      const result = renderUnknownAbout(content, 'Unknown About');
      
      expect(result).toContain('## Unknown About');
      expect(result).toContain('This about type is not yet supported');
      expect(result).toContain('unknown_type');
    });

    it('should parse about component', () => {
      // Setup about directory
      const aboutDir = path.join(tempDir, 'about');
      fs.mkdirSync(aboutDir);
      
      const htmlContent = '<h1>About</h1><p>Course information</p>';
      fs.writeFileSync(path.join(aboutDir, 'overview.html'), htmlContent);
      
      const result = parseAboutComponent(tempDir, { id: 'overview' });
      
      expect(result.type).toBe('about');
      expect(result.content).toBe(htmlContent);
      expect(result.aboutType).toBe('html');
    });
  });

  describe('Media Processing Functions', () => {
    it('should find media files in course', async () => {
      // Create static directory with media files
      const staticDir = path.join(tempDir, 'static');
      const imagesDir = path.join(staticDir, 'images');
      fs.mkdirSync(imagesDir, { recursive: true });
      
      // Create test media files
      fs.writeFileSync(path.join(imagesDir, 'test.jpg'), 'fake jpg content');
      fs.writeFileSync(path.join(imagesDir, 'test.png'), 'fake png content');
      fs.writeFileSync(path.join(staticDir, 'video.mp4'), 'fake video content');
      
      const mediaFiles = await findMediaFiles(tempDir);
      
      expect(mediaFiles).toHaveLength(3);
      expect(mediaFiles.some(f => f.fileName === 'test.jpg')).toBe(true);
      expect(mediaFiles.some(f => f.fileName === 'test.png')).toBe(true);
      expect(mediaFiles.some(f => f.fileName === 'video.mp4')).toBe(true);
    });

    it('should copy media files', async () => {
      const sourceFile = path.join(tempDir, 'source.jpg');
      const targetDir = path.join(tempDir, 'media');
      
      fs.writeFileSync(sourceFile, 'fake image content');
      fs.mkdirSync(targetDir);
      
      const mediaFile = {
        fullPath: sourceFile,
        relativePath: 'images/source.jpg',
        fileName: 'source.jpg',
        extension: '.jpg'
      };
      
      await copyMediaFile(mediaFile, targetDir);
      
      const targetFile = path.join(targetDir, 'source.jpg');
      expect(fs.existsSync(targetFile)).toBe(true);
    });

    it('should process media files', async () => {
      // Create course with static directory
      const staticDir = path.join(tempDir, 'static');
      fs.mkdirSync(staticDir, { recursive: true });
      fs.writeFileSync(path.join(staticDir, 'test.jpg'), 'fake image');
      
      const mediaDir = path.join(tempDir, 'output-media');
      fs.mkdirSync(mediaDir);
      
      const count = await processMediaFiles(tempDir, mediaDir);
      
      expect(count).toBe(1);
      expect(fs.existsSync(path.join(mediaDir, 'test.jpg'))).toBe(true);
    });

    it('should sanitize complex file names', () => {
      expect(sanitizeFileName('file with spaces & symbols!@#.jpg')).toBe('file_with_spaces_symbols_.jpg');
      expect(sanitizeFileName('файл_на_русском.png')).toBe('.png');  // Non-ASCII characters get replaced
      expect(sanitizeFileName('___multiple___underscores___.txt')).toBe('multiple_underscores_.txt');
    });

    it('should handle complex media path rewriting', () => {
      const html = `
        <img src="/static/images/test with spaces & symbols.jpg" alt="test">
        <a href="/static/docs/document(1).pdf">Download</a>
        <video src="/static/videos/lesson #1.mp4">Video</video>
      `;
      
      const result = rewriteMediaPaths(html);
      
      // The rewriteMediaPaths function includes directory structure in the name
      expect(result).toContain('src="./media/images_test_with_spaces_symbols.jpg"');
      expect(result).toContain('href="./media/docs_document_1_.pdf"');
      expect(result).toContain('src="./media/videos_lesson_1.mp4"');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty selection problem options', () => {
      const content = {
        optionresponse: {
          p: 'Empty options:',
          optioninput: {
            option: []
          }
        }
      };
      
      const result = renderSelectionProblem(content, 'Empty Test');
      
      expect(result).toContain('Empty options:');
      // Empty options should just show the question text, no selection markup
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle text input problem without answers', () => {
      const content = {
        stringresponse: {
          p: 'No answer provided:',
          '@_answer': '',
          additional_answer: []
        }
      };
      
      const result = renderTextInputProblem(content, 'No Answer Test');
      
      expect(result).toContain('No answer provided:');
      expect(result).toContain('[[ ]]');
    });

    it('should handle findMediaFiles with no static directory', async () => {
      const mediaFiles = await findMediaFiles(tempDir);
      expect(mediaFiles).toEqual([]);
    });

    it('should handle rewriteMediaPaths with null input', () => {
      expect(rewriteMediaPaths(null)).toBe(null);
      expect(rewriteMediaPaths('')).toBe('');
    });

    it('should handle parseAboutComponent with missing directory', () => {
      expect(() => {
        parseAboutComponent(tempDir, { id: 'nonexistent' });
      }).toThrow('About directory not found');
    });
  });
});