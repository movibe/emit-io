import React from 'react'
import { Button, View } from 'react-native'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { LoggerStrategy, type AnalyticsProvider } from '@emit/core'
import {
  AnalyticsProvider as AnalyticsContext,
  useAnalytics,
  useScreenTracking,
  useNavigationAnalytics,
} from '@emit/react-native'

const provider: AnalyticsProvider = {
  name: 'console',
  enabled: true,
  event(name, properties) { console.log('[analytics]', name, properties) },
  screen(name) { console.log('[screen]', name) },
}

const logger = new LoggerStrategy({ providers: [provider] })

// Root component — useNavigationAnalytics auto-tracks screen changes
export function App() {
  const navRef = useNavigationContainerRef()
  useNavigationAnalytics(navRef, logger)

  return (
    <AnalyticsContext client={logger} trackAppState>
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
