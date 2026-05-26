import { createContext } from 'react'
import type { AnalyticsContextValue } from './types.js'

export const AnalyticsReactContext = createContext<AnalyticsContextValue | undefined>(undefined)
