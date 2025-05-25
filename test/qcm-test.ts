import { QCMPatternService } from '../services/QCMPatternService';

// Test the QCM Pattern Recognition
const testTexts = [
  "1/c\n2/b\n3/a\n4/d\n5/e",
  "Q1: a\nQ2: b\nQ3: c",
  "1. c\n2. b\n3. a",
  "1-a\n2-b\n3-c\n4-d",
  "Mixed text with 1/c and some other content 2/b here",
  "No QCM answers here, just regular text"
];

console.log('🔍 Testing QCM Pattern Recognition\n');

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

console.log('✅ QCM Pattern Recognition Test Complete');
