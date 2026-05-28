import React from 'react'
import { Button, View } from 'react-native'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { EmitIoStrategy, type AnalyticsProvider } from 'emit-io-core'
import {
  AnalyticsProvider as AnalyticsContext,
  useAnalytics,
  useScreenTracking,
  useNavigationAnalytics,
} from 'emit-io-react-native'

const provider: AnalyticsProvider = {
  name: 'console',
  enabled: true,
  event(name, properties) { console.log('[analytics]', name, properties) },
  screen(name) { console.log('[screen]', name) },
}

const emit = new EmitIoStrategy({ providers: [provider] })

// Root component — useNavigationAnalytics auto-tracks screen changes
export function App() {
  const navRef = useNavigationContainerRef()
  useNavigationAnalytics(navRef, emit)

  return (
    <AnalyticsContext client={emit} trackAppState>
      <NavigationContainer ref={navRef}>
        <RootStack />
      </NavigationContainer>
    </AnalyticsContext>
  )
}

// useScreenTracking fires on mount with the screen name
function HomeScreen() {
  useScreenTracking('Home')
  const { event } = useAnalytics()

  return (
    <View>
      <Button title="Buy now" onPress={() => event('cta-click', { screen: 'Home' })} />
    </View>
  )
}

function RootStack() {
  return <HomeScreen />
}
