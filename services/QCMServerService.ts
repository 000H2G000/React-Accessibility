export interface QCMResponse {
  question_number: number;
  answer: string;
  timestamp?: string;
}

export interface QCMSubmission {
  session_id: string;
  responses: QCMResponse[];
  submitted_at: string;
}

export interface QCMFetchResponse {
  session_id: string;
  responses: QCMResponse[];
  submitted_at: string;
  total_answers: number;
  formatted_text: string;
}

export interface SessionInfo {
  session_id: string;
  total_answers: number;
  submitted_at: string;
  preview: string;
}

export interface SessionsResponse {
  sessions: SessionInfo[];
  total_sessions: number;
}

export class QCMServerService {
  private static baseUrl = 'https://62b3-34-147-38-236.ngrok-free.app';
  private static pollingInterval: NodeJS.Timeout | null = null;
  private static listeners: ((data: QCMFetchResponse) => void)[] = [];

  /**
   * Update the server URL if it changes
   */
  static updateServerUrl(newUrl: string) {
    this.baseUrl = newUrl.replace(/\/$/, ''); // Remove trailing slash
    console.log('🔄 Server URL updated to:', this.baseUrl);
  }

  /**
   * Test connection to the server
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Server connection successful:', data);
        return true;
      } else {
        console.error('❌ Server connection failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Server connection error:', error);
      return false;
    }
  }

  /**
   * Fetch QCM responses for a specific session
   */
  static async fetchQCMResponses(sessionId: string): Promise<QCMFetchResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/fetch-qcm/${sessionId}`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (response.ok) {
        const data: QCMFetchResponse = await response.json();
        console.log('📝 QCM data fetched:', data);
        return data;
      } else if (response.status === 404) {
        console.log('📭 No QCM data found for session:', sessionId);
        return null;
      } else {
        console.error('❌ Error fetching QCM:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Network error fetching QCM:', error);
      return null;
    }
  }

  /**
   * List all available sessions
   */
  static async listSessions(): Promise<SessionsResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (response.ok) {
        const data: SessionsResponse = await response.json();
        console.log('📋 Sessions fetched:', data);
        return data;
      } else {
        console.error('❌ Error fetching sessions:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Network error fetching sessions:', error);
      return null;
    }
  }

  /**
   * Start polling for new QCM data
   */
  static startPolling(sessionId: string, intervalMs: number = 3000) {
    this.stopPolling();
    
    console.log(`🔄 Starting polling for session: ${sessionId} every ${intervalMs}ms`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.fetchQCMResponses(sessionId);
        if (data) {
          // Notify all listeners
          this.listeners.forEach(listener => listener(data));
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  static stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Polling stopped');
    }
  }

  /**
   * Add listener for QCM data updates
   */
  static addListener(callback: (data: QCMFetchResponse) => void) {
    this.listeners.push(callback);
    console.log('👂 Listener added, total listeners:', this.listeners.length);
  }

  /**
   * Remove listener
   */
  static removeListener(callback: (data: QCMFetchResponse) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log('🔇 Listener removed, total listeners:', this.listeners.length);
    }
  }

  /**
   * Clear all listeners
   */
  static clearListeners() {
    this.listeners = [];
    console.log('🔇 All listeners cleared');
  }

  /**
   * Remove all listeners (alias for clearListeners)
   */
  static removeAllListeners() {
    this.clearListeners();
  }

  /**
   * Check if currently polling
   */
  static get isPolling(): boolean {
    return this.pollingInterval !== null;
  }

  /**
   * Delete a session from the server
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (response.ok) {
        console.log('🗑️ Session deleted:', sessionId);
        return true;
      } else {
        console.error('❌ Error deleting session:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error deleting session:', error);
      return false;
    }
  }

  /**
   * Get the current server URL
   */
  static getServerUrl(): string {
    return this.baseUrl;
  }

  /**
   * Fetch the latest QCM without needing a session ID
   */
  static async fetchLatestQCM(): Promise<QCMFetchResponse | null> {
    try {
      console.log('📥 Fetching latest QCM from server...');
      const response = await fetch(`${this.baseUrl}/fetch-latest`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: QCMFetchResponse = await response.json();
        console.log('✅ Latest QCM fetched successfully:', data);
        return data;
      } else if (response.status === 404) {
        console.log('📭 No QCM data available yet');
        return null;
      } else {
        const errorData = await response.json();
        console.error('❌ Error fetching latest QCM:', errorData);
        return null;
      }
    } catch (error) {
      console.error('❌ Network error fetching latest QCM:', error);
      return null;
    }
  }

  /**
   * Start polling for the latest QCM (no session ID needed)
   */
  static startSimplePolling(intervalMs: number = 3000) {
    console.log('🔄 Starting simple polling for latest QCM...');
    
    // Stop any existing polling
    this.stopPolling();

    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.fetchLatestQCM();
        if (data) {
          // Notify all listeners
          this.listeners.forEach(listener => {
            try {
              listener(data);
            } catch (error) {
              console.error('❌ Error in QCM data listener:', error);
            }
          });
        }
      } catch (error) {
        console.error('❌ Error during polling:', error);
      }
    }, intervalMs);
  }

  /**
   * Check if there's new QCM data available (one-time check)
   */
  static async checkForNewQCM(): Promise<QCMFetchResponse | null> {
    try {
      return await this.fetchLatestQCM();
    } catch (error) {
      console.error('❌ Error checking for new QCM:', error);
      return null;
    }
  }
}
