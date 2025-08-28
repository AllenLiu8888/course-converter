import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('CLI Parameter Parsing Coverage Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = global.createTempDir('cli-coverage');
  });

  afterEach(() => {
    global.cleanupTempDir(tempDir);
  });

  describe('CLI Setup and Argument Parsing', () => {
    it('should parse help flag correctly', (done) => {
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, '--help'], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toContain('Usage: courseconverter');
        expect(stdout).toContain('Convert Open edX OLX courses to LiaScript Markdown format');
        expect(stdout).toContain('Arguments:');
        expect(stdout).toContain('<input>');
        expect(stdout).toContain('<output>');
        expect(stdout).toContain('Options:');
        expect(stdout).toContain('--verbose');
        expect(stdout).toContain('Display help information');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should parse version flag correctly', (done) => {
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, '--version'], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout.trim()).toBe('1.0.0');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should handle missing required arguments', (done) => {
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(1);
        const allOutput = stdout + stderr;
        expect(allOutput).toContain('error: missing required argument \'input\'');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should handle missing output argument', (done) => {
      const testInput = path.join(tempDir, 'test.tar.gz');
      fs.writeFileSync(testInput, 'fake content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(1);
        const allOutput = stdout + stderr;
        expect(allOutput).toContain('error: missing required argument \'output\'');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should parse verbose flag correctly', (done) => {
      const testInput = path.join(tempDir, 'test.tar.gz');
      const testOutput = path.join(tempDir, 'output');
      
      // Create fake tar.gz file
      fs.writeFileSync(testInput, 'fake tar content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput, '--verbose'], {
        timeout: 8000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Should show verbose output even if processing fails
        expect(allOutput).toContain('🚀 Starting course conversion');
        expect(allOutput).toContain('Processing:');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);

    it('should parse arguments in different orders', (done) => {
      const testInput = path.join(tempDir, 'test.tar.gz');
      const testOutput = path.join(tempDir, 'output');
      
      fs.writeFileSync(testInput, 'fake tar content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      // Test with verbose flag before arguments
      const process = spawn('node', [courseConverterPath, '--verbose', testInput, testOutput], {
        timeout: 8000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Should parse arguments correctly regardless of flag position
        expect(allOutput).toContain('🚀 Starting course conversion');
        expect(allOutput).toContain('Processing:');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);

    it('should handle short verbose flag -v', (done) => {
      const testInput = path.join(tempDir, 'test.tar.gz');
      const testOutput = path.join(tempDir, 'output');
      
      fs.writeFileSync(testInput, 'fake tar content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput, '-v'], {
        timeout: 8000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Short flag should work the same as long flag
        expect(allOutput).toContain('🚀 Starting course conversion');
        expect(allOutput).toContain('Processing:');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);

    it('should handle short help flag -h', (done) => {
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, '-h'], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(stdout).toContain('Usage: courseconverter');
        expect(stdout).toContain('Display help information');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('Argument Validation and Path Resolution', () => {
    it('should handle invalid input file extension', (done) => {
      const testInput = path.join(tempDir, 'test.txt'); // Wrong extension
      const testOutput = path.join(tempDir, 'output');
      
      fs.writeFileSync(testInput, 'not a tar.gz file');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(1);
        const allOutput = stdout + stderr;
        expect(allOutput).toContain('Input file must be a .tar.gz file');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should handle nonexistent input file', (done) => {
      const testInput = path.join(tempDir, 'nonexistent.tar.gz');
      const testOutput = path.join(tempDir, 'output');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(1);
        const allOutput = stdout + stderr;
        expect(allOutput).toContain('Input path does not exist');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should handle directory with no tar.gz files', (done) => {
      const testInputDir = path.join(tempDir, 'input-dir');
      const testOutput = path.join(tempDir, 'output');
      
      fs.mkdirSync(testInputDir);
      fs.writeFileSync(path.join(testInputDir, 'not-a-course.txt'), 'random file');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInputDir, testOutput], {
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(1);
        const allOutput = stdout + stderr;
        expect(allOutput).toContain('Input directory contains no .tar.gz files');
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    it('should handle directory with multiple tar.gz files', (done) => {
      const testInputDir = path.join(tempDir, 'multi-course-dir');
      const testOutput = path.join(tempDir, 'output');
      
      fs.mkdirSync(testInputDir);
      fs.writeFileSync(path.join(testInputDir, 'course1.tar.gz'), 'fake course 1');
      fs.writeFileSync(path.join(testInputDir, 'course2.tar.gz'), 'fake course 2');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInputDir, testOutput, '--verbose'], {
        timeout: 10000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Should process multiple files and show verbose output
        expect(allOutput).toContain('Found 2 course(s) to process');
        expect(allOutput).toContain('course1');
        expect(allOutput).toContain('course2');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('Path Resolution Coverage', () => {
    it('should resolve relative input paths correctly', (done) => {
      // Create test file in current directory
      const testInput = 'test-relative.tar.gz';
      const testOutput = path.join(tempDir, 'output');
      
      fs.writeFileSync(testInput, 'fake tar content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput, '--verbose'], {
        timeout: 8000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Should show resolved absolute path
        expect(allOutput).toContain('Processing:');
        expect(allOutput).toContain(path.resolve(testInput));
        
        // Cleanup
        try {
          fs.unlinkSync(testInput);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        done();
      });

      process.on('error', (error) => {
        // Cleanup on error
        try {
          fs.unlinkSync(testInput);
        } catch (e) {
          // Ignore cleanup errors
        }
        done(error);
      });
    }, 15000);

    it('should resolve relative output paths correctly', (done) => {
      const testInput = path.join(tempDir, 'test.tar.gz');
      const testOutput = 'test-relative-output'; // Relative path
      
      fs.writeFileSync(testInput, 'fake tar content');
      
      const courseConverterPath = path.resolve('./courseconverter.js');
      const process = spawn('node', [courseConverterPath, testInput, testOutput, '--verbose'], {
        timeout: 8000
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const allOutput = stdout + stderr;
        
        // Should show resolved absolute output path
        expect(allOutput).toContain('Processing:');
        expect(allOutput).toContain(path.resolve(testOutput));
        
        // Cleanup
        try {
          fs.rmSync(testOutput, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        
        done();
      });

      process.on('error', (error) => {
        // Cleanup on error
        try {
          fs.rmSync(testOutput, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        done(error);
      });
    }, 15000);
  });
});