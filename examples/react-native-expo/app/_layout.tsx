import { Stack } from 'expo-router'
import { View, Text, Button } from 'react-native'
import { AnalyticsProvider } from 'emit-io-react-native'
import { emit } from '../src/logger'
import { ErrorBoundary } from '../src/ErrorBoundary'

export default function RootLayout() {
  return (
    <AnalyticsProvider client={emit} trackAppState>
      <ErrorBoundary
        fallback={(err, reset) => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fef2f2' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#991b1b', marginBottom: 12 }}>Something went wrong</Text>
            <Text style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 24, textAlign: 'center' }}>{err.message}</Text>
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
      </ErrorBoundary>
    </AnalyticsProvider>
  )
}
