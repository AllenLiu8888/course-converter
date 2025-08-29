import { renderTextInputProblem, renderMultipleChoiceProblem } from '../courseconverter.js';

describe('Hints Format Examples', () => {
  test('should render text input problem with hints in correct format', () => {
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
    
    // CN: 验证问题文本
    expect(result).toContain('What is $37 + 15$?');
    
    // CN: 验证答案格式
    expect(result).toContain('    [[52]]');
    
    // CN: 验证 hints 格式
    expect(result).toContain('- [[?]] the solution is larger than 50');
    expect(result).toContain('- [[?]] it is less than 55');
    expect(result).toContain('- [[?]] it should be an even number');
  });

  test('should render multiple choice problem with hints in correct format', () => {
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
    
    // CN: 验证问题文本
    expect(result).toContain('What is $37 + 15$?');
    
    // CN: 验证选项格式
    expect(result).toContain('- [[ ]] 50');
    expect(result).toContain('- [[X]] 52');
    expect(result).toContain('- [[ ]] 55');
    
    // CN: 验证 hints 格式
    expect(result).toContain('- [[?]] the solution is larger than 50');
    expect(result).toContain('- [[?]] it is less than 55');
    expect(result).toContain('- [[?]] it should be an even number');
  });
});
