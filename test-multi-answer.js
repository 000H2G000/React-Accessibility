// Test script for multi-answer QCM processing
const { QCMPatternService } = require('./services/QCMPatternService');

// Test cases for multi-answer responses
const testCases = [
  "1-b,c",
  "2. a,d,e", 
  "3/c,d",
  "Q4: b,c,d",
  "5: a,b",
  "1-abc", // consecutive letters
  "2-b,c 3-a,d,e", // multiple questions with multi-answers
];

console.log('Testing Multi-Answer QCM Processing\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  
  try {
    const answers = QCMPatternService.extractQCMAnswers(testCase);
    
    if (answers.length === 0) {
      console.log('  ❌ No answers detected');
    } else {
      console.log(`  ✅ Detected ${answers.length} answer(s):`);
      answers.forEach(answer => {
        console.log(`    Question ${answer.questionNumber}: ${answer.answer.toUpperCase()} (${answer.rawText})`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('');
});

console.log('Multi-Answer Processing Test Complete!');
