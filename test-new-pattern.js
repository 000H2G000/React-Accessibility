// Test script for the new vibration pattern
// Pattern: 20 medium vibrations, then question answers with 5s silence between them

const testData = `
1-A,B
2-B  
3-C,B,E
`;

console.log('Testing new vibration pattern:');
console.log('Expected behavior:');
console.log('20 medium vibrations');
console.log('1-A (silence 5s) B');
console.log('20 medium vibrations'); 
console.log('2-B');
console.log('20 medium vibrations');
console.log('3-C (silence 5s) B (silence 5s) E');
console.log('20 medium vibrations');
console.log('');
console.log('Test data:', testData.trim());
console.log('');
console.log('✅ Pattern test file created successfully');
console.log('Use this data in the React Native app to test the new vibration pattern');
