import { View, Text, Button, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import {
  useScreenTracking,
  useAnalytics,
  useTrackEvent,
} from '@movibe/logger-react-native'

export default function HomeScreen() {
  useScreenTracking('Home')

  const { identify } = useAnalytics()
  const trackEvent = useTrackEvent()

  const handleCtaPress = () => {
    trackEvent('cta-click', { source: 'home-hero', timestamp: Date.now() })
    identify({ id: 'user-123', plan: 'free' })
    router.push('/profile')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>@movibe/logger-react-native</Text>
      <Text style={styles.subtitle}>
        Open the dev console to see analytics events.
      </Text>
      <View style={styles.actions}>
        <Button title="Identify & Go to Profile" onPress={handleCtaPress} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 300,
  },
})
