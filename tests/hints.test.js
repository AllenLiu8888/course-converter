import { extractHints, renderMultipleChoiceProblem } from '../courseconverter.js';

describe('Hints Support Tests', () => {
  describe('extractHints function', () => {
    test('should extract hints from hint elements', () => {
      const content = {
        hint: [
          'This is the first hint',
          'This is the second hint'
        ]
      };
      
      const hints = extractHints(content);
      expect(hints).toEqual(['This is the first hint', 'This is the second hint']);
    });

    test('should extract hints from demotedhint elements', () => {
      const content = {
        demotedhint: [
          'This is a demoted hint'
        ]
      };
      
      const hints = extractHints(content);
      expect(hints).toEqual(['This is a demoted hint']);
    });

    test('should extract hints from complex hint objects', () => {
      const content = {
        hint: [
          { '#text': 'This is a complex hint' },
          'This is a simple hint'
        ]
      };
      
      const hints = extractHints(content);
      expect(hints).toEqual(['This is a complex hint', 'This is a simple hint']);
    });

    test('should return empty array when no hints exist', () => {
      const content = {};
      const hints = extractHints(content);
      expect(hints).toEqual([]);
    });
  });

  describe('Multiple Choice Problem with Hints', () => {
    test('should render MCQ with hints', () => {
      const content = {
        multiplechoiceresponse: {
          p: 'What is 2 + 2?',
          choicegroup: {
            choice: [
              { '#text': '3', '@_correct': 'false' },
              { '#text': '4', '@_correct': 'true' },
              { '#text': '5', '@_correct': 'false' }
            ]
          },
          hint: [
            'Think about basic arithmetic',
            'The answer is an even number'
          ]
        }
      };
      
      const result = renderMultipleChoiceProblem(content, 'Math Question');
      
      expect(result).toContain('What is 2 + 2?');
      expect(result).toContain('- [[ ]] 3');
      expect(result).toContain('- [[X]] 4');
      expect(result).toContain('- [[ ]] 5');
      expect(result).toContain('- [[?]] Think about basic arithmetic');
      expect(result).toContain('- [[?]] The answer is an even number');
    });
  });
});
