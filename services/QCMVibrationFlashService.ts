import { HapticService } from './HapticService';
import { FlashlightService } from './FlashlightService';
import { QCMAnswer } from './QCMPatternService';

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
   * Supports patterns like: "1-A [flash] B, 2-A, 3-C [flash] B [flash] A"
   */
  static async processQCMWithFlashSeparation(
    answers: QCMAnswer[],
    settings: Partial<QCMVibrationFlashSettings> = {}
  ): Promise<void> {
    const config = { ...this.defaultSettings, ...settings };
    
    try {
      console.log('Starting QCM processing with flash separation...');
      
      // Group answers by question number
      const groupedAnswers = this.groupAnswersByQuestion(answers);
      
      for (let i = 0; i < groupedAnswers.length; i++) {
        const questionGroup = groupedAnswers[i];
        console.log(`Processing question ${questionGroup.questionNumber} with ${questionGroup.answers.length} answers`);
        
        // Process each answer in the question
        for (let j = 0; j < questionGroup.answers.length; j++) {
          const answer = questionGroup.answers[j];
          
          // Vibrate for the answer
          if (config.enableVibration) {
            await HapticService.testAnswerVibration(answer.answer);
            console.log(`Vibrated for answer: ${answer.answer}`);
          }
          
          // Add flashlight separation if not the last answer in the question
          if (j < questionGroup.answers.length - 1 && config.enableFlashlight) {
            await this.delay(config.delayAfterSeparator);
            await FlashlightService.flash(config.flashlightSeparatorDuration);
            console.log('Separator flash executed');
            await this.delay(config.delayAfterSeparator);
          }
        }
        
        // Delay between questions (except after the last question)
        if (i < groupedAnswers.length - 1) {
          await this.delay(config.delayBetweenAnswers);
        }
      }
      
      console.log('QCM processing with flash separation completed');
    } catch (error) {
      console.error('Error in QCM processing with flash separation:', error);
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
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
