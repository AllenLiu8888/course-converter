import { 
  determineProblemType, 
  renderMultipleChoiceProblem, 
  renderSelectionProblem,
  extractHints 
} from '../courseconverter.js';

describe('Problem Types Tests', () => {
  describe('determineProblemType function', () => {
    test('should detect checkboxgroup as multiple choice', () => {
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

    test('should detect choicegroup as single choice', () => {
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

    test('should detect optionresponse as selection', () => {
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
    test('should render checkboxgroup as multiple choice', () => {
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

  describe('Optionresponse with Description', () => {
    test('should render optionresponse with description as hint', () => {
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

  describe('extractHints function', () => {
    test('should extract description as hint', () => {
      const content = {
        description: 'This is a helpful description that should be treated as a hint'
      };
      
      const hints = extractHints(content);
      expect(hints).toEqual(['This is a helpful description that should be treated as a hint']);
    });

    test('should extract multiple descriptions', () => {
      const content = {
        description: [
          'First description',
          'Second description'
        ]
      };
      
      const hints = extractHints(content);
      expect(hints).toEqual(['First description', 'Second description']);
    });
  });
});
