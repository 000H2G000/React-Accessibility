import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

export interface VibrationPattern {
  type: 'short' | 'medium' | 'long' | 'custom';
  intensity?: 'light' | 'medium' | 'heavy' | 'maximum';
  delay?: number;
  duration?: number; // For custom vibrations
}

export interface QCMVibrationSettings {
  enabled: boolean;
  answerPatterns: {
    a: VibrationPattern[];
    b: VibrationPattern[];
    c: VibrationPattern[];
    d: VibrationPattern[];
    e: VibrationPattern[];
  };
  questionNumberPattern: VibrationPattern[];
  separatorPattern: VibrationPattern[]; // Long beep between responses
  delayBetweenAnswers: number;
  delayBetweenQuestions: number;
}

export class HapticService {  private static readonly defaultSettings: QCMVibrationSettings = {
    enabled: true,    answerPatterns: {
      a: [{ type: 'custom', intensity: 'maximum', duration: 1000 }], // 1 long maximum pulse
      b: [
        { type: 'custom', intensity: 'maximum', duration: 1000 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 }
      ], // 2 long maximum pulses with consistent 200ms timing
      c: [
        { type: 'custom', intensity: 'maximum', duration: 1000 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 }
      ], // 3 long maximum pulses with consistent 200ms timing
      d: [
        { type: 'custom', intensity: 'maximum', duration: 1000 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 }
      ], // 4 long maximum pulses with consistent 200ms timing
      e: [
        { type: 'custom', intensity: 'maximum', duration: 1000 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 },
        { type: 'custom', intensity: 'maximum', duration: 1000, delay: 200 }
      ], // 5 long maximum pulses with consistent 200ms timing
    },
    questionNumberPattern: [{ type: 'custom', intensity: 'maximum', duration: 1000 }], // Long maximum pulse like MAX POWER
    separatorPattern: [{ type: 'custom', intensity: 'heavy', duration: 5000 }], // Long beep separator
    delayBetweenAnswers: 500,
    delayBetweenQuestions: 1200,
  };

  private static settings = { ...this.defaultSettings };

  /**
   * Updates haptic settings
   */
  static updateSettings(newSettings: Partial<QCMVibrationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Gets current haptic settings
   */
  static getSettings(): QCMVibrationSettings {
    return { ...this.settings };
  }

  /**
   * Resets settings to default
   */
  static resetToDefault(): void {
    this.settings = { ...this.defaultSettings };
  }  /**
   * Executes a single vibration pattern with maximum intensity
   */
  private static async executeVibrationPattern(pattern: VibrationPattern): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      if (pattern.type === 'custom' && pattern.intensity === 'maximum') {
        // Use React Native Vibration API for maximum strength
        const duration = pattern.duration || 500;
        
        if (Platform.OS === 'android') {
          // Android supports custom duration vibrations
          Vibration.vibrate(duration);
          // CRITICAL: Wait for the vibration to complete before returning
          await this.delay(duration);
        } else {
          // iOS - use pattern vibration for stronger effect
          const shortPulses = Math.floor(duration / 100);
          const vibrationPattern = [];
          let totalDuration = 0;
          
          for (let i = 0; i < shortPulses; i++) {
            vibrationPattern.push(100, 50); // 100ms vibrate, 50ms pause
            totalDuration += 150; // Track total duration
          }
          
          Vibration.vibrate(vibrationPattern);
          // CRITICAL: Wait for the entire pattern to complete
          await this.delay(totalDuration);
        }
      } else {
        // Fall back to Expo Haptics for other patterns
        const hapticType = this.getHapticType(pattern.type, pattern.intensity);
        await Haptics.impactAsync(hapticType);
        
        // Add extra vibration for heavy patterns
        if (pattern.intensity === 'heavy' || pattern.intensity === 'maximum') {
          await this.delay(50);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await this.delay(50); // Wait for the second haptic to complete
        }
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
      // Fallback to basic haptic
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await this.delay(100); // Wait for fallback haptic to complete
      } catch (fallbackError) {
        console.warn('Fallback haptic also failed:', fallbackError);
      }
    }
  }
  /**
   * Converts our pattern to Expo Haptics type
   */
  private static getHapticType(type: string, intensity?: string): Haptics.ImpactFeedbackStyle {
    // For maximum intensity, always use Heavy
    if (intensity === 'maximum') {
      return Haptics.ImpactFeedbackStyle.Heavy;
    }
    
    if (type === 'long' || type === 'custom') {
      return Haptics.ImpactFeedbackStyle.Heavy;
    }
    
    switch (intensity) {
      case 'light':
        return Haptics.ImpactFeedbackStyle.Light;
      case 'heavy':
        return Haptics.ImpactFeedbackStyle.Heavy;
      case 'medium':
      default:
        return Haptics.ImpactFeedbackStyle.Medium;
    }
  }

  /**
   * Executes a sequence of vibration patterns with delays
   */
  private static async executeVibrationSequence(patterns: VibrationPattern[]): Promise<void> {
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      
      if (i > 0 && pattern.delay) {
        await this.delay(pattern.delay);
      }
      
      await this.executeVibrationPattern(pattern);
    }
  }

  /**
   * Vibrates for a specific answer (a, b, c, d, e)
   */
  static async vibrateForAnswer(answer: string): Promise<void> {
    const normalizedAnswer = answer.toLowerCase() as keyof typeof this.settings.answerPatterns;
    
    if (!this.settings.answerPatterns[normalizedAnswer]) {
      console.warn(`Unknown answer: ${answer}`);
      return;
    }

    const patterns = this.settings.answerPatterns[normalizedAnswer];
    await this.executeVibrationSequence(patterns);
  }

  /**
   * Vibrates for a question number
   */
  static async vibrateForQuestionNumber(questionNumber: number): Promise<void> {
    // First, vibrate the long pulse to indicate question number
    await this.executeVibrationSequence(this.settings.questionNumberPattern);
    
    // Then vibrate short pulses for the number
    await this.delay(200);    const numberPatterns: VibrationPattern[] = [];
    for (let i = 0; i < questionNumber && i < 10; i++) { // Limit to 10 pulses
      numberPatterns.push({
        type: 'custom',
        intensity: 'maximum',
        duration: 1000, // Same as MAX POWER duration
        delay: i > 0 ? 200 : 0 // Same as MAX POWER timing
      });
    }
    
    await this.executeVibrationSequence(numberPatterns);
  }
  /**
   * Plays a long beep separator vibration
   */
  static async vibrateSeparator(): Promise<void> {
    await this.executeVibrationSequence(this.settings.separatorPattern);
  }

  /**
   * Vibrates for a complete QCM answer (question number + answer)
   */
  static async vibrateForQCMAnswer(questionNumber: number, answer: string): Promise<void> {
    // Vibrate for question number
    await this.vibrateForQuestionNumber(questionNumber);
    
    // Delay between question number and answer
    await this.delay(this.settings.delayBetweenAnswers);
    
    // Vibrate for answer
    await this.vibrateForAnswer(answer);
  }

  /**
   * Vibrates for multiple QCM answers in sequence with separator beeps
   */
  static async vibrateForQCMAnswers(answers: Array<{ questionNumber: number; answer: string }>): Promise<void> {
    for (let i = 0; i < answers.length; i++) {
      const { questionNumber, answer } = answers[i];
      
      // If not the first answer, play separator beep
      if (i > 0) {
        await this.delay(500); // Brief pause before separator
        await this.vibrateSeparator();
        await this.delay(800); // Pause after separator
      }
      
      await this.vibrateForQCMAnswer(questionNumber, answer);
      
      // Delay between questions (except for the last one)
      if (i < answers.length - 1) {
        await this.delay(this.settings.delayBetweenQuestions);
      }
    }
  }

  /**
   * Test vibration for a specific answer
   */
  static async testAnswerVibration(answer: string): Promise<void> {
    await this.vibrateForAnswer(answer);
  }

  /**
   * Test vibration for question number
   */
  static async testQuestionNumberVibration(questionNumber: number): Promise<void> {
    await this.vibrateForQuestionNumber(questionNumber);
  }
  /**
   * Test all answer letters (A, B, C, D, E) with 2.5 second margin between each
   * Loops continuously with 8 medium vibrations at the start of each loop
   */
  static async testAllAnswerVibrations(): Promise<void> {
    const letters = ['a', 'b', 'c', 'd', 'e'];
    let loopCount = 1;
    
    // Infinite loop
    while (true) {
      console.log(`Starting loop ${loopCount} - Playing 8 medium vibrations...`);
      
      // Play 8 medium vibrations at the start of each loop
      for (let j = 0; j < 8; j++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Small delay between medium vibrations (except after the last one)
        if (j < 7) {
          await this.delay(150); // 150ms between medium vibrations
        }
      }
      
      // Pause after the 8 medium vibrations before starting letters
      await this.delay(1000);
      
      // Test each letter in sequence
      for (let i = 0; i < letters.length; i++) {
        console.log(`Loop ${loopCount} - Testing vibration for letter: ${letters[i].toUpperCase()}`);
        
        // Vibrate for the current letter
        await this.vibrateForAnswer(letters[i]);
        
        // Add 2.5 second margin between letters (except after the last one)
        if (i < letters.length - 1) {
          await this.delay(2500); // 2.5 seconds of silence
        }
      }
      
      // Pause before starting the next loop
      await this.delay(3000); // 3 seconds before next loop starts
      
      loopCount++;
    }
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /**
   * Test maximum vibration capability
   */
  static async testMaximumVibration(): Promise<void> {
    try {
      console.log('Testing maximum vibration...');
      
      if (Platform.OS === 'android') {
        // Android: Use long vibration pattern
        Vibration.vibrate([0, 1000, 200, 1000, 200, 1000]); // pattern: wait, vibrate, pause, vibrate, pause, vibrate
      } else {
        // iOS: Multiple heavy impacts in quick succession
        for (let i = 0; i < 5; i++) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await this.delay(100);
        }
      }
    } catch (error) {
      console.warn('Maximum vibration test failed:', error);
    }
  }

  /**
   * Ultra-strong vibration pattern for emergency/attention getting
   */
  static async emergencyVibration(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Android: Intense pattern
        const pattern = [0, 500, 100, 500, 100, 500, 100, 800, 200, 800];
        Vibration.vibrate(pattern);
      } else {
        // iOS: Rapid heavy impacts
        for (let i = 0; i < 8; i++) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await this.delay(i % 2 === 0 ? 150 : 100);
        }
      }
    } catch (error) {
      console.warn('Emergency vibration failed:', error);
    }
  }

  /**
   * Check if haptic feedback is available
   */
  static async isHapticAvailable(): Promise<boolean> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return true;
    } catch {
      return false;
    }
  }
}
