import { HapticService } from './HapticService';
import { FlashlightService } from './FlashlightService';
import { QCMAnswer } from './QCMPatternService';
import * as Haptics from 'expo-haptics';

export interface QCMVibrationFlashSettings {
  enableVibration: boolean;
  enableFlashlight: boolean;
  flashlightSeparatorDuration: number; // Duration for separator flashes
  delayBetweenAnswers: number; // Delay between different answers
  delayAfterSeparator: number; // Delay after separator flash
}

export class QCMVibrationFlashService {
  private static defaultSettings: QCMVibrationFlashSettings = {
    enableVibration: true,
    enableFlashlight: true,
    flashlightSeparatorDuration: 500,
    delayBetweenAnswers: 1000,
    delayAfterSeparator: 300,
  };

  /**
   * Check if both services are available
   */
  static async checkAvailability(): Promise<{
    haptic: boolean;
    flashlight: boolean;
  }> {
    const [haptic, flashlight] = await Promise.all([
      HapticService.isHapticAvailable(),
      FlashlightService.isFlashlightAvailable(),
    ]);

    return { haptic, flashlight };
  }
  /**
   * Process QCM answers with combined vibration and flashlight feedback
   * New pattern: 20 medium vibrations before each question, 5s silence between answers within same question
   */
  static async processQCMWithFlashSeparation(
    answers: QCMAnswer[],
    settings: Partial<QCMVibrationFlashSettings> = {}
  ): Promise<void> {
    const config = { ...this.defaultSettings, ...settings };
    
    try {
      console.log('Starting QCM processing with new vibration pattern...');
      
      // Group answers by question number
      const groupedAnswers = this.groupAnswersByQuestion(answers);
      
      for (let i = 0; i < groupedAnswers.length; i++) {
        const questionGroup = groupedAnswers[i];
        console.log(`Processing question ${questionGroup.questionNumber} with ${questionGroup.answers.length} answers`);
        
        // Play 20 medium vibrations before each question
        if (config.enableVibration) {
          console.log(`Playing 20 medium vibrations for question ${questionGroup.questionNumber}`);
          await this.play20MediumVibrations();
        }
        
        // Process each answer in the question
        for (let j = 0; j < questionGroup.answers.length; j++) {
          const answer = questionGroup.answers[j];
          
          // Vibrate for the answer
          if (config.enableVibration) {
            await HapticService.testAnswerVibration(answer.answer);
            console.log(`Vibrated for answer: ${answer.answer}`);
          }
          
          // Add 5-second silence between answers within the same question (except after the last answer)
          if (j < questionGroup.answers.length - 1) {
            console.log(`5-second silence between answers in question ${questionGroup.questionNumber}`);
            await this.delay(5000); // 5 seconds silence
            
            // Optional flashlight separation
            if (config.enableFlashlight) {
              await FlashlightService.flash(config.flashlightSeparatorDuration);
              console.log('Separator flash executed');
              await this.delay(config.delayAfterSeparator);
            }
          }
        }
        
        // Small delay between questions (except after the last question)
        if (i < groupedAnswers.length - 1) {
          await this.delay(1000); // Brief pause before next question
        }
      }
      
      console.log('QCM processing with new vibration pattern completed');
    } catch (error) {
      console.error('Error in QCM processing:', error);
      // Emergency cleanup
      await FlashlightService.emergencyOff();
      throw error;
    }
  }

  /**
   * Process individual answer with optional flash separation
   */
  static async processAnswerWithFlash(
    answer: string,
    useFlash: boolean = false,
    settings: Partial<QCMVibrationFlashSettings> = {}
  ): Promise<void> {
    const config = { ...this.defaultSettings, ...settings };
    
    try {
      // Vibrate for the answer
      if (config.enableVibration) {
        await HapticService.testAnswerVibration(answer);
      }
      
      // Flash if requested
      if (useFlash && config.enableFlashlight) {
        await this.delay(config.delayAfterSeparator);
        await FlashlightService.flash(config.flashlightSeparatorDuration);
        await this.delay(config.delayAfterSeparator);
      }
    } catch (error) {
      console.error('Error processing answer with flash:', error);
      await FlashlightService.emergencyOff();
      throw error;
    }
  }

  /**
   * Create custom pattern: vibration sequence with flash separators
   * Example: A-B-flash-C, D-flash-E-F
   */
  static async executeCustomPattern(
    pattern: Array<{ answer: string; flashAfter?: boolean }>,
    settings: Partial<QCMVibrationFlashSettings> = {}
  ): Promise<void> {
    const config = { ...this.defaultSettings, ...settings };
    
    try {
      console.log('Executing custom pattern...');
      
      for (let i = 0; i < pattern.length; i++) {
        const item = pattern[i];
        
        // Vibrate for the answer
        if (config.enableVibration) {
          await HapticService.testAnswerVibration(item.answer);
          console.log(`Vibrated for: ${item.answer}`);
        }
        
        // Flash if specified
        if (item.flashAfter && config.enableFlashlight) {
          await this.delay(config.delayAfterSeparator);
          await FlashlightService.flash(config.flashlightSeparatorDuration);
          console.log('Pattern flash executed');
          await this.delay(config.delayAfterSeparator);
        }
        
        // Small delay between items (if not last and no flash after)
        if (i < pattern.length - 1 && !item.flashAfter) {
          await this.delay(200);
        }
      }
      
      console.log('Custom pattern execution completed');
    } catch (error) {
      console.error('Error executing custom pattern:', error);
      await FlashlightService.emergencyOff();
      throw error;
    }
  }

  /**
   * Test flashlight functionality
   */
  static async testFlashlight(): Promise<void> {
    try {
      console.log('Testing flashlight...');
      await FlashlightService.flash(1000); // 1 second flash
      console.log('Flashlight test completed');
    } catch (error) {
      console.error('Flashlight test failed:', error);
      throw error;
    }
  }

  /**
   * Test combined vibration and flash
   */
  static async testCombined(): Promise<void> {
    try {
      console.log('Testing combined vibration and flash...');
      
      // Vibrate for 'A'
      await HapticService.testAnswerVibration('a');
      await this.delay(300);
      
      // Flash separator
      await FlashlightService.flash(500);
      await this.delay(300);
      
      // Vibrate for 'B'
      await HapticService.testAnswerVibration('b');
      
      console.log('Combined test completed');
    } catch (error) {
      console.error('Combined test failed:', error);
      await FlashlightService.emergencyOff();
      throw error;
    }
  }

  /**
   * Emergency stop - turns off flashlight and stops all operations
   */
  static async emergencyStop(): Promise<void> {
    try {
      await FlashlightService.emergencyOff();
      console.log('Emergency stop completed');
    } catch (error) {
      console.error('Emergency stop failed:', error);
    }
  }

  /**
   * Group answers by question number for organized processing
   */
  private static groupAnswersByQuestion(answers: QCMAnswer[]): Array<{
    questionNumber: number;
    answers: QCMAnswer[];
  }> {
    const groups = new Map<number, QCMAnswer[]>();
    
    answers.forEach(answer => {
      const qNum = answer.questionNumber;
      if (!groups.has(qNum)) {
        groups.set(qNum, []);
      }
      groups.get(qNum)!.push(answer);
    });
    
    // Convert to array and sort by question number
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([questionNumber, answers]) => ({
        questionNumber,
        answers: answers.sort((a, b) => a.answer.localeCompare(b.answer))
      }));
  }
  /**
   * Play 20 medium vibrations with consistent timing
   */
  private static async play20MediumVibrations(): Promise<void> {
    // One long continuous vibration for 10 seconds
    const startTime = Date.now();
    const duration = 10000; // 10 seconds
    
    while (Date.now() - startTime < duration) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await this.delay(50); // Very short delay to maintain continuous feel
    }
    
    // Brief pause after the long vibration
    await this.delay(500);
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
