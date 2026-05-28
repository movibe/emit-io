import { View, Text, Button, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import {
  useScreenTracking,
  useEventTracking,
  useTrackEvent,
  useCaptureError,
} from 'emit-io-react-native'

export default function ProfileScreen() {
  useScreenTracking('Profile', { source: 'home-cta' })
  useEventTracking('profile-viewed', {
    properties: { variant: 'default' },
    once: true,
  })

  const trackEvent = useTrackEvent()
  const captureError = useCaptureError()

  const triggerError = () => {
    try {
      throw new Error('Demo error from Profile screen')
    } catch (err) {
      captureError('Profile', 'demo_error', false, err as Error, {
        retry: false,
      })
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>
        Screen + event tracking fired on mount.
      </Text>

      <View style={styles.button}>
        <Button
          title="Track Custom Event"
          onPress={() =>
            trackEvent('profile-action', { action: 'edit-avatar' })
          }
        />
      </View>

      <View style={styles.button}>
        <Button
          title="Capture Demo Error"
          color="#dc2626"
          onPress={triggerError}
        />
      </View>

      <View style={styles.button}>
        <Button title="Back" onPress={() => router.back()} />
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
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 12,
  },
})
