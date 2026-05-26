import { Stack } from 'expo-router'
import { View, Text, Button, StyleSheet } from 'react-native'
import {
  AnalyticsProvider,
  AnalyticsErrorBoundary,
} from '@emit-io/react-native'
import { logger } from '../src/logger'

export default function RootLayout() {
  return (
    <AnalyticsProvider client={logger} trackAppState>
      <AnalyticsErrorBoundary
        fallback={(err, reset) => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{err.message}</Text>
            <Button title="Retry" onPress={reset} />
          </View>
        )}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1f2937' },
            headerTintColor: '#fff',
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Home' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        </Stack>
      </AnalyticsErrorBoundary>
    </AnalyticsProvider>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fef2f2',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 24,
    textAlign: 'center',
  },
})
