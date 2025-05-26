import { AppState, AppStateStatus } from 'react-native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticService } from './HapticService';
import { QCMVibrationFlashService } from './QCMVibrationFlashService';

const STORAGE_KEY = 'qcm_background_settings';

export interface BackgroundSettings {
  enabled: boolean;
  vibrationEnabled: boolean;
  hapticEnabled: boolean;
  vibrationIntensity: 'light' | 'medium' | 'heavy';
  hapticType: 'a' | 'b' | 'c' | 'd' | 'e'; // Use answer letters instead of haptic types
  intervalSeconds: number;
  lastRun?: number;
}

export class BackgroundTaskService {
  private static isInitialized = false;
  private static appStateSubscription: any = null;
  private static processingInterval: NodeJS.Timeout | null = null;
  private static isProcessingActive = false;
  private static currentSettings: BackgroundSettings | null = null;
  
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Setup app state monitoring
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      
      this.isInitialized = true;
      console.log('Background task service initialized');
      
    } catch (error) {
      console.error('Failed to initialize background task service:', error);
    }
  }
  
  private static handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('App state changed to:', nextAppState);
    
    if (nextAppState === 'background' && this.isProcessingActive) {
      // App moved to background - keep processing but activate keep awake
      console.log('App backgrounded, activating keep awake for QCM processing');
      activateKeepAwake();
    } else if (nextAppState === 'active') {
      // App came back to foreground - can deactivate keep awake if needed
      console.log('App foregrounded');
      // Note: We'll keep the keep awake active while processing is running
    }
  };
  
  static async cleanup(): Promise<void> {
    try {
      await this.stopBackgroundProcessing();
      
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      deactivateKeepAwake();
      this.isInitialized = false;
      console.log('Background task service cleaned up');
      
    } catch (error) {
      console.error('Failed to cleanup background task service:', error);
    }
  }
    static async startBackgroundProcessing(
    serverUrl: string,
    settings: BackgroundSettings
  ): Promise<boolean> {
    try {
      // Stop any existing processing
      await this.stopBackgroundProcessing();
      
      // Save settings
      this.currentSettings = settings;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      if (!settings.enabled) {
        console.log('Background processing disabled in settings');
        return false;
      }
      
      // Activate keep awake to prevent the app from sleeping
      activateKeepAwake();
      
      // Start the processing interval
      this.processingInterval = setInterval(async () => {
        await this.executeQCMCycle();
      }, settings.intervalSeconds * 1000);
      
      this.isProcessingActive = true;
      console.log(`Background processing started with ${settings.intervalSeconds}s interval`);
      return true;
      
    } catch (error) {
      console.error('Failed to start background processing:', error);
      return false;
    }
  }
  
  static async stopBackgroundProcessing(): Promise<void> {
    try {
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }
      
      this.isProcessingActive = false;
      deactivateKeepAwake();
      
      console.log('Background processing stopped');
      
    } catch (error) {
      console.error('Failed to stop background processing:', error);
    }
  }
    private static async executeQCMCycle(): Promise<void> {
    try {
      if (!this.currentSettings?.enabled) {
        console.log('QCM cycle skipped - background processing disabled');
        return;
      }
      
      console.log('Executing background QCM cycle...');
      
      // Process one QCM cycle
      if (this.currentSettings.vibrationEnabled) {
        await HapticService.testAnswerVibration('a'); // Simple test vibration
      }
        if (this.currentSettings.hapticEnabled) {
        await HapticService.testAnswerVibration(
          this.currentSettings.hapticType || 'a'
        );
      }
      
      // Update last run time
      this.currentSettings.lastRun = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
      
      console.log('Background QCM cycle completed');
      
    } catch (error) {
      console.error('Background QCM cycle error:', error);
    }
  }
    static async enableBackgroundProcessing(
    serverUrl: string, 
    settings: BackgroundSettings
  ): Promise<void> {
    try {
      settings.enabled = true;
      await this.startBackgroundProcessing(serverUrl, settings);
      console.log('Background processing enabled');
    } catch (error) {
      console.error('Failed to enable background processing:', error);
    }
  }
  
  static async disableBackgroundProcessing(): Promise<void> {
    try {
      await this.stopBackgroundProcessing();
      
      if (this.currentSettings) {
        this.currentSettings.enabled = false;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
      }
      
      console.log('Background processing disabled');
    } catch (error) {
      console.error('Failed to disable background processing:', error);
    }
  }
  
  static async getBackgroundStatus(): Promise<{
    isEnabled: boolean;
    isActive: boolean;
    lastRun?: number;
    settings?: BackgroundSettings;
  }> {
    try {
      const settingsStr = await AsyncStorage.getItem(STORAGE_KEY);
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      
      return {
        isEnabled: settings?.enabled || false,
        isActive: this.isProcessingActive,
        lastRun: settings?.lastRun,
        settings: settings,
      };
    } catch (error) {
      console.error('Failed to get background status:', error);
      return {
        isEnabled: false,
        isActive: false,
      };
    }
  }
  
  static isProcessing(): boolean {
    return this.isProcessingActive;
  }
}
