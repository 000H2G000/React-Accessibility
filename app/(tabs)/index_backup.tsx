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
        </ThemedView>

        {/* Instructions */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            How it works
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            • <ThemedText style={styles.bold}>A</ThemedText>: 1 short pulse{'\n'}
            • <ThemedText style={styles.bold}>B</ThemedText>: 2 short pulses{'\n'}
            • <ThemedText style={styles.bold}>C</ThemedText>: 3 short pulses{'\n'}
            • <ThemedText style={styles.bold}>D</ThemedText>: 4 short pulses{'\n'}
            • <ThemedText style={styles.bold}>E</ThemedText>: 5 short pulses{'\n'}
            • <ThemedText style={styles.bold}>Question number</ThemedText>: Long pulse + number pulses
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
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
