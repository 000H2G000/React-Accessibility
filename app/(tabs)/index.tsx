
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HapticService } from '@/services/HapticService';
import { QCMAnswer, QCMPatternService } from '@/services/QCMPatternService';
import { QCMServerService, QCMFetchResponse, SessionInfo } from '@/services/QCMServerService';
import { QCMVibrationFlashService } from '@/services/QCMVibrationFlashService';
import { APIIntegrationService, ProcessingResult } from '@/services/APIIntegrationService';

// Polling interval constants (in milliseconds)
const POLLING_INTERVALS = {
  FIVE_MINUTES: 300000,  // 5 minutes
  THREE_MINUTES: 180000, // 3 minutes  
  ONE_MINUTE: 60000,     // 1 minute
  THIRTY_SECONDS: 30000, // 30 seconds (for testing)
};

// Helper function to format interval duration
const formatInterval = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
};

export default function HomeScreen() {
  // Basic state
  const [inputText, setInputText] = useState('');
  const [detectedAnswers, setDetectedAnswers] = useState<QCMAnswer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hapticAvailable, setHapticAvailable] = useState(false);
  
  // API Integration state
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  const [stopAfterProcessing, setStopAfterProcessing] = useState(true);
  const [apiInitialized, setApiInitialized] = useState(false);
  const [lastProcessingResult, setLastProcessingResult] = useState<ProcessingResult | null>(null);
  const [currentPollingInterval, setCurrentPollingInterval] = useState(POLLING_INTERVALS.THREE_MINUTES);
  
  // Server-related state
  const [serverUrl, setServerUrl] = useState('https://e374-34-147-38-236.ngrok-free.app');
  const [isPolling, setIsPolling] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([]);
  const [lastFetchedData, setLastFetchedData] = useState<QCMFetchResponse | null>(null);

  useEffect(() => {
    // Initialize device capabilities and API integration
    const initializeServices = async () => {
      // Check device capabilities
      const haptic = await HapticService.isHapticAvailable();
      setHapticAvailable(haptic);
      
      console.log('🎯 Haptic feedback available:', haptic);

      // Initialize API Integration Service
      try {
        await APIIntegrationService.initialize({
          autoProcess: autoProcessEnabled,
          processingSettings: {
            enableVibration: haptic,
            enableFlashlight: false, // Flashlight disabled
            flashlightSeparatorDuration: 500,
            delayBetweenAnswers: 1000,
            delayAfterSeparator: 300,
          },
          pollingInterval: currentPollingInterval,
          showNotifications: true,
          stopAfterProcessing: stopAfterProcessing,
        });

        // Set up event listeners
        APIIntegrationService.setEventListeners({
          onDataReceived: (data: QCMFetchResponse) => {
            console.log('📱 API: New QCM data received');
            setLastFetchedData(data);
            setInputText(data.formatted_text);
          },
          onProcessingComplete: (result: ProcessingResult) => {
            console.log('✅ API: Processing completed', result);
            setLastProcessingResult(result);
            setIsProcessing(false);
            
            // Update polling state if processing was successful
            if (result.success && result.processedAnswers.length > 0) {
              setIsPolling(false);
            }
            
            // Show completion notification
            if (result.success) {
              Alert.alert(
                '✅ Auto-Processing Complete!',
                `Processed ${result.totalAnswers} answers using: ${result.featuresUsed.join(', ')}\n\nPolling has been stopped.`,
                [{ text: 'OK', style: 'default' }]
              );
            } else {
              Alert.alert('⚠️ Processing Error', result.error || 'Unknown error occurred');
            }
          },
          onError: (error: string) => {
            console.error('❌ API Integration Error:', error);
            setIsProcessing(false);
            Alert.alert('❌ API Error', error);
          },
        });

        setApiInitialized(true);
        console.log('🚀 API Integration Service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize API Integration Service:', error);
        Alert.alert('Initialization Error', 'Failed to initialize API integration');
      }
    };
    
    initializeServices();
    
    return () => {
      // Cleanup API integration service
      APIIntegrationService.cleanup();
      setApiInitialized(false);
    };
  }, [autoProcessEnabled, stopAfterProcessing, currentPollingInterval]);

  useEffect(() => {
    // Real-time QCM detection as user types
    if (inputText.trim()) {
      const answers = QCMPatternService.extractQCMAnswers(inputText);
      setDetectedAnswers(answers);
    } else {
      setDetectedAnswers([]);
    }
  }, [inputText]);
  const handleProcessText = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter some text to process');
      return;
    }

    const answers = QCMPatternService.extractQCMAnswers(inputText);
    if (answers.length === 0) {
      Alert.alert('No QCM Found', 'No QCM answers detected in the text. Try formats like:\n• 1/c\n• 2. b\n• 3-a\n• Q4: d');
      return;
    }    if (!hapticAvailable) {
      Alert.alert('Features Unavailable', 'Haptic feedback is not available on this device');
      return;
    }

    setIsProcessing(true);
    try {
      // Use the combined service for vibration only (flashlight disabled)
      await QCMVibrationFlashService.processQCMWithFlashSeparation(answers, {
        enableVibration: hapticAvailable,
        enableFlashlight: false, // Flashlight disabled
        flashlightSeparatorDuration: 500,
        delayBetweenAnswers: 1000,
        delayAfterSeparator: 300,
      });
      
      const processedCount = answers.length;
      const features = [];
      if (hapticAvailable) features.push('vibration');
      
      Alert.alert(
        '✅ Processing Complete', 
        `Processed ${processedCount} QCM answers with ${features.join(' + ')}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process QCM answers');
      console.error('QCM processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestVibration = async (answer: string) => {
    if (!hapticAvailable) {
      Alert.alert('Haptic Unavailable', 'Haptic feedback is not available on this device');
      return;
    }

    try {
      await HapticService.testAnswerVibration(answer);
    } catch (error) {
      console.error('Test vibration error:', error);
    }
  };

  const handleTestAllVibrations = async () => {
    if (!hapticAvailable) {
      Alert.alert('Haptic Unavailable', 'Haptic feedback is not available on this device');
      return;
    }

    setIsProcessing(true);
    try {
      await HapticService.testAllAnswerVibrations();
    } catch (error) {
      console.error('Test all vibrations error:', error);
      Alert.alert('Error', 'Failed to test all vibrations');
    } finally {
      setIsProcessing(false);
    }
  };  const handleTestAllFeatures = async () => {
    if (!hapticAvailable) {
      Alert.alert('Features Unavailable', 'Haptic feedback is not available on this device');
      return;
    }

    setIsProcessing(true);
    try {
      // Test with vibration only (flashlight disabled)
      await QCMVibrationFlashService.processQCMWithFlashSeparation(
        [
          { questionNumber: 1, answer: 'a', rawText: '1/a' },
          { questionNumber: 2, answer: 'b', rawText: '2/b' },
          { questionNumber: 3, answer: 'c', rawText: '3/c' },
          { questionNumber: 4, answer: 'd', rawText: '4/d' }
        ],
        {
          enableVibration: hapticAvailable,
          enableFlashlight: false,
          flashlightSeparatorDuration: 500,
          delayBetweenAnswers: 1000,
          delayAfterSeparator: 300,
        }
      );
      Alert.alert('✨ Test Complete', 'All available features tested successfully!');
    } catch (error) {
      console.error('Test all features error:', error);
      Alert.alert('Error', 'Failed to test features');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearText = () => {
    setInputText('');
    setDetectedAnswers([]);
  };

  const getExampleText = () => {
    return "1/c\n2/b\n3/a\n4/d\n5/e";
  };

  // Server control functions
  const handleTestConnection = async () => {
    QCMServerService.updateServerUrl(serverUrl);
    const connected = await QCMServerService.testConnection();
    setServerConnected(connected);
    
    if (connected) {
      Alert.alert('✅ Connected', 'Successfully connected to server!');
      await refreshSessions();
    } else {
      Alert.alert('❌ Connection Failed', 'Could not connect to server. Please check the URL.');
    }
  };

  const refreshSessions = async () => {
    const sessionsData = await QCMServerService.listSessions();
    if (sessionsData) {
      setAvailableSessions(sessionsData.sessions);
    }
  };  const handleStartPolling = () => {
    if (!serverConnected) {
      Alert.alert('Error', 'Please test connection first');
      return;
    }

    QCMServerService.startSimplePolling(currentPollingInterval);
    setIsPolling(true);
    Alert.alert('🔄 Polling Started', `Listening for new QCM data from server every ${formatInterval(currentPollingInterval)}`);
  };

  const handleStopPolling = () => {
    QCMServerService.stopPolling();
    setIsPolling(false);
    Alert.alert('⏹️ Polling Stopped', 'No longer listening for new QCM data');
  };
  const handleFetchSpecific = async () => {
    const data = await QCMServerService.fetchLatestQCM();
    if (data) {
      setLastFetchedData(data);
      setInputText(data.formatted_text);
      Alert.alert('📝 QCM Fetched', `Loaded ${data.total_answers} answers from session: ${data.session_id}`);
    } else {
      Alert.alert('📭 No Data', 'No QCM data found on server');
    }
  };
  const handleSelectSession = (selectedSessionId: string) => {
    Alert.alert(
      'Session Selected',
      `Selected session: ${selectedSessionId}\n\nWhat would you like to do?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fetch QCM', onPress: () => handleFetchSpecific() },
        { text: 'Start Polling', onPress: () => handleStartPolling() }
      ]
    );
  };

  // New API Integration functions
  const handleStartAutoProcessing = async () => {
    if (!apiInitialized) {
      Alert.alert('Not Ready', 'API Integration service is not initialized yet');
      return;
    }

    try {
      setIsPolling(true);
      APIIntegrationService.startAutomaticProcessing(serverUrl);      Alert.alert(
        '🚀 Auto-Processing Started',
        `The app will now automatically check for QCM data every ${formatInterval(currentPollingInterval)} and process it when found.\n\nFeatures enabled:\n` +
        `• Haptic vibration: ${hapticAvailable ? '✅' : '❌'}\n` +
        `• Flashlight separation: ❌ (Disabled)\n` +
        `• Check interval: ${formatInterval(currentPollingInterval)}`
      );
    } catch (error) {
      setIsPolling(false);
      console.error('Error starting auto-processing:', error);
      Alert.alert('Error', 'Failed to start automatic processing');
    }
  };

  const handleStopAutoProcessing = () => {
    APIIntegrationService.stopAutomaticProcessing();
    setIsPolling(false);
    Alert.alert('⏹️ Auto-Processing Stopped', 'Automatic QCM processing has been disabled');
  };

  const handleCheckForNewQCM = async () => {
    if (!apiInitialized) {
      Alert.alert('Not Ready', 'API Integration service is not initialized yet');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await APIIntegrationService.checkAndProcessNewQCM();
      
      if (!result) {
        Alert.alert('📭 No Data', 'No new QCM data available on the server');
      } else if (result.success) {
        Alert.alert(
          '✅ QCM Processed',
          `Successfully processed ${result.totalAnswers} answers using: ${result.featuresUsed.join(', ')}`
        );
      } else {
        Alert.alert('❌ Processing Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error checking for new QCM:', error);
      Alert.alert('Error', 'Failed to check for new QCM data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAutoProcess = () => {
    const newValue = !autoProcessEnabled;
    setAutoProcessEnabled(newValue);
    
    if (apiInitialized) {
      APIIntegrationService.updateSettings({ autoProcess: newValue });
    }
    
    Alert.alert(
      'Auto-Processing ' + (newValue ? 'Enabled' : 'Disabled'),
      newValue 
        ? 'QCM data will be automatically processed when received'
        : 'QCM data will only be loaded into the input field'
    );
  };

  const handleToggleStopAfterProcessing = () => {
    const newValue = !stopAfterProcessing;
    setStopAfterProcessing(newValue);
    
    if (apiInitialized) {
      APIIntegrationService.updateSettings({ stopAfterProcessing: newValue });
    }
    
    Alert.alert(
      'Stop After Processing ' + (newValue ? 'Enabled' : 'Disabled'),
      newValue 
        ? 'Polling will stop automatically after successfully processing QCM data'
        : 'Polling will continue running even after processing QCM data'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>QCM Vibration</ThemedText>
          <ThemedText style={styles.subtitle}>
            Convert QCM answers to haptic feedback
          </ThemedText>
          {!hapticAvailable && (
            <ThemedText style={styles.warning}>
              ⚠️ Haptic feedback not available on this device
            </ThemedText>
          )}
        </ThemedView>

        {/* Input Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Enter QCM Text
          </ThemedText>
          <ThemedText style={styles.helpText}>
            Supported formats: 1/c, 2. b, 3-a, Q4: d
          </ThemedText>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste or type QCM answers here..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={6}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setInputText(getExampleText())}
            >
              <ThemedText style={styles.buttonText}>Load Example</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.clearButton]}
              onPress={handleClearText}
            >
              <ThemedText style={styles.buttonText}>Clear</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>        {/* Server Controls Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🌐 Server Connection
          </ThemedText>
          
          <ThemedText style={styles.helpText}>
            Connect to your server to automatically receive QCM data:
          </ThemedText>
          <TextInput
            style={styles.urlInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="Enter your ngrok server URL"
            placeholderTextColor="#666"
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, serverConnected && styles.connectedButton]}
              onPress={handleTestConnection}
            >
              <ThemedText style={styles.buttonText}>
                {serverConnected ? '✅ Connected' : '🔗 Test Connection'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.refreshButton]}
              onPress={refreshSessions}
              disabled={!serverConnected}
            >
              <ThemedText style={styles.buttonText}>🔄 Refresh Sessions</ThemedText>
            </TouchableOpacity>
          </View>          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[
                styles.button, 
                isPolling ? styles.pollingButton : styles.startPollingButton,
                !serverConnected && styles.disabledButton
              ]}
              onPress={isPolling ? handleStopPolling : handleStartPolling}
              disabled={!serverConnected}
            >
              <ThemedText style={styles.buttonText}>
                {isPolling ? '⏹️ Stop Polling' : '▶️ Start Polling'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.fetchButton, !serverConnected && styles.disabledButton]}
              onPress={handleFetchSpecific}
              disabled={!serverConnected}
            >
              <ThemedText style={styles.buttonText}>📥 Fetch Latest</ThemedText>
            </TouchableOpacity>
          </View>          {isPolling && (
            <ThemedText style={styles.pollingStatus}>
              🔄 Listening for new QCM data from server (checking every {formatInterval(currentPollingInterval)})
            </ThemedText>
          )}
        </ThemedView>

        {/* Available Sessions */}
        {availableSessions.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              📋 Available Sessions ({availableSessions.length})
            </ThemedText>
            <View style={styles.sessionsContainer}>
              {availableSessions.map((session, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sessionItem}
                  onPress={() => handleSelectSession(session.session_id)}
                >
                  <ThemedText style={styles.sessionId}>
                    📝 {session.session_id}
                  </ThemedText>
                  <ThemedText style={styles.sessionInfo}>
                    {session.total_answers} answers • {new Date(session.submitted_at).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.sessionPreview}>
                    {session.preview}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Last Fetched Data */}
        {lastFetchedData && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              📊 Last Received Data
            </ThemedText>
            <View style={styles.dataContainer}>
              <ThemedText style={styles.dataText}>
                <ThemedText style={styles.bold}>Session:</ThemedText> {lastFetchedData.session_id}
              </ThemedText>
              <ThemedText style={styles.dataText}>
                <ThemedText style={styles.bold}>Questions:</ThemedText> {lastFetchedData.total_answers}
              </ThemedText>
              <ThemedText style={styles.dataText}>
                <ThemedText style={styles.bold}>Received:</ThemedText> {new Date(lastFetchedData.submitted_at).toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.formattedData}>
                {lastFetchedData.formatted_text}
              </ThemedText>
            </View>
          </ThemedView>
        )}

        {/* Detection Results */}
        {detectedAnswers.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Detected Answers ({detectedAnswers.length})
            </ThemedText>
            <View style={styles.answersContainer}>
              {detectedAnswers.map((answer, index) => (
                <View key={index} style={styles.answerItem}>
                  <ThemedText style={styles.answerText}>
                    Q{answer.questionNumber}: {answer.answer.toUpperCase()}
                  </ThemedText>
                  <ThemedText style={styles.rawText}>
                    "{answer.rawText}"
                  </ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Vibration Controls */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Vibration Controls
          </ThemedText>
          
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              (!hapticAvailable || detectedAnswers.length === 0 || isProcessing) && styles.disabledButton
            ]}
            onPress={handleProcessText}
            disabled={!hapticAvailable || detectedAnswers.length === 0 || isProcessing}
          >
            <ThemedText style={styles.primaryButtonText}>
              {isProcessing ? 'Processing...' : `Vibrate All (${detectedAnswers.length})`}
            </ThemedText>
          </TouchableOpacity>          <ThemedText style={styles.helpText}>
            Test individual answer vibrations:
          </ThemedText>
          
          <View style={styles.testButtonsContainer}>
            {['a', 'b', 'c', 'd', 'e'].map((answer) => (
              <TouchableOpacity
                key={answer}
                style={[styles.testButton, !hapticAvailable && styles.disabledButton]}
                onPress={() => handleTestVibration(answer)}
                disabled={!hapticAvailable}
              >
                <ThemedText style={styles.testButtonText}>
                  {answer.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.testAllButton,
              (!hapticAvailable || isProcessing) && styles.disabledButton
            ]}
            onPress={handleTestAllVibrations}
            disabled={!hapticAvailable || isProcessing}
          >
            <ThemedText style={styles.testAllButtonText}>
              {isProcessing ? 'Testing All Letters...' : '🔄 TEST ALL LETTERS (A→E) with 2.5s gaps'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.helpText}>
            Test all answer vibrations with 2.5s margins:
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.testAllButton, !hapticAvailable && styles.disabledButton]}
            onPress={handleTestAllVibrations}
            disabled={!hapticAvailable}
          >
            <ThemedText style={styles.testAllButtonText}>
              🔄 TEST ALL
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.helpText}>
            Test separator beep:
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.separatorButton, !hapticAvailable && styles.disabledButton]}
            onPress={() => HapticService.vibrateSeparator()}
            disabled={!hapticAvailable}
          >
            <ThemedText style={styles.separatorText}>
              📢 BEEP SEPARATOR (1.5s)
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.helpText}>
            Maximum vibration tests:
          </ThemedText>
          
          <View style={styles.maxVibrationContainer}>
            <TouchableOpacity
              style={[styles.maxVibrationButton, !hapticAvailable && styles.disabledButton]}
              onPress={() => HapticService.testMaximumVibration()}
              disabled={!hapticAvailable}
            >
              <ThemedText style={styles.maxVibrationText}>
                🔥 MAX POWER
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.emergencyButton, !hapticAvailable && styles.disabledButton]}
              onPress={() => HapticService.emergencyVibration()}
              disabled={!hapticAvailable}
            >
              <ThemedText style={styles.emergencyText}>
                ⚡ EMERGENCY
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>        {/* Instructions */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            How it works
          </ThemedText>          <ThemedText style={styles.instructionText}>            • <ThemedText style={styles.bold}>A</ThemedText>: 1 long MAX POWER pulse (1000ms){'\n'}
            • <ThemedText style={styles.bold}>B</ThemedText>: 2 long MAX POWER pulses{'\n'}
            • <ThemedText style={styles.bold}>C</ThemedText>: 3 long MAX POWER pulses{'\n'}
            • <ThemedText style={styles.bold}>D</ThemedText>: 4 long MAX POWER pulses{'\n'}
            • <ThemedText style={styles.bold}>E</ThemedText>: 5 long MAX POWER pulses{'\n'}
            • <ThemedText style={styles.bold}>Question number</ThemedText>: Long MAX POWER pulse + number pulses{'\n'}{'\n'}
            🔄 <ThemedText style={styles.bold}>TEST ALL LETTERS</ThemedText>: Tests A→B→C→D→E sequence with 2.5s silence between each letter{'\n'}
            📢 <ThemedText style={styles.bold}>SEPARATOR BEEP</ThemedText>: 1.5s long vibration between each QCM response{'\n'}
            🔥 <ThemedText style={styles.bold}>MAX POWER</ThemedText>: Tests phone's maximum vibration capability{'\n'}
            ⚡ <ThemedText style={styles.bold}>EMERGENCY</ThemedText>: Ultra-strong attention-getting pattern
          </ThemedText>
        </ThemedView>

        {/* API Integration Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🤖 API Integration
          </ThemedText>
          
          <ThemedText style={styles.helpText}>
            Automatic QCM processing from server data
          </ThemedText>          <View style={styles.apiStatusContainer}>
            <ThemedText style={[styles.apiStatusText, apiInitialized ? styles.apiStatusReady : styles.apiStatusNotReady]}>
              {apiInitialized ? '✅ API Service Ready' : '⏳ Initializing...'}
            </ThemedText>
            <ThemedText style={[styles.apiStatusText, autoProcessEnabled ? styles.apiStatusEnabled : styles.apiStatusDisabled]}>
              Auto-Process: {autoProcessEnabled ? 'ON' : 'OFF'}
            </ThemedText>
            <ThemedText style={[styles.apiStatusText, stopAfterProcessing ? styles.apiStatusEnabled : styles.apiStatusDisabled]}>
              Stop After Processing: {stopAfterProcessing ? 'ON' : 'OFF'}
            </ThemedText>
          </View>          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, autoProcessEnabled ? styles.apiDisableButton : styles.apiEnableButton]}
              onPress={handleToggleAutoProcess}
              disabled={!apiInitialized}
            >
              <ThemedText style={styles.buttonText}>
                {autoProcessEnabled ? '🔴 Disable Auto' : '🟢 Enable Auto'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, stopAfterProcessing ? styles.apiDisableButton : styles.apiEnableButton]}
              onPress={handleToggleStopAfterProcessing}
              disabled={!apiInitialized}
            >
              <ThemedText style={styles.buttonText}>
                {stopAfterProcessing ? '🔴 Continuous' : '🟢 Stop After'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.apiCheckButton]}
              onPress={handleCheckForNewQCM}
              disabled={!apiInitialized || isProcessing}
            >
              <ThemedText style={styles.buttonText}>
                {isProcessing ? '⏳ Checking...' : '🔍 Check Now'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[
                styles.button, 
                isPolling ? styles.apiStopButton : styles.apiStartButton,
                !apiInitialized && styles.disabledButton
              ]}
              onPress={isPolling ? handleStopAutoProcessing : handleStartAutoProcessing}
              disabled={!apiInitialized}
            >
              <ThemedText style={styles.buttonText}>
                {isPolling ? '⏹️ Stop Auto-Processing' : '▶️ Start Auto-Processing'}
              </ThemedText>
            </TouchableOpacity>
          </View>          {lastProcessingResult && (
            <View style={styles.apiResultContainer}>
              <ThemedText style={[styles.resultText, lastProcessingResult.success ? styles.successText : styles.errorText]}>
                {lastProcessingResult.success 
                  ? `✅ Last processed: ${lastProcessingResult.totalAnswers} answers with ${lastProcessingResult.featuresUsed.join(', ')}`
                  : `❌ Last error: ${lastProcessingResult.error}`
                }
              </ThemedText>
            </View>
          )}          {isPolling && (
            <ThemedText style={styles.pollingStatus}>
              🔄 Auto-processing active (checking every {formatInterval(currentPollingInterval)} for new QCM data)
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  warning: {
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  connectedButton: {
    backgroundColor: '#4CAF50',
  },
  refreshButton: {
    backgroundColor: '#3F51B5',
  },
  fetchButton: {
    backgroundColor: '#9C27B0',
  },
  pollingButton: {
    backgroundColor: '#FF9800',
  },
  startPollingButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  answersContainer: {
    gap: 8,
  },
  answerItem: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  answerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rawText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  testAllButton: {
    backgroundColor: '#3F51B5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#7986CB',
  },
  testAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  separatorButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  separatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  maxVibrationContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  maxVibrationButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8A65',
  },
  maxVibrationText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFCDD2',
  },
  emergencyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  pollingStatus: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  sessionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  sessionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sessionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sessionInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sessionPreview: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  dataText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  formattedData: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusReady: {
    color: '#4CAF50',
  },
  statusNotReady: {
    color: '#FF9800',
  },
  statusEnabled: {
    color: '#4CAF50',
  },
  statusDisabled: {
    color: '#FF5722',
  },
  enableButton: {
    backgroundColor: '#4CAF50',
  },
  disableButton: {
    backgroundColor: '#FF5722',
  },
  checkButton: {
    backgroundColor: '#3F51B5',
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  stopButton: {
    backgroundColor: '#FF9800',
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  borderWidth: 1,
    borderColor: '#2196F3',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#4CAF50',
  },  errorText: {
    color: '#F44336',
  },
  // API Integration styles
  apiStatusContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  apiStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  apiStatusReady: {
    color: '#4CAF50',
  },
  apiStatusNotReady: {
    color: '#FF9800',
  },
  apiStatusEnabled: {
    color: '#2196F3',
  },
  apiStatusDisabled: {
    color: '#757575',
  },
  apiEnableButton: {
    backgroundColor: '#4CAF50',
  },
  apiDisableButton: {
    backgroundColor: '#FF5722',
  },
  apiCheckButton: {
    backgroundColor: '#2196F3',
  },
  apiStartButton: {
    backgroundColor: '#4CAF50',
  },
  apiStopButton: {
    backgroundColor: '#F44336',
  },
  apiResultContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
});
