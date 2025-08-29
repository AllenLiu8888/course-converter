import fs from 'fs';
import path from 'path';
import {
  // XML utilities
  createXmlParser,
  readXmlAsObject,
  toArray,
  
  // Component processing
  parseHtmlComponent,
  renderHtmlContent,
  parseProblemComponent,
  renderProblemComponent,
  determineProblemType,
  renderMultipleChoiceProblem,
  renderSelectionProblem,
  renderTextInputProblem,
  extractHints,
  
  // Media processing
  rewriteMediaPaths,
  
  // Problem types
  renderNumberInputProblem,
  renderChoiceProblem,
  
  // Course structure
  parseCourseXml,
  buildCourseTree,
  transformCourseToMarkdown
} from '../courseconverter.js';

describe('Course Converter - Core Requirements Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = global.createTempDir('core-requirements');
  });

  afterEach(() => {
    global.cleanupTempDir(tempDir);
  });

  // ============================================================================
  // Test 1: Jest Setup (2 Marks) - Verified by this file running
  // ============================================================================
  describe('Jest Setup Verification', () => {
    it('should have Jest properly configured', () => {
      // This test running confirms Jest is setup correctly
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Test 2: Appropriate exports (2 Marks)
  // ============================================================================
  describe('Function Exports', () => {
    it('should export all required functions for testing', () => {
      // Verify key functions are exported and callable
      expect(typeof createXmlParser).toBe('function');
      expect(typeof readXmlAsObject).toBe('function');
      expect(typeof parseHtmlComponent).toBe('function');
      expect(typeof renderHtmlContent).toBe('function');
      expect(typeof parseProblemComponent).toBe('function');
      expect(typeof renderProblemComponent).toBe('function');
      expect(typeof rewriteMediaPaths).toBe('function');
      expect(typeof buildCourseTree).toBe('function');
      expect(typeof transformCourseToMarkdown).toBe('function');
    });
  });

  // ============================================================================
  // Test 3: HTML to Markdown with bold, italic and list formatting (2 Marks)
  // ============================================================================
  describe('HTML to Markdown Conversion', () => {
    it('should convert HTML with bold, italic and list formatting', () => {
      // Create HTML component with various formatting
      const htmlIR = {
        type: 'html',
        content: `
          <h1>Test Title</h1>
          <p>This text has <strong>bold</strong> and <em>italic</em> formatting.</p>
          <ul>
            <li>First list item</li>
            <li>Second list item with <strong>bold text</strong></li>
            <li>Third item with <em>italic text</em></li>
          </ul>
          <ol>
            <li>First numbered item</li>
            <li>Second numbered item</li>
          </ol>
          <p>Mixed formatting: <strong><em>bold and italic</em></strong></p>
        `,
        filename: 'test-formatting',
        displayName: 'Test Formatting'
      };
      
      const result = renderHtmlContent(htmlIR);
      
      // Verify bold formatting
      expect(result).toContain('**bold**');
      expect(result).toContain('**bold text**');
      expect(result).toContain('**bold and italic**');
      
      // Verify italic formatting
      expect(result).toContain('*italic*');
      expect(result).toContain('*italic text*');
      
      // Verify list formatting (unordered)
      expect(result).toContain('* First list item');
      expect(result).toContain('* Second list item');
      expect(result).toContain('* Third item');
      
      // Verify numbered list formatting
      expect(result).toContain('1. First numbered item');
      expect(result).toContain('2. Second numbered item');
      
      // Verify heading
      expect(result).toContain('# Test Title');
    });
  });

  // ============================================================================
  // Test 4: MCQ/Quiz Problem Parsing and LiaScript Rendering (2 Marks)
  // ============================================================================
  describe('MCQ Problem Processing', () => {
    it('should parse XML and render MCQ Problem to LiaScript Markdown', () => {
      // Setup problem directory
      fs.mkdirSync(path.join(tempDir, 'problem'));
      
      // Create MCQ problem XML
      const mcqXml = `
        <problem display_name="Sample MCQ">
          <multiplechoiceresponse>
            <p>What is the capital of France?</p>
            <label>Choose the correct answer:</label>
            <choicegroup>
              <choice correct="false">London</choice>
              <choice correct="false">Berlin</choice>
              <choice correct="true">Paris</choice>
              <choice correct="false">Madrid</choice>
            </choicegroup>
          </multiplechoiceresponse>
        </problem>
      `;
      
      fs.writeFileSync(path.join(tempDir, 'problem', 'mcq-test.xml'), mcqXml);
      
      // Parse the problem component
      const problemIR = parseProblemComponent(tempDir, { 
        id: 'mcq-test', 
        displayName: 'Sample MCQ' 
      });
      
      // Verify parsing results
      expect(problemIR.type).toBe('problem');
      expect(problemIR.problemType).toBe('multiple_choice');
      expect(problemIR.displayName).toBe('Sample MCQ');
      
      // Render to LiaScript Markdown
      const markdownResult = renderProblemComponent(problemIR);
      
      // Verify LiaScript multiple choice format
      expect(markdownResult).toContain('What is the capital of France?');
      expect(markdownResult).toContain('Choose the correct answer:');
      expect(markdownResult).toContain('[[X]] Paris');  // Correct answer
      expect(markdownResult).toContain('[[ ]] London');  // Incorrect answers
      expect(markdownResult).toContain('[[ ]] Berlin');
      expect(markdownResult).toContain('[[ ]] Madrid');
    });

    it('should handle different quiz question types', () => {
      // Test problem type detection
      expect(determineProblemType({ multiplechoiceresponse: {} })).toBe('multiple_choice');
      expect(determineProblemType({ choiceresponse: {} })).toBe('choice');
      expect(determineProblemType({ optionresponse: {} })).toBe('selection');
      expect(determineProblemType({ stringresponse: {} })).toBe('text_input');
      expect(determineProblemType({ numericalresponse: {} })).toBe('number_input');
    });
  });

  // ============================================================================
  // Test 5: Image Path Replacement (2 Marks)
  // ============================================================================
  describe('Image Path Replacement', () => {
    it('should correctly replace image paths from /static/ to ./media/', () => {
      // Test HTML with various static paths
      const htmlWithImages = `
        <div>
          <img src="/static/images/diagram.png" alt="Diagram" />
          <img src="/static/photos/student.jpg" alt="Student Photo" />
          <a href="/static/documents/syllabus.pdf">Download Syllabus</a>
          <video src="/static/videos/lecture1.mp4" controls></video>
          <img src="/static/icons/warning icon.png" alt="Warning with spaces" />
        </div>
      `;
      
      const result = rewriteMediaPaths(htmlWithImages);
      
      // Verify static paths are replaced with media paths
      expect(result).toContain('src="./media/images_diagram.png"');
      expect(result).toContain('src="./media/photos_student.jpg"');
      expect(result).toContain('href="./media/documents_syllabus.pdf"');
      expect(result).toContain('src="./media/videos_lecture1.mp4"');
      
      // Verify paths with spaces are handled correctly
      expect(result).toContain('src="./media/icons_warning_icon.png"');
      
      // Verify original /static/ paths are completely replaced
      expect(result).not.toContain('/static/');
    });

    it('should handle edge cases in path replacement', () => {
      const edgeCases = `
        <img src="/static/complex/path/image-name.jpg" />
        <a href="/static/file with spaces.pdf">File with spaces</a>
        <img src="/static/special@chars#file.png" />
      `;
      
      const result = rewriteMediaPaths(edgeCases);
      
      expect(result).toContain('./media/complex_path_image-name.jpg');
      expect(result).toContain('./media/file_with_spaces.pdf');
      expect(result).toContain('./media/special_chars_file.png');
    });
  });

  // ============================================================================
  // Test 6: Render Markdown from Tree Structure (4 Marks)
  // ============================================================================
  describe('Course Tree to Markdown Rendering', () => {
    it('should render complete course tree structure to Markdown', () => {
      // Create a complete course structure with files
      const courseStructure = ['course', 'chapter', 'sequential', 'vertical', 'html'];
      courseStructure.forEach(dir => {
        fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
      });

      // Create course.xml
      fs.writeFileSync(path.join(tempDir, 'course.xml'), 
        '<course display_name="Sample Course" course="SAMPLE" org="TEST" url_name="sample_2024"><chapter url_name="chapter1"/></course>');
      
      // Create detailed course info
      fs.writeFileSync(path.join(tempDir, 'course', 'sample_2024.xml'), 
        '<course display_name="Introduction to Programming"><chapter url_name="chapter1"/></course>');
      
      // Create chapter
      fs.writeFileSync(path.join(tempDir, 'chapter', 'chapter1.xml'), 
        '<chapter display_name="Getting Started"><sequential url_name="lesson1"/></chapter>');
      
      // Create sequential (lesson)
      fs.writeFileSync(path.join(tempDir, 'sequential', 'lesson1.xml'), 
        '<sequential display_name="Basic Concepts"><vertical url_name="unit1"/></sequential>');
      
      // Create vertical (unit)
      fs.writeFileSync(path.join(tempDir, 'vertical', 'unit1.xml'), 
        '<vertical display_name="Introduction Unit"><html url_name="content1"/></vertical>');
      
      // Create HTML content
      fs.writeFileSync(path.join(tempDir, 'html', 'content1.xml'), 
        '<html display_name="Welcome Content"/>');
      fs.writeFileSync(path.join(tempDir, 'html', 'content1.html'), 
        '<h2>Welcome</h2><p>This is the introduction to our course.</p>');

      // Build course tree
      const courseTree = buildCourseTree(tempDir);
      
      // Verify tree structure
      expect(courseTree.title).toBe('Introduction to Programming');
      expect(courseTree.chapters).toHaveLength(1);
      expect(courseTree.chapters[0].title).toBe('Getting Started');
      expect(courseTree.chapters[0].sequentials).toHaveLength(1);
      expect(courseTree.chapters[0].sequentials[0].title).toBe('Basic Concepts');
      expect(courseTree.chapters[0].sequentials[0].verticals).toHaveLength(1);
      
      // Transform to Markdown
      const markdownResult = transformCourseToMarkdown(courseTree, tempDir);
      
      // Verify complete Markdown structure
      expect(markdownResult).toContain('---'); // YAML frontmatter
      expect(markdownResult).toContain('author: Course Converter');
      expect(markdownResult).toContain('# Introduction to Programming'); // Course title
      expect(markdownResult).toContain('## Getting Started'); // Chapter title
      expect(markdownResult).toContain('### Basic Concepts'); // Sequential title
      expect(markdownResult).toContain('## Welcome'); // HTML content heading
      expect(markdownResult).toContain('This is the introduction to our course'); // HTML content
      expect(markdownResult).toContain('*Course conversion completed*'); // Footer
    });

    it('should handle complex course tree with multiple components', () => {
      // Create more complex structure
      const dirs = ['course', 'chapter', 'sequential', 'vertical', 'html', 'problem'];
      dirs.forEach(dir => {
        fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
      });

      // Setup files for complex structure
      fs.writeFileSync(path.join(tempDir, 'course.xml'), 
        '<course display_name="Advanced Course" url_name="advanced_2024"><chapter url_name="ch1"/></course>');
      
      fs.writeFileSync(path.join(tempDir, 'course', 'advanced_2024.xml'), 
        '<course display_name="Advanced Programming Course"><chapter url_name="ch1"/></course>');
        
      fs.writeFileSync(path.join(tempDir, 'chapter', 'ch1.xml'), 
        '<chapter display_name="Chapter One"><sequential url_name="seq1"/></chapter>');
        
      fs.writeFileSync(path.join(tempDir, 'sequential', 'seq1.xml'), 
        '<sequential display_name="Lesson One"><vertical url_name="v1"/></sequential>');
        
      fs.writeFileSync(path.join(tempDir, 'vertical', 'v1.xml'), 
        '<vertical display_name="Unit One"><html url_name="h1"/><problem url_name="p1"/></vertical>');
        
      // HTML component
      fs.writeFileSync(path.join(tempDir, 'html', 'h1.xml'), 
        '<html display_name="Content"/>');
      fs.writeFileSync(path.join(tempDir, 'html', 'h1.html'), 
        '<h3>Content Title</h3><p>Some content here.</p>');
        
      // Problem component
      fs.writeFileSync(path.join(tempDir, 'problem', 'p1.xml'), 
        '<problem display_name="Quiz"><stringresponse answer="test"><p>Enter answer:</p></stringresponse></problem>');

      const courseTree = buildCourseTree(tempDir);
      const markdown = transformCourseToMarkdown(courseTree, tempDir);
      
      // Verify multiple component types are rendered
      expect(markdown).toContain('# Advanced Programming Course');
      expect(markdown).toContain('## Chapter One');
      expect(markdown).toContain('### Lesson One');
      expect(markdown).toContain('### Content Title'); // From HTML
      expect(markdown).toContain('Enter answer:'); // From problem
    });
  });

  // ============================================================================
  // Additional Feature Tests - Hints Support
  // ============================================================================
  describe('Hints Support', () => {
    describe('extractHints function', () => {
      it('should extract hints from hint elements', () => {
        const content = {
          hint: [
            'This is the first hint',
            'This is the second hint'
          ]
        };
        
        const hints = extractHints(content);
        expect(hints).toEqual(['This is the first hint', 'This is the second hint']);
      });

      it('should extract hints from demotedhint elements', () => {
        const content = {
          demotedhint: [
            'This is a demoted hint'
          ]
        };
        
        const hints = extractHints(content);
        expect(hints).toEqual(['This is a demoted hint']);
      });

      it('should extract hints from complex hint objects', () => {
        const content = {
          hint: [
            { '#text': 'This is a complex hint' },
            'This is a simple hint'
          ]
        };
        
        const hints = extractHints(content);
        expect(hints).toEqual(['This is a complex hint', 'This is a simple hint']);
      });

      it('should extract description as hint', () => {
        const content = {
          description: 'This is a helpful description that should be treated as a hint'
        };
        
        const hints = extractHints(content);
        expect(hints).toEqual(['This is a helpful description that should be treated as a hint']);
      });

      it('should return empty array when no hints exist', () => {
        const content = {};
        const hints = extractHints(content);
        expect(hints).toEqual([]);
      });
    });

    it('should render text input problem with hints in correct format', () => {
      const content = {
        stringresponse: {
          p: 'What is $37 + 15$?',
          '@_answer': '52',
          hint: [
            'the solution is larger than 50',
            'it is less than 55',
            'it should be an even number'
          ]
        }
      };
      
      const result = renderTextInputProblem(content, 'Math Question');
      
      expect(result).toContain('What is $37 + 15$?');
      expect(result).toContain('    [[52]]');
      expect(result).toContain('- [[?]] the solution is larger than 50');
      expect(result).toContain('- [[?]] it is less than 55');
      expect(result).toContain('- [[?]] it should be an even number');
    });

    it('should render multiple choice problem with hints in correct format', () => {
      const content = {
        multiplechoiceresponse: {
          p: 'What is $37 + 15$?',
          choicegroup: {
            choice: [
              { '#text': '50', '@_correct': 'false' },
              { '#text': '52', '@_correct': 'true' },
              { '#text': '55', '@_correct': 'false' }
            ]
          },
          hint: [
            'the solution is larger than 50',
            'it is less than 55',
            'it should be an even number'
          ]
        }
      };
      
      const result = renderMultipleChoiceProblem(content, 'Math Question');
      
      expect(result).toContain('What is $37 + 15$?');
      expect(result).toContain('- [[ ]] 50');
      expect(result).toContain('- [[X]] 52');
      expect(result).toContain('- [[ ]] 55');
      expect(result).toContain('- [[?]] the solution is larger than 50');
      expect(result).toContain('- [[?]] it is less than 55');
      expect(result).toContain('- [[?]] it should be an even number');
    });
  });

  // ============================================================================
  // Additional Feature Tests - Advanced Problem Types
  // ============================================================================
  describe('Advanced Problem Types', () => {
    describe('Problem Type Detection', () => {
      it('should detect checkboxgroup as multiple choice', () => {
        const problem = {
          choiceresponse: {
            checkboxgroup: {
              choice: [
                { '#text': 'Option 1', '@_correct': 'true' },
                { '#text': 'Option 2', '@_correct': 'false' }
              ]
            }
          }
        };
        
        const type = determineProblemType(problem);
        expect(type).toBe('multiple_choice');
      });

      it('should detect choicegroup as single choice', () => {
        const problem = {
          choiceresponse: {
            choicegroup: {
              choice: [
                { '#text': 'Option 1', '@_correct': 'true' },
                { '#text': 'Option 2', '@_correct': 'false' }
              ]
            }
          }
        };
        
        const type = determineProblemType(problem);
        expect(type).toBe('choice');
      });

      it('should detect optionresponse as selection', () => {
        const problem = {
          optionresponse: {
            optioninput: {
              option: [
                { '#text': 'Option 1', '@_correct': 'False' },
                { '#text': 'Option 2', '@_correct': 'True' }
              ]
            }
          }
        };
        
        const type = determineProblemType(problem);
        expect(type).toBe('selection');
      });
    });

    describe('Checkboxgroup Problem Rendering', () => {
      it('should render checkboxgroup as multiple choice', () => {
        const content = {
          choiceresponse: {
            label: 'What are the conditions necessary for a hurricane to form?',
            checkboxgroup: {
              choice: [
                { '#text': 'Low atmospheric pressure', '@_correct': 'true' },
                { '#text': 'High atmospheric pressure', '@_correct': 'false' },
                { '#text': 'Cool water', '@_correct': 'false' },
                { '#text': 'Warm water', '@_correct': 'true' }
              ]
            }
          }
        };
        
        const result = renderMultipleChoiceProblem(content, 'Hurricane Question');
        
        expect(result).toContain('What are the conditions necessary for a hurricane to form?');
        expect(result).toContain('- [[X]] Low atmospheric pressure');
        expect(result).toContain('- [[ ]] High atmospheric pressure');
        expect(result).toContain('- [[ ]] Cool water');
        expect(result).toContain('- [[X]] Warm water');
      });
    });

    describe('Selection Problems with Description', () => {
      it('should render optionresponse with description as hint', () => {
        const content = {
          optionresponse: {
            label: 'What is the name of the instrument used to measure wind speed?',
            description: 'You can add an optional tip or note related to the prompt like this.',
            optioninput: {
              option: [
                { '#text': 'Barometer', '@_correct': 'False' },
                { '#text': 'Anemometer', '@_correct': 'True' },
                { '#text': 'Hygrometer', '@_correct': 'False' },
                { '#text': 'Thermometer', '@_correct': 'False' }
              ]
            }
          }
        };
        
        const result = renderSelectionProblem(content, 'Wind Speed Question');
        
        expect(result).toContain('What is the name of the instrument used to measure wind speed?');
        expect(result).toContain('[[ Barometer | ( Anemometer ) | Hygrometer | Thermometer ]]');
        expect(result).toContain('- [[?]] You can add an optional tip or note related to the prompt like this.');
      });
    });
  });

  // ============================================================================
  // Additional Coverage Tests - Number Input and Choice Problems
  // ============================================================================
  describe('Number Input Problems', () => {
    it('should render number input problem correctly', () => {
      const content = {
        numericalresponse: {
          p: 'What is 25 + 17?',
          label: 'Enter your answer:',
          '@_answer': '42'
        }
      };
      
      const result = renderNumberInputProblem(content, 'Math Addition');
      
      expect(result).toContain('What is 25 + 17?');
      expect(result).toContain('Enter your answer:');
      expect(result).toContain('[[Enter a number]]');
    });

    it('should render number input problem with hints', () => {
      const content = {
        numericalresponse: {
          p: 'Calculate $\\sqrt{144}$',
          hint: [
            'Think about what number multiplied by itself equals 144',
            'The answer is a perfect square'
          ]
        }
      };
      
      const result = renderNumberInputProblem(content, 'Square Root');
      
      expect(result).toContain('Calculate $\\sqrt{144}$');
      expect(result).toContain('[[Enter a number]]');
      expect(result).toContain('- [[?]] Think about what number multiplied by itself equals 144');
      expect(result).toContain('- [[?]] The answer is a perfect square');
    });

    it('should handle number input with only answer attribute', () => {
      const content = {
        numericalresponse: {
          '@_answer': '100'
        }
      };
      
      const result = renderNumberInputProblem(content, 'Simple Number');
      
      expect(result).toContain('[[Enter a number]]');
    });
  });

  describe('Choice Problems', () => {
    it('should render choice problem correctly', () => {
      const content = {
        choiceresponse: {
          p: 'Which programming language is used for web development?',
          choicegroup: {
            choice: [
              { '#text': 'Python', '@_correct': 'false' },
              { '#text': 'JavaScript', '@_correct': 'true' },
              { '#text': 'C++', '@_correct': 'false' }
            ]
          }
        }
      };
      
      const result = renderChoiceProblem(content, 'Programming Language');
      
      expect(result).toContain('Which programming language is used for web development?');
      expect(result).toContain('- [( )] Python');
      expect(result).toContain('- [(X)] JavaScript');
      expect(result).toContain('- [( )] C++');
    });

    it('should handle choice problem with hints', () => {
      const content = {
        choiceresponse: {
          p: 'What is the capital of Japan?',
          choicegroup: {
            choice: [
              { '#text': 'Seoul', '@_correct': 'false' },
              { '#text': 'Tokyo', '@_correct': 'true' },
              { '#text': 'Beijing', '@_correct': 'false' }
            ]
          },
          hint: [
            'It is the most populous metropolitan area in the world',
            'The city hosted the 2020 Olympics'
          ]
        }
      };
      
      const result = renderChoiceProblem(content, 'Japan Capital');
      
      expect(result).toContain('What is the capital of Japan?');
      expect(result).toContain('- [( )] Seoul');
      expect(result).toContain('- [(X)] Tokyo');
      expect(result).toContain('- [( )] Beijing');
      expect(result).toContain('- [[?]] It is the most populous metropolitan area in the world');
      expect(result).toContain('- [[?]] The city hosted the 2020 Olympics');
    });
  });

  // ============================================================================
  // Error Handling and Edge Cases
  // ============================================================================
  describe('Error Handling and Edge Cases', () => {
    it('should handle empty problem content gracefully', () => {
      const emptyContent = {};
      
      // Test different problem types with empty content
      expect(() => renderNumberInputProblem(emptyContent, 'Empty')).not.toThrow();
      expect(() => renderChoiceProblem(emptyContent, 'Empty')).not.toThrow();
      expect(() => renderTextInputProblem(emptyContent, 'Empty')).not.toThrow();
    });

    it('should handle extractHints with invalid input', () => {
      // Test with empty object (valid case)
      expect(extractHints({})).toEqual([]);
      
      // Test that functions exist and behave predictably with edge cases
      const emptyHints = extractHints({ someOtherProperty: 'value' });
      expect(Array.isArray(emptyHints)).toBe(true);
    });

    it('should handle problem type detection with invalid content', () => {
      expect(determineProblemType({})).toBe('unknown');
      
      // Test with valid empty problem structure
      const unknownProblem = { someUnknownType: {} };
      expect(determineProblemType(unknownProblem)).toBe('unknown');
    });

    it('should handle multiple choice with missing choices', () => {
      const content = {
        multiplechoiceresponse: {
          p: 'Question with no choices'
        }
      };
      
      const result = renderMultipleChoiceProblem(content, 'No Choices');
      expect(result).toContain('Question with no choices');
    });

    it('should handle image path replacement with malformed URLs', () => {
      const malformedHTML = `
        <img src="/static/" alt="Empty path" />
        <img src="/static" alt="No trailing slash" />
        <img src="static/relative.jpg" alt="Relative path" />
      `;
      
      const result = rewriteMediaPaths(malformedHTML);
      
      // Should handle these gracefully without breaking
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});