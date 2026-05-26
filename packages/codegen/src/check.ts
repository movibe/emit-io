import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { ParsedEvent } from './types.js'

export interface Snapshot {
  version: number
  events: Record<string, { properties: Record<string, { type: string }> }>
}

export interface DriftResult {
  removed: string[]
  propsRemoved: Array<{ event: string; property: string }>
  added: string[]
  propsAdded: Array<{ event: string; property: string }>
}

export function loadSnapshot(path: string): Snapshot | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function saveSnapshot(path: string, snapshot: Snapshot): void {
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8')
}

export function buildSnapshot(events: ParsedEvent[]): Snapshot {
  const eventsMap: Snapshot['events'] = {}
  for (const ev of events) {
    eventsMap[ev.name] = { properties: {} }
    for (const field of ev.fields) {
      eventsMap[ev.name].properties[field.name] = { type: field.type }
    }
  }
  return { version: 1, events: eventsMap }
}

export function diffSnapshots(current: Snapshot, prev: Snapshot): DriftResult {
  const result: DriftResult = { removed: [], propsRemoved: [], added: [], propsAdded: [] }

  for (const name of Object.keys(prev.events)) {
    if (!(name in current.events)) result.removed.push(name)
  }

  for (const name of Object.keys(current.events)) {
    if (!(name in prev.events)) result.added.push(name)
  }

  for (const name of Object.keys(prev.events)) {
    if (!(name in current.events)) continue
    const prevProps = prev.events[name].properties
    const currProps = current.events[name].properties
    for (const p of Object.keys(prevProps)) {
      if (!(p in currProps)) result.propsRemoved.push({ event: name, property: p })
    }
    for (const p of Object.keys(currProps)) {
      if (!(p in prevProps)) result.propsAdded.push({ event: name, property: p })
    }
  }

  return result
}
