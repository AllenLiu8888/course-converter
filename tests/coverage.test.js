import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courseConverterPath = path.join(__dirname, '..', 'courseconverter.js');

describe('Coverage Tests - Execute Main Functions', () => {
  let tempInputDir, tempOutputDir;

  beforeEach(() => {
    tempInputDir = global.createTempDir('coverage_input');
    tempOutputDir = global.createTempDir('coverage_output');
  });

  afterEach(() => {
    global.cleanupTempDir(tempInputDir);
    global.cleanupTempDir(tempOutputDir);
  });

  it('should execute main code paths through CLI', async () => {
    // Create a minimal valid course structure
    const courseDir = path.join(tempInputDir, 'test-course');
    
    // Basic directory structure
    ['chapter', 'sequential', 'vertical', 'html', 'course'].forEach(dir => {
      fs.mkdirSync(path.join(courseDir, dir), { recursive: true });
    });

    // Create course.xml
    fs.writeFileSync(path.join(courseDir, 'course.xml'), 
      '<course display_name="Test" course="TEST" org="ORG" url_name="test_2024"><chapter url_name="ch1"/></course>');
    
    // Create detailed course info
    fs.writeFileSync(path.join(courseDir, 'course', 'test_2024.xml'), 
      '<course display_name="Test Course"><chapter url_name="ch1"/></course>');
    
    // Create chapter
    fs.writeFileSync(path.join(courseDir, 'chapter', 'ch1.xml'), 
      '<chapter display_name="Chapter 1"><sequential url_name="s1"/></chapter>');
    
    // Create sequential
    fs.writeFileSync(path.join(courseDir, 'sequential', 's1.xml'), 
      '<sequential display_name="Seq 1"><vertical url_name="v1"/></sequential>');
    
    // Create vertical
    fs.writeFileSync(path.join(courseDir, 'vertical', 'v1.xml'), 
      '<vertical display_name="Unit 1"><html url_name="h1"/></vertical>');
    
    // Create HTML component
    fs.writeFileSync(path.join(courseDir, 'html', 'h1.xml'), 
      '<html display_name="Test HTML"/>');
    fs.writeFileSync(path.join(courseDir, 'html', 'h1.html'), 
      '<h1>Test Content</h1><p>This is test content.</p>');

    // Create tar.gz
    const tar = await import('tar');
    const tarPath = path.join(tempInputDir, 'test-course.tar.gz');
    await tar.create({
      gzip: true,
      file: tarPath,
      cwd: tempInputDir
    }, ['test-course']);

    // Execute the converter to trigger code paths
    return new Promise((resolve) => {
      const process = spawn('node', [courseConverterPath, tarPath, tempOutputDir, '--verbose']);
      
      let output = '';
      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => output += data.toString());
      
      process.on('close', (code) => {
        // Verify that main execution paths were hit
        expect(output).toContain('Starting course conversion');
        expect(output).toContain('Found 1 course(s) to process');
        expect(output).toContain('Processing courses');
        expect(output).toContain('Extracted to:');
        expect(output).toContain('Converting');
        expect(output).toContain('Successfully converted');
        expect(output).toContain('Conversion completed');
        
        // Verify output was created
        const courseOutputDir = path.join(tempOutputDir, 'test-course');
        expect(fs.existsSync(courseOutputDir)).toBe(true);
        
        const courseMarkdown = path.join(courseOutputDir, 'course.md');
        expect(fs.existsSync(courseMarkdown)).toBe(true);
        
        const content = fs.readFileSync(courseMarkdown, 'utf8');
        expect(content).toContain('# Test Course');
        expect(content).toContain('Test Content');
        
        resolve();
      });
      
      setTimeout(() => {
        process.kill();
        resolve();
      }, 30000);
    });
  }, 35000);

  it('should trigger error handling paths', async () => {
    // Test invalid input
    const invalidFile = path.join(tempInputDir, 'invalid.tar.gz');
    fs.writeFileSync(invalidFile, 'not a real tar file');
    
    return new Promise((resolve) => {
      const process = spawn('node', [courseConverterPath, invalidFile, tempOutputDir, '--verbose']);
      
      let output = '';
      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => output += data.toString());
      
      process.on('close', (code) => {
        // Should hit error handling paths
        expect(output).toContain('Starting course conversion');
        expect(output).toContain('Processing courses');
        expect(output).toContain('Failed to process'); // Error path
        
        resolve();
      });
      
      setTimeout(() => {
        process.kill();
        resolve();
      }, 15000);
    });
  }, 20000);
});