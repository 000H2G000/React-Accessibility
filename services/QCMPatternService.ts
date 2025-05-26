export interface QCMAnswer {
  questionNumber: number;
  answer: string;
  rawText: string;
}

export class QCMPatternService {  // Regex patterns for different QCM formats - supports multi-letter responses and comma-separated answers
  private static readonly patterns = [
    // Pattern: "1/c", "2/b", "3/a" or "1/AB", "2/BC" or "1/b,c", "2/a,d,e"
    /(\d+)\s*\/\s*([a-eA-E]+(?:\s*,\s*[a-eA-E]+)*)/g,
    // Pattern: "1. c", "2. b", "3. a" or "1. AB", "2. BC" or "1. b,c", "2. a,d,e"
    /(\d+)\.\s*([a-eA-E]+(?:\s*,\s*[a-eA-E]+)*)/g,
    // Pattern: "1-c", "2-b", "3-a" or "1-AB", "2-BC" or "1-b,c", "2-a,d,e"
    /(\d+)\s*-\s*([a-eA-E]+(?:\s*,\s*[a-eA-E]+)*)/g,
    // Pattern: "1: c", "2: b", "3: a" or "1: AB", "2: BC" or "1: b,c", "2: a,d,e"
    /(\d+)\s*:\s*([a-eA-E]+(?:\s*,\s*[a-eA-E]+)*)/g,
    // Pattern: "Q1: c", "Q2: b", "Q3: a" or "Q1: AB", "Q2: BC" or "Q1: b,c", "Q2: a,d,e"
    /[Qq](\d+)\s*[:.]?\s*([a-eA-E]+(?:\s*,\s*[a-eA-E]+)*)/g,
  ];  /**
   * Extracts QCM answers from text
   * Now supports multi-letter responses (e.g., "AB", "BC") and comma-separated answers (e.g., "a,b", "b,c,d")
   */
  static extractQCMAnswers(text: string): QCMAnswer[] {
    const answers: QCMAnswer[] = [];
    const processedAnswers = new Set<string>(); // Track unique question+answer combinations

    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        const questionNumber = parseInt(match[1], 10);
        const answerString = match[2].toLowerCase();
        const rawText = match[0];
        
        // Check if this is a comma-separated answer (like "b,c" or "a,d,e")
        if (answerString.includes(',')) {
          // Split by comma and process each answer separately
          const individualAnswers = answerString.split(',').map(a => a.trim()).filter(a => a.length > 0);
          
          for (const individualAnswer of individualAnswers) {
            const uniqueKey = `${questionNumber}-${individualAnswer}`;
            
            if (!processedAnswers.has(uniqueKey)) {
              answers.push({
                questionNumber,
                answer: individualAnswer,
                rawText: `${questionNumber}-${individualAnswer} (from: ${rawText})`,
              });
              processedAnswers.add(uniqueKey);
            }
          }
        } else {
          // Single answer or consecutive letters (like "abc")
          const uniqueKey = `${questionNumber}-${answerString}`;
          
          if (!processedAnswers.has(uniqueKey)) {
            answers.push({
              questionNumber,
              answer: answerString,
              rawText,
            });
            processedAnswers.add(uniqueKey);
          }
        }
      }
    }

    // Sort by question number, then by answer
    return answers.sort((a, b) => {
      if (a.questionNumber !== b.questionNumber) {
        return a.questionNumber - b.questionNumber;
      }
      return a.answer.localeCompare(b.answer);
    });
  }

  /**
   * Validates if text contains QCM answers
   */
  static containsQCMAnswers(text: string): boolean {
    return this.extractQCMAnswers(text).length > 0;
  }

  /**
   * Gets the count of QCM answers in text
   */
  static getQCMAnswerCount(text: string): number {
    return this.extractQCMAnswers(text).length;
  }

  /**
   * Formats QCM answers for display
   */
  static formatAnswersForDisplay(answers: QCMAnswer[]): string {
    return answers
      .map(answer => `Q${answer.questionNumber}: ${answer.answer.toUpperCase()}`)
      .join('\n');
  }
}
