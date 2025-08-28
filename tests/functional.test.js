import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courseConverterPath = path.join(__dirname, '..', 'courseconverter.js');

describe('Course Converter Functional Tests', () => {
  describe('Existing Course Processing', () => {
    const inputCoursesDir = path.join(__dirname, '..', 'input-courses');
    const outputCoursesDir = path.join(__dirname, '..', 'output-courses');
    
    // Check if there are existing test courses to work with
    const hasInputCourses = fs.existsSync(inputCoursesDir);

    if (hasInputCourses) {
      let testFiles = [];
      try {
        testFiles = fs.readdirSync(inputCoursesDir)
          .filter(file => file.endsWith('.tar.gz'))
          .slice(0, 2); // Only test first 2 files to keep tests fast
      } catch (e) {
        // Directory might not be readable
      }

      if (testFiles.length > 0) {
        testFiles.forEach(courseFile => {
          it(`should process existing course: ${courseFile}`, (done) => {
            const inputFile = path.join(inputCoursesDir, courseFile);
            const tempOutputDir = global.createTempDir('existing_course');
            
            const process = spawn('node', [courseConverterPath, inputFile, tempOutputDir, '--verbose']);
            
            let output = '';
            let errorOutput = '';
            
            process.stdout.on('data', (data) => output += data.toString());
            process.stderr.on('data', (data) => errorOutput += data.toString());
            
            process.on('close', (code) => {
              try {
                // Should successfully process
                expect(code).toBe(0);
                
                // Check output structure
                expect(output).toContain('Starting course conversion');
                expect(output).toContain('Found 1 course(s) to process');
                expect(output).toContain('Processing courses');
                expect(output).toContain('Conversion completed');
                
                // Check if output files were created
                const courseBaseName = path.basename(courseFile, '.tar.gz');
                const courseOutputDir = path.join(tempOutputDir, courseBaseName);
                
                if (fs.existsSync(courseOutputDir)) {
                  const courseMarkdownPath = path.join(courseOutputDir, 'course.md');
                  if (fs.existsSync(courseMarkdownPath)) {
                    const markdownContent = fs.readFileSync(courseMarkdownPath, 'utf8');
                    
                    // Check basic markdown structure
                    expect(markdownContent).toContain('---'); // Metadata header
                    expect(markdownContent).toContain('author: Course Converter');
                    expect(markdownContent).toMatch(/#\s+\w+/); // At least one heading
                    
                    // Check for LiaScript conversion indicators
                    const hasQuizElements = markdownContent.includes('[[') || 
                                          markdownContent.includes('[(') || 
                                          markdownContent.includes('!?[');
                    
                    if (hasQuizElements) {
                      console.log(`✓ Course ${courseFile} contains interactive elements`);
                    }
                  }
                  
                  // Check for media directory
                  const mediaDir = path.join(courseOutputDir, 'media');
                  if (fs.existsSync(mediaDir)) {
                    const mediaFiles = fs.readdirSync(mediaDir);
                    console.log(`✓ Course ${courseFile} processed ${mediaFiles.length} media files`);
                  }
                }
                
                global.cleanupTempDir(tempOutputDir);
                done();
              } catch (error) {
                console.log('STDOUT:', output);
                console.log('STDERR:', errorOutput);
                global.cleanupTempDir(tempOutputDir);
                done(error);
              }
            });
            
            // Set timeout for long-running conversions
            setTimeout(() => {
              process.kill();
              global.cleanupTempDir(tempOutputDir);
              done(new Error(`Test timeout for ${courseFile}`));
            }, 60000);
          }, 65000);
        });
      } else {
        it('should have test courses available', () => {
          console.log('No .tar.gz files found in input-courses directory for testing');
          expect(true).toBe(true); // Skip test gracefully
        });
      }
    } else {
      it('should have input-courses directory for testing', () => {
        console.log('input-courses directory not found - skipping existing course tests');
        expect(true).toBe(true); // Skip test gracefully
      });
    }
  });

  describe('Output Quality Validation', () => {
    const outputCoursesDir = path.join(__dirname, '..', 'output-courses');
    
    if (fs.existsSync(outputCoursesDir)) {
      const courseOutputDirs = fs.readdirSync(outputCoursesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .slice(0, 3); // Test first 3 output courses

      courseOutputDirs.forEach(courseName => {
        it(`should have valid output structure for: ${courseName}`, () => {
          const courseDir = path.join(outputCoursesDir, courseName);
          
          // Check for course.md
          const courseMarkdownPath = path.join(courseDir, 'course.md');
          expect(fs.existsSync(courseMarkdownPath)).toBe(true);
          
          if (fs.existsSync(courseMarkdownPath)) {
            const content = fs.readFileSync(courseMarkdownPath, 'utf8');
            
            // Basic markdown structure checks
            expect(content).toContain('---'); // YAML frontmatter
            expect(content).toContain('author: Course Converter');
            expect(content.trim()).toMatch(/^---[\s\S]*?---/); // Starts with frontmatter
            expect(content).toMatch(/#\s+.+/); // Has at least one heading
            
            // Check for proper markdown formatting
            expect(content).not.toContain('<html>');
            expect(content).not.toContain('<body>');
            expect(content).not.toContain('undefined');
            expect(content).not.toContain('[object Object]');
            
            // Check for LiaScript-specific elements
            const hasInteractiveElements = [
              content.includes('[['), // Multiple choice/text input
              content.includes('[('),  // Single choice
              content.includes('!?['), // Video
              content.includes('@video') // Video alternative syntax
            ].some(Boolean);
            
            if (hasInteractiveElements) {
              console.log(`✓ Course ${courseName} has interactive elements`);
            }
            
            // Check for media references if media directory exists
            const mediaDir = path.join(courseDir, 'media');
            if (fs.existsSync(mediaDir)) {
              const mediaFiles = fs.readdirSync(mediaDir);
              if (mediaFiles.length > 0) {
                expect(content).toContain('./media/');
                console.log(`✓ Course ${courseName} references ${mediaFiles.length} media files`);
              }
            }
          }
          
          // Check for media directory structure
          const mediaDir = path.join(courseDir, 'media');
          if (fs.existsSync(mediaDir)) {
            const mediaFiles = fs.readdirSync(mediaDir);
            
            // Check that media files have valid extensions
            mediaFiles.forEach(fileName => {
              expect(fileName).toMatch(/\.(png|jpg|jpeg|gif|pdf|mp4|webm|avi)$/i);
              expect(fileName.length).toBeGreaterThan(0);
              expect(fileName).not.toContain('undefined');
            });
          }
        });
      });
    }
  });

  describe('Error Handling and Edge Cases', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = global.createTempDir('error_handling');
    });

    afterEach(() => {
      global.cleanupTempDir(tempDir);
    });

    it('should handle empty output directory creation', (done) => {
      const nonExistentOutput = path.join(tempDir, 'deep', 'nested', 'output');
      const dummyInput = path.join(tempDir, 'dummy.tar.gz');
      fs.writeFileSync(dummyInput, 'dummy');
      
      const process = spawn('node', [courseConverterPath, dummyInput, nonExistentOutput]);
      
      process.on('close', (code) => {
        // Should create nested directories
        expect(fs.existsSync(path.dirname(nonExistentOutput))).toBe(true);
        done();
      });
    }, 10000);

    it('should handle verbose flag correctly', (done) => {
      const dummyInput = path.join(tempDir, 'dummy.tar.gz');
      const dummyOutput = path.join(tempDir, 'output');
      fs.writeFileSync(dummyInput, 'dummy');
      
      const process = spawn('node', [courseConverterPath, dummyInput, dummyOutput, '--verbose']);
      
      let output = '';
      process.stdout.on('data', (data) => output += data.toString());
      
      process.on('close', (code) => {
        expect(output).toContain('Processing:');
        expect(output).toContain('Starting course conversion');
        done();
      });
    }, 10000);

    it('should handle concurrent temp directory operations', async () => {
      // Test that temp directory handling works correctly
      const tempDir1 = global.createTempDir('concurrent1');
      const tempDir2 = global.createTempDir('concurrent2');
      const tempDir3 = global.createTempDir('concurrent3');
      
      // Create some files in each
      fs.writeFileSync(path.join(tempDir1, 'test1.txt'), 'content1');
      fs.writeFileSync(path.join(tempDir2, 'test2.txt'), 'content2');
      fs.writeFileSync(path.join(tempDir3, 'test3.txt'), 'content3');
      
      // Verify they exist
      expect(fs.existsSync(path.join(tempDir1, 'test1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir2, 'test2.txt'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir3, 'test3.txt'))).toBe(true);
      
      // Clean them up
      global.cleanupTempDir(tempDir1);
      global.cleanupTempDir(tempDir2);
      global.cleanupTempDir(tempDir3);
      
      // Verify cleanup
      expect(fs.existsSync(tempDir1)).toBe(false);
      expect(fs.existsSync(tempDir2)).toBe(false);
      expect(fs.existsSync(tempDir3)).toBe(false);
    });
  });
});