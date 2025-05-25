import { Camera } from 'expo-camera';
import { Platform } from 'react-native';

export interface FlashlightPattern {
  duration: number; // Duration in milliseconds
  delay?: number; // Optional delay after flash
}

export class FlashlightService {
  private static isFlashlightOn = false;
  private static hasPermission = false;
  private static permissionChecked = false;

  /**
   * Request camera permissions (required for flashlight access)
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      this.permissionChecked = true;
      return this.hasPermission;
    } catch (error) {
      console.warn('Failed to request camera permissions:', error);
      this.hasPermission = false;
      this.permissionChecked = true;
      return false;
    }
  }

  /**
   * Check if flashlight is available
   */
  static async isFlashlightAvailable(): Promise<boolean> {
    try {
      if (!this.permissionChecked) {
        await this.requestPermissions();
      }
      
      // Flashlight is generally available on mobile devices with cameras
      return this.hasPermission && Platform.OS !== 'web';
    } catch (error) {
      console.warn('Failed to check flashlight availability:', error);
      return false;
    }
  }

  /**
   * Turn flashlight on
   */
  static async turnOn(): Promise<void> {
    try {
      if (!this.hasPermission) {
        await this.requestPermissions();
      }

      if (!this.hasPermission) {
        throw new Error('Camera permission not granted');
      }

      await Camera.setFlashModeAsync(Camera.Constants.FlashMode.torch);
      this.isFlashlightOn = true;
      console.log('Flashlight turned ON');
    } catch (error) {
      console.warn('Failed to turn on flashlight:', error);
      throw error;
    }
  }

  /**
   * Turn flashlight off
   */
  static async turnOff(): Promise<void> {
    try {
      if (!this.hasPermission) {
        console.warn('No camera permission, cannot turn off flashlight');
        return;
      }

      await Camera.setFlashModeAsync(Camera.Constants.FlashMode.off);
      this.isFlashlightOn = false;
      console.log('Flashlight turned OFF');
    } catch (error) {
      console.warn('Failed to turn off flashlight:', error);
      throw error;
    }
  }

  /**
   * Toggle flashlight state
   */
  static async toggle(): Promise<boolean> {
    try {
      if (this.isFlashlightOn) {
        await this.turnOff();
      } else {
        await this.turnOn();
      }
      return this.isFlashlightOn;
    } catch (error) {
      console.warn('Failed to toggle flashlight:', error);
      throw error;
    }
  }

  /**
   * Flash for a specific duration
   */
  static async flash(duration: number = 200): Promise<void> {
    try {
      await this.turnOn();
      await this.delay(duration);
      await this.turnOff();
    } catch (error) {
      console.warn('Failed to flash:', error);
      // Make sure to turn off in case of error
      try {
        await this.turnOff();
      } catch (cleanupError) {
        console.warn('Failed to cleanup flashlight after error:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Execute a series of flash patterns
   */
  static async executeFlashPattern(patterns: FlashlightPattern[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        await this.flash(pattern.duration);
        if (pattern.delay) {
          await this.delay(pattern.delay);
        }
      }
    } catch (error) {
      console.warn('Failed to execute flash pattern:', error);
      throw error;
    }
  }

  /**
   * Flash multiple times with consistent timing
   */
  static async flashMultiple(
    count: number, 
    flashDuration: number = 200, 
    interval: number = 300
  ): Promise<void> {
    try {
      for (let i = 0; i < count; i++) {
        await this.flash(flashDuration);
        if (i < count - 1) { // Don't delay after the last flash
          await this.delay(interval);
        }
      }
    } catch (error) {
      console.warn('Failed to execute multiple flashes:', error);
      throw error;
    }
  }

  /**
   * Create visual separation pattern (longer flash)
   */
  static async separatorFlash(): Promise<void> {
    try {
      await this.flash(500); // Longer flash for separation
    } catch (error) {
      console.warn('Failed to execute separator flash:', error);
      throw error;
    }
  }

  /**
   * Emergency cleanup - force turn off flashlight
   */
  static async emergencyOff(): Promise<void> {
    try {
      if (this.hasPermission) {
        await Camera.setFlashModeAsync(Camera.Constants.FlashMode.off);
        this.isFlashlightOn = false;
        console.log('Emergency flashlight shutdown completed');
      }
    } catch (error) {
      console.warn('Emergency flashlight shutdown failed:', error);
    }
  }

  /**
   * Get current flashlight state
   */
  static getFlashlightState(): boolean {
    return this.isFlashlightOn;
  }

  /**
   * Get permission state
   */
  static getPermissionState(): boolean {
    return this.hasPermission;
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
