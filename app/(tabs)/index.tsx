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
import { FlashlightService } from '@/services/FlashlightService';
import { QCMVibrationFlashService } from '@/services/QCMVibrationFlashService';

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');  const [detectedAnswers, setDetectedAnswers] = useState<QCMAnswer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hapticAvailable, setHapticAvailable] = useState(false);
  const [flashlightAvailable, setFlashlightAvailable] = useState(false);
  const [enableFlashlight, setEnableFlashlight] = useState(true);
    // Server-related state
  const [serverUrl, setServerUrl] = useState('https://e374-34-147-38-236.ngrok-free.app');
  const [isPolling, setIsPolling] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([]);
  const [lastFetchedData, setLastFetchedData] = useState<QCMFetchResponse | null>(null);
  useEffect(() => {
    // Check if haptic feedback and flashlight are available
    const checkAvailability = async () => {
      const haptic = await HapticService.isHapticAvailable();
      const flashlight = await FlashlightService.isFlashlightAvailable();
      setHapticAvailable(haptic);
      setFlashlightAvailable(flashlight);
      
      if (flashlight) {
        console.log('✨ Flashlight available for visual separation');
      } else {
        console.log('⚠️ Flashlight not available on this device');
      }
    };
    
    checkAvailability();
    
    // Set up QCM data listener
    const handleQCMData = (data: QCMFetchResponse) => {
      console.log('📱 Received QCM data from server:', data);
      setLastFetchedData(data);
      setInputText(data.formatted_text);
      
      // Show notification
      Alert.alert(
        '📝 New QCM Received!',
        `Session: ${data.session_id}\nQuestions: ${data.total_answers}\n\nData loaded into input field.`,
        [
          { text: 'View Only', style: 'cancel' },
          { 
            text: 'Process & Vibrate', 
            onPress: () => {
              if (hapticAvailable) {
                handleProcessText();
              }
            }
          }
        ]
      );
    };
    
    QCMServerService.addListener(handleQCMData);
    
    return () => {
      QCMServerService.removeListener(handleQCMData);
      QCMServerService.stopPolling();
    };
  }, [hapticAvailable]);

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
    }

    if (!hapticAvailable && !flashlightAvailable) {
      Alert.alert('Features Unavailable', 'Neither haptic feedback nor flashlight is available on this device');
      return;
    }

    setIsProcessing(true);
    try {
      // Use the combined service for vibration + flash separation
      await QCMVibrationFlashService.processQCMWithFlashSeparation(answers, {
        enableVibration: hapticAvailable,
        enableFlashlight: flashlightAvailable && enableFlashlight,
        flashlightSeparatorDuration: 500,
        delayBetweenAnswers: 1000,
        delayAfterSeparator: 300,
      });
      
      const processedCount = answers.length;
      const features = [];
      if (hapticAvailable) features.push('vibration');
      if (flashlightAvailable && enableFlashlight) features.push('flashlight separation');
      
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
  };

  const handleTestFlashlight = async () => {
    if (!flashlightAvailable) {
      Alert.alert('Flashlight Unavailable', 'Flashlight is not available on this device');
      return;
    }

    try {
      await QCMVibrationFlashService.testFlashlight();
      Alert.alert('✨ Flashlight Test', 'Flashlight test completed!');
    } catch (error) {
      console.error('Flashlight test error:', error);
      Alert.alert('Error', 'Failed to test flashlight');
    }
  };

  const handleTestCombined = async () => {
    if (!hapticAvailable && !flashlightAvailable) {
      Alert.alert('Features Unavailable', 'Neither haptic feedback nor flashlight is available');
      return;
    }

    setIsProcessing(true);
    try {
      await QCMVibrationFlashService.testCombined();
      Alert.alert('✨ Combined Test', 'Combined vibration + flash test completed!');
    } catch (error) {
      console.error('Combined test error:', error);
      Alert.alert('Error', 'Failed to test combined functionality');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestCustomPattern = async () => {
    if (!hapticAvailable && !flashlightAvailable) {
      Alert.alert('Features Unavailable', 'Neither haptic feedback nor flashlight is available');
      return;
    }

    setIsProcessing(true);
    try {
      // Example: "1-A flash B, 2-A, 3-C flash B flash A"
      const pattern = [
        { answer: 'a', flashAfter: true },  // 1-A [flash]
        { answer: 'b', flashAfter: false }, // B
        { answer: 'a', flashAfter: false }, // 2-A
        { answer: 'c', flashAfter: true },  // 3-C [flash]
        { answer: 'b', flashAfter: true },  // B [flash]
        { answer: 'a', flashAfter: false }  // A
      ];

      await QCMVibrationFlashService.executeCustomPattern(pattern, {
        enableVibration: hapticAvailable,
        enableFlashlight: flashlightAvailable && enableFlashlight,
      });

      Alert.alert('✨ Custom Pattern', 'Custom pattern "A-flash-B, A, C-flash-B-flash-A" completed!');
    } catch (error) {
      console.error('Custom pattern test error:', error);
      Alert.alert('Error', 'Failed to test custom pattern');
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
  };
  const handleStartPolling = () => {
    if (!serverConnected) {
      Alert.alert('Error', 'Please test connection first');
      return;
    }

    QCMServerService.startSimplePolling(3000);
    setIsPolling(true);
    Alert.alert('🔄 Polling Started', 'Listening for new QCM data from server');
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
          </View>

          {isPolling && (
            <ThemedText style={styles.pollingStatus}>
              🔄 Listening for new QCM data from server
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
});
