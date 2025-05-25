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

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [detectedAnswers, setDetectedAnswers] = useState<QCMAnswer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hapticAvailable, setHapticAvailable] = useState(false);

  useEffect(() => {
    // Check if haptic feedback is available
    HapticService.isHapticAvailable().then(setHapticAvailable);
  }, []);

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

    if (!hapticAvailable) {
      Alert.alert('Haptic Unavailable', 'Haptic feedback is not available on this device');
      return;
    }

    setIsProcessing(true);
    try {
      await HapticService.vibrateForQCMAnswers(answers);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate vibrations');
      console.error('Vibration error:', error);
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

  const handleClearText = () => {
    setInputText('');
    setDetectedAnswers([]);
  };

  const getExampleText = () => {
    return "1/c\n2/b\n3/a\n4/d\n5/e";
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
        </ThemedView>

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
          </TouchableOpacity>

          <ThemedText style={styles.helpText}>
            Test individual answer vibrations:
          </ThemedText>          <View style={styles.testButtonsContainer}>
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
  disabledButton: {
    backgroundColor: '#ccc',
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
});
