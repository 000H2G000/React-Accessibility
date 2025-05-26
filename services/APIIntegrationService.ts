import { QCMServerService, QCMFetchResponse } from './QCMServerService';
import { QCMPatternService, QCMAnswer } from './QCMPatternService';
import { QCMVibrationFlashService, QCMVibrationFlashSettings } from './QCMVibrationFlashService';
import { HapticService } from './HapticService';
import { FlashlightService } from './FlashlightService';

export interface APIProcessingSettings {
  autoProcess: boolean;
  processingSettings: Partial<QCMVibrationFlashSettings>;
  pollingInterval: number;
  showNotifications: boolean;
  stopAfterProcessing: boolean; // New setting to control auto-stop behavior
}

export interface ProcessingResult {
  success: boolean;
  processedAnswers: QCMAnswer[];
  totalAnswers: number;
  featuresUsed: string[];
  error?: string;
}

export class APIIntegrationService {
  private static isInitialized = false;  private static currentSettings: APIProcessingSettings = {
    autoProcess: true,
    processingSettings: {
      enableVibration: true,
      enableFlashlight: true,
      flashlightSeparatorDuration: 500,
      delayBetweenAnswers: 1000,
      delayAfterSeparator: 300,
    },
    pollingInterval: 300000, // 5 minutes (300,000 ms) instead of 3 seconds
    showNotifications: true,
    stopAfterProcessing: true, // Default: stop polling after successful processing
  };
  
  private static onDataReceived: ((data: QCMFetchResponse) => void) | null = null;
  private static onProcessingComplete: ((result: ProcessingResult) => void) | null = null;
  private static onError: ((error: string) => void) | null = null;

  /**
   * Initialize the API integration service
   */
  static async initialize(settings: Partial<APIProcessingSettings> = {}): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 API Integration Service already initialized');
      return;
    }

    this.currentSettings = { ...this.currentSettings, ...settings };
    
    // Check device capabilities
    const [hapticAvailable, flashlightAvailable] = await Promise.all([
      HapticService.isHapticAvailable(),
      FlashlightService.isFlashlightAvailable(),
    ]);

    // Update settings based on device capabilities
    this.currentSettings.processingSettings.enableVibration = 
      this.currentSettings.processingSettings.enableVibration && hapticAvailable;
    this.currentSettings.processingSettings.enableFlashlight = 
      this.currentSettings.processingSettings.enableFlashlight && flashlightAvailable;

    console.log('🚀 API Integration Service initialized with settings:', {
      autoProcess: this.currentSettings.autoProcess,
      hapticAvailable,
      flashlightAvailable,
      pollingInterval: this.currentSettings.pollingInterval,
    });

    // Set up the QCM data listener
    QCMServerService.addListener(this.handleIncomingQCMData.bind(this));
    
    this.isInitialized = true;
  }

  /**
   * Start automatic polling and processing
   */
  static startAutomaticProcessing(serverUrl?: string): void {
    if (!this.isInitialized) {
      throw new Error('APIIntegrationService must be initialized before starting automatic processing');
    }

    if (serverUrl) {
      QCMServerService.updateServerUrl(serverUrl);
    }

    console.log('🔄 Starting automatic QCM polling and processing...');
    QCMServerService.startSimplePolling(this.currentSettings.pollingInterval);
  }

  /**
   * Stop automatic processing
   */
  static stopAutomaticProcessing(): void {
    console.log('⏹️ Stopping automatic processing...');
    QCMServerService.stopPolling();
  }
  /**
   * Handle incoming QCM data from the server
   */
  private static async handleIncomingQCMData(data: QCMFetchResponse): Promise<void> {
    console.log('📥 Processing incoming QCM data:', {
      sessionId: data.session_id,
      totalAnswers: data.total_answers,
      autoProcess: this.currentSettings.autoProcess,
    });

    // Notify listeners about new data
    if (this.onDataReceived) {
      this.onDataReceived(data);
    }    // Auto-process if enabled
    if (this.currentSettings.autoProcess) {
      const result = await this.processQCMData(data);
      
      // Stop polling after successful QCM processing (if enabled)
      if (this.currentSettings.stopAfterProcessing && result.success && result.processedAnswers.length > 0) {
        console.log('✅ QCM successfully processed - stopping automatic polling');
        this.stopAutomaticProcessing();
      }
    }
  }

  /**
   * Process QCM data with vibration and flashlight feedback
   */
  static async processQCMData(data: QCMFetchResponse): Promise<ProcessingResult> {
    try {
      console.log('⚡ Processing QCM data for haptic/visual feedback...');
      
      // Extract QCM answers from the formatted text
      const extractedAnswers = QCMPatternService.extractQCMAnswers(data.formatted_text);
      
      if (extractedAnswers.length === 0) {
        const error = 'No QCM answers found in the data';
        console.warn('⚠️', error);
        
        if (this.onError) {
          this.onError(error);
        }
        
        return {
          success: false,
          processedAnswers: [],
          totalAnswers: 0,
          featuresUsed: [],
          error,
        };
      }

      // Process with combined vibration and flashlight service
      const featuresUsed: string[] = [];
      
      if (this.currentSettings.processingSettings.enableVibration) {
        featuresUsed.push('haptic vibration');
      }
      
      if (this.currentSettings.processingSettings.enableFlashlight) {
        featuresUsed.push('flashlight separation');
      }

      console.log(`🎯 Processing ${extractedAnswers.length} answers with: ${featuresUsed.join(', ')}`);

      // Execute the combined processing
      await QCMVibrationFlashService.processQCMWithFlashSeparation(
        extractedAnswers,
        this.currentSettings.processingSettings
      );

      const result: ProcessingResult = {
        success: true,
        processedAnswers: extractedAnswers,
        totalAnswers: extractedAnswers.length,
        featuresUsed,
      };

      console.log('✅ QCM processing completed successfully:', result);

      // Notify completion listeners
      if (this.onProcessingComplete) {
        this.onProcessingComplete(result);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      console.error('❌ Error processing QCM data:', error);
      
      if (this.onError) {
        this.onError(errorMessage);
      }

      return {
        success: false,
        processedAnswers: [],
        totalAnswers: 0,
        featuresUsed: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Manually check for and process new QCM data
   */
  static async checkAndProcessNewQCM(): Promise<ProcessingResult | null> {
    try {
      const data = await QCMServerService.checkForNewQCM();
      
      if (!data) {
        console.log('📭 No new QCM data available');
        return null;
      }

      return await this.processQCMData(data);
    } catch (error) {
      console.error('❌ Error checking for new QCM:', error);
      return {
        success: false,
        processedAnswers: [],
        totalAnswers: 0,
        featuresUsed: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update processing settings
   */
  static updateSettings(newSettings: Partial<APIProcessingSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    console.log('⚙️ API Integration settings updated:', this.currentSettings);
    
    // If polling interval changed and we're currently polling, restart
    if (newSettings.pollingInterval && QCMServerService.isPolling) {
      this.stopAutomaticProcessing();
      QCMServerService.startSimplePolling(this.currentSettings.pollingInterval);
    }
  }

  /**
   * Set up event listeners
   */
  static setEventListeners(listeners: {
    onDataReceived?: (data: QCMFetchResponse) => void;
    onProcessingComplete?: (result: ProcessingResult) => void;
    onError?: (error: string) => void;
  }): void {
    this.onDataReceived = listeners.onDataReceived || null;
    this.onProcessingComplete = listeners.onProcessingComplete || null;
    this.onError = listeners.onError || null;
    
    console.log('👂 Event listeners configured');
  }

  /**
   * Get current settings
   */
  static getSettings(): APIProcessingSettings {
    return { ...this.currentSettings };
  }

  /**
   * Get initialization status
   */
  static isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    console.log('🧹 Cleaning up API Integration Service...');
    this.stopAutomaticProcessing();
    QCMServerService.removeAllListeners();
    this.isInitialized = false;
    this.onDataReceived = null;
    this.onProcessingComplete = null;
    this.onError = null;
  }
}
