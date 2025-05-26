// Quick test for multi-response QCM patterns
const testText = `
Multi-letter responses:
1/AB
2-CD  
3. BC
Q4: DE
5: AC
`;

// Current regex patterns (only single letters)
const currentPatterns = [
  /(\d+)\s*\/\s*([a-eA-E])/g,
  /(\d+)\.\s*([a-eA-E])/g,
  /(\d+)\s*-\s*([a-eA-E])/g,
  /(\d+)\s*:\s*([a-eA-E])/g,
  /[Qq](\d+)\s*[:.]?\s*([a-eA-E])/g,
];

// Updated regex patterns (supporting multiple letters)
const updatedPatterns = [
  /(\d+)\s*\/\s*([a-eA-E]+)/g,
  /(\d+)\.\s*([a-eA-E]+)/g,
  /(\d+)\s*-\s*([a-eA-E]+)/g,
  /(\d+)\s*:\s*([a-eA-E]+)/g,
  /[Qq](\d+)\s*[:.]?\s*([a-eA-E]+)/g,
];

console.log('Testing current patterns (single letter):');
currentPatterns.forEach((pattern, i) => {
  const matches = [...testText.matchAll(pattern)];
  console.log(`Pattern ${i + 1}:`, matches.map(m => `${m[1]}: ${m[2]}`));
});

console.log('\nTesting updated patterns (multiple letters):');
updatedPatterns.forEach((pattern, i) => {
  const matches = [...testText.matchAll(pattern)];
  console.log(`Pattern ${i + 1}:`, matches.map(m => `${m[1]}: ${m[2]}`));
});
