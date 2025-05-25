export interface QCMAnswer {
  questionNumber: number;
  answer: string;
  rawText: string;
}

export class QCMPatternService {
  // Regex patterns for different QCM formats
  private static readonly patterns = [
    // Pattern: "1/c", "2/b", "3/a"
    /(\d+)\s*\/\s*([a-eA-E])/g,
    // Pattern: "1. c", "2. b", "3. a"
    /(\d+)\.\s*([a-eA-E])/g,
    // Pattern: "1-c", "2-b", "3-a"
    /(\d+)\s*-\s*([a-eA-E])/g,
    // Pattern: "1: c", "2: b", "3: a"
    /(\d+)\s*:\s*([a-eA-E])/g,
    // Pattern: "Q1: c", "Q2: b", "Q3: a"
    /[Qq](\d+)\s*[:.]?\s*([a-eA-E])/g,
  ];

  /**
   * Extracts QCM answers from text
   */
  static extractQCMAnswers(text: string): QCMAnswer[] {
    const answers: QCMAnswer[] = [];
    const processedQuestions = new Set<number>();

    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        const questionNumber = parseInt(match[1], 10);
        const answer = match[2].toLowerCase();
        const rawText = match[0];

        // Avoid duplicates for the same question number
        if (!processedQuestions.has(questionNumber)) {
          answers.push({
            questionNumber,
            answer,
            rawText,
          });
          processedQuestions.add(questionNumber);
        }
      }
    }

    // Sort by question number
    return answers.sort((a, b) => a.questionNumber - b.questionNumber);
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
