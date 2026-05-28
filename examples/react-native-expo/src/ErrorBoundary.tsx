import React from 'react'
import { View, Text, Button, StyleSheet } from 'react-native'

type Props = {
  children: React.ReactNode
  fallback?: (err: Error, reset: () => void) => React.ReactNode
}
type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Button title="Retry" onPress={this.reset} />
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fef2f2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 24,
    textAlign: 'center',
  },
})
