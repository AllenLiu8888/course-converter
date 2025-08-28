import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courseConverterPath = path.join(__dirname, '..', 'courseconverter.js');

describe('Course Converter Basic Tests', () => {
  describe('CLI Interface', () => {
    it('should show help when run with --help', (done) => {
      const process = spawn('node', [courseConverterPath, '--help']);
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        expect(output).toContain('Convert Open edX OLX courses to LiaScript Markdown format');
        expect(output).toContain('Usage:');
        expect(output).toContain('Options:');
        expect(code).toBe(0);
        done();
      });
    }, 10000);

    it('should show version when run with --version', (done) => {
      const process = spawn('node', [courseConverterPath, '--version']);
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        expect(output).toContain('1.0.0');
        expect(code).toBe(0);
        done();
      });
    }, 10000);

    it('should show error for missing arguments', (done) => {
      const process = spawn('node', [courseConverterPath]);
      
      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('error: missing required argument');
        done();
      });
    }, 10000);

    it('should show error for invalid input path', (done) => {
      const invalidPath = '/nonexistent/path/file.tar.gz';
      const outputPath = '/tmp/output';
      const process = spawn('node', [courseConverterPath, invalidPath, outputPath]);
      
      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('Input path does not exist');
        done();
      });
    }, 10000);
  });

  describe('File Structure Validation', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = global.createTempDir('validation');
    });

    afterEach(() => {
      global.cleanupTempDir(tempDir);
    });

    it('should reject directory with no .tar.gz files', (done) => {
      // Create directory with no .tar.gz files
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);
      fs.writeFileSync(path.join(emptyDir, 'not_tarball.txt'), 'test');
      
      const outputPath = path.join(tempDir, 'output');
      const process = spawn('node', [courseConverterPath, emptyDir, outputPath]);
      
      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('contains no .tar.gz files');
        done();
      });
    }, 10000);

    it('should accept directory with .tar.gz files', (done) => {
      // Create directory with a .tar.gz file (even if invalid)
      const tarDir = path.join(tempDir, 'tardir');
      fs.mkdirSync(tarDir);
      fs.writeFileSync(path.join(tarDir, 'course.tar.gz'), 'dummy content');
      
      const outputPath = path.join(tempDir, 'output');
      const process = spawn('node', [courseConverterPath, tarDir, outputPath]);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => errorOutput += data.toString());
      
      process.on('close', (code) => {
        // Should pass validation but fail at extraction
        expect(output).toContain('Found 1 course(s) to process');
        expect(output).toContain('Processing courses...');
        done();
      });
    }, 10000);
  });

  describe('Code Structure Validation', () => {
    it('should have ES6 module structure', () => {
      const content = fs.readFileSync(courseConverterPath, 'utf8');
      
      // Check for ES6 imports
      expect(content).toContain("import fs from 'fs'");
      expect(content).toContain("import path from 'path'");
      expect(content).toContain("import { program } from 'commander'");
      expect(content).toContain("import * as tar from 'tar'");
      expect(content).toContain("import { XMLParser } from 'fast-xml-parser'");
      expect(content).toContain("import NodeHtmlMarkdown from 'node-html-markdown'");
    });

    it('should contain key function definitions', () => {
      const content = fs.readFileSync(courseConverterPath, 'utf8');
      
      // Check for key functions
      expect(content).toContain('function createXmlParser()');
      expect(content).toContain('function readXmlAsObject(');
      expect(content).toContain('function toArray(');
      expect(content).toContain('function parseHtmlComponent(');
      expect(content).toContain('function renderHtmlContent(');
      expect(content).toContain('function parseProblemComponent(');
      expect(content).toContain('function parseVideoComponent(');
      expect(content).toContain('function parseAboutComponent(');
      expect(content).toContain('function parseComponent(');
      expect(content).toContain('function renderComponent(');
    });

    it('should contain main execution flow', () => {
      const content = fs.readFileSync(courseConverterPath, 'utf8');
      
      // Check for main execution functions
      expect(content).toContain('async function main()');
      expect(content).toContain('async function processCourses(');
      expect(content).toContain('function validateAndSetup()');
      expect(content).toContain('function prepareTempRoot()');
      expect(content).toMatch(/main\(\)/); // Should call main()
    });

    it('should handle different component types', () => {
      const content = fs.readFileSync(courseConverterPath, 'utf8');
      
      // Check for component type handling
      expect(content).toContain('multiple_choice');
      expect(content).toContain('choiceresponse');
      expect(content).toContain('optionresponse');
      expect(content).toContain('stringresponse');
      expect(content).toContain('numericalresponse');
      expect(content).toContain('youtube');
      expect(content).toContain('html5_sources');
    });
  });
});