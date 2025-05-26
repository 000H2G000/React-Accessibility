import { QCMPatternService } from '../services/QCMPatternService.js';

// Test various multi-response scenarios
const testTexts = [
  // Single letter responses
  "1/c\n2/b\n3/a\n4/d\n5/e",
  
  // Multi-letter responses 
  "1/AB\n2-BC\n3. CD\nQ4: DE\n5: AC",
  
  // Mixed single and multi-letter
  "1/a\n2/BC\n3-D\n4. EF\nQ5: g",
  
  // Multiple answers for same question (should now be supported)
  "1/A\n1/B\n2-C\n2-D\n3. E",
  
  // Complex multi-letter in mixed text
  "Mixed text with 1/AB and some other content 2/BC here, also Q3: DE",
  
  // Edge cases
  "1: ABCDE\n2-A\n3/BC\n4. D",
  
  // No QCM answers
  "No QCM answers here, just regular text"
];

console.log('🔍 Testing Enhanced QCM Pattern Recognition (Multi-Response Support)\n');

testTexts.forEach((text, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Input: "${text}"`);
  
  const answers = QCMPatternService.extractQCMAnswers(text);
  console.log(`Detected answers: ${answers.length}`);
  
  if (answers.length > 0) {
    answers.forEach(answer => {
      console.log(`  Q${answer.questionNumber}: ${answer.answer.toUpperCase()} (from "${answer.rawText}")`);
    });
    console.log(`Formatted: ${QCMPatternService.formatAnswersForDisplay(answers)}`);
  } else {
    console.log('  No QCM answers detected');
  }
  console.log('---\n');
});

console.log('✅ Enhanced QCM Pattern Recognition Test Complete');
