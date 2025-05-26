// Test the enhanced QCM patterns directly
const patterns = [
  /(\d+)\s*\/\s*([a-eA-E]+)/g,
  /(\d+)\.\s*([a-eA-E]+)/g,
  /(\d+)\s*-\s*([a-eA-E]+)/g,
  /(\d+)\s*:\s*([a-eA-E]+)/g,
  /[Qq](\d+)\s*[:.]?\s*([a-eA-E]+)/g,
];

function extractQCMAnswers(text) {
  const answers = [];
  const processedAnswers = new Set();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    
    for (const match of matches) {
      const questionNumber = parseInt(match[1], 10);
      const answer = match[2].toLowerCase();
      const rawText = match[0];
      
      const uniqueKey = `${questionNumber}-${answer}`;

      if (!processedAnswers.has(uniqueKey)) {
        answers.push({
          questionNumber,
          answer,
          rawText,
        });
        processedAnswers.add(uniqueKey);
      }
    }
  }

  return answers.sort((a, b) => {
    if (a.questionNumber !== b.questionNumber) {
      return a.questionNumber - b.questionNumber;
    }
    return a.answer.localeCompare(b.answer);
  });
}

// Test cases
const testTexts = [
  "1/c\n2/b\n3/a",  // Single letters
  "1/AB\n2-BC\n3. CD\nQ4: DE",  // Multi-letters
  "1/A\n1/B\n2-C\n2-D",  // Multiple answers per question
  "Mixed text with 1/AB and 2/BC here",  // In context
];

console.log('🔍 Testing Enhanced QCM Patterns\n');

testTexts.forEach((text, index) => {
  console.log(`Test ${index + 1}: "${text}"`);
  const answers = extractQCMAnswers(text);
  
  if (answers.length > 0) {
    answers.forEach(answer => {
      console.log(`  Q${answer.questionNumber}: ${answer.answer.toUpperCase()} (from "${answer.rawText}")`);
    });
  } else {
    console.log('  No answers detected');
  }
  console.log('');
});

console.log('✅ Test Complete');
