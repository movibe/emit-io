import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Snapshot } from '../check.js'
import { buildSnapshot, diffSnapshots, loadSnapshot, saveSnapshot } from '../check.js'
import type { ParsedEvent } from '../types.js'

function makeEvent(name: string, fields: Array<{ name: string; type: string }>): ParsedEvent {
  return {
    name,
    fields: fields.map((f) => ({ name: f.name, type: f.type, optional: false })),
  }
}

describe('buildSnapshot', () => {
  test('builds correct structure for events with fields', () => {
    const events = [makeEvent('user-login', [{ name: 'method', type: 'string' }])]
    const snapshot = buildSnapshot(events)
    expect(snapshot.version).toBe(1)
    expect(snapshot.events['user-login']).toBeDefined()
    expect(snapshot.events['user-login'].properties.method).toEqual({ type: 'string' })
  })

  test('builds snapshot for event with no fields', () => {
    const events = [makeEvent('app-open', [])]
    const snapshot = buildSnapshot(events)
    expect(snapshot.events['app-open']).toBeDefined()
    expect(snapshot.events['app-open'].properties).toEqual({})
  })

  test('builds snapshot for multiple events', () => {
    const events = [
      makeEvent('page-view', [{ name: 'page', type: 'string' }]),
      makeEvent('click', [
        { name: 'target', type: 'string' },
        { name: 'x', type: 'number' },
      ]),
    ]
    const snapshot = buildSnapshot(events)
    expect(Object.keys(snapshot.events)).toHaveLength(2)
    expect(snapshot.events['page-view'].properties.page).toEqual({ type: 'string' })
    expect(snapshot.events.click.properties.x).toEqual({ type: 'number' })
  })

  test('returns empty events map for empty input', () => {
    const snapshot = buildSnapshot([])
    expect(snapshot.version).toBe(1)
    expect(snapshot.events).toEqual({})
  })
})

describe('diffSnapshots', () => {
  test('detects removed event', () => {
    const prev: Snapshot = {
      version: 1,
      events: { 'user-login': { properties: { method: { type: 'string' } } } },
    }
    const current: Snapshot = {
      version: 1,
      events: {},
    }
    const diff = diffSnapshots(current, prev)
    expect(diff.removed).toContain('user-login')
    expect(diff.added).toHaveLength(0)
    expect(diff.propsRemoved).toHaveLength(0)
  })

  test('detects removed property from an event', () => {
    const prev: Snapshot = {
      version: 1,
      events: {
        'user-login': {
          properties: { method: { type: 'string' }, platform: { type: 'string' } },
        },
      },
    }
    const current: Snapshot = {
      version: 1,
      events: {
        'user-login': {
          properties: { method: { type: 'string' } },
        },
      },
    }
    const diff = diffSnapshots(current, prev)
    expect(diff.propsRemoved).toContainEqual({ event: 'user-login', property: 'platform' })
    expect(diff.removed).toHaveLength(0)
    expect(diff.propsAdded).toHaveLength(0)
  })

  test('detects added event', () => {
    const prev: Snapshot = {
      version: 1,
      events: {},
    }
    const current: Snapshot = {
      version: 1,
      events: { 'new-event': { properties: {} } },
    }
    const diff = diffSnapshots(current, prev)
    expect(diff.added).toContain('new-event')
    expect(diff.removed).toHaveLength(0)
  })

  test('detects added property to an event', () => {
    const prev: Snapshot = {
      version: 1,
      events: { 'user-login': { properties: { method: { type: 'string' } } } },
    }
    const current: Snapshot = {
      version: 1,
      events: {
        'user-login': {
          properties: { method: { type: 'string' }, newProp: { type: 'boolean' } },
        },
      },
    }
    const diff = diffSnapshots(current, prev)
    expect(diff.propsAdded).toContainEqual({ event: 'user-login', property: 'newProp' })
    expect(diff.propsRemoved).toHaveLength(0)
  })

  test('no drift for identical snapshots', () => {
    const snap: Snapshot = {
      version: 1,
      events: { 'page-view': { properties: { page: { type: 'string' } } } },
    }
    const diff = diffSnapshots(snap, snap)
    expect(diff.removed).toHaveLength(0)
    expect(diff.added).toHaveLength(0)
    expect(diff.propsRemoved).toHaveLength(0)
    expect(diff.propsAdded).toHaveLength(0)
  })

  test('detects multiple removals and additions simultaneously', () => {
    const prev: Snapshot = {
      version: 1,
      events: {
        'event-a': { properties: { x: { type: 'string' } } },
        'event-b': { properties: { y: { type: 'number' } } },
      },
    }
    const current: Snapshot = {
      version: 1,
      events: {
        'event-b': { properties: {} }, // y removed
        'event-c': { properties: {} }, // new event
      },
    }
    const diff = diffSnapshots(current, prev)
    expect(diff.removed).toContain('event-a')
    expect(diff.propsRemoved).toContainEqual({ event: 'event-b', property: 'y' })
    expect(diff.added).toContain('event-c')
  })
})

describe('snapshot save/load round-trip', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codegen-check-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('loadSnapshot returns null when file does not exist', () => {
    const result = loadSnapshot(join(tmpDir, 'missing.json'))
    expect(result).toBeNull()
  })

  test('save and load round-trip preserves snapshot', () => {
    const snapshot: Snapshot = {
      version: 1,
      events: {
        'user-login': { properties: { method: { type: 'string' } } },
        'page-view': { properties: { page: { type: 'string' }, count: { type: 'number' } } },
      },
    }
    const filePath = join(tmpDir, '.analytics-schema.snapshot.json')
    saveSnapshot(filePath, snapshot)
    const loaded = loadSnapshot(filePath)
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(1)
    expect(loaded?.events['user-login'].properties.method).toEqual({ type: 'string' })
    expect(loaded?.events['page-view'].properties.count).toEqual({ type: 'number' })
  })

  test('saved file ends with newline', () => {
    const snapshot: Snapshot = { version: 1, events: {} }
    const filePath = join(tmpDir, 'snap.json')
    saveSnapshot(filePath, snapshot)
    const contents = readFileSync(filePath, 'utf-8')
    expect(contents.endsWith('\n')).toBe(true)
  })

  test('buildSnapshot + save + load + diff shows no drift', () => {
    const events = [makeEvent('user-login', [{ name: 'method', type: 'string' }])]
    const snapshot = buildSnapshot(events)
    const filePath = join(tmpDir, '.analytics-schema.snapshot.json')
    saveSnapshot(filePath, snapshot)
    const loaded = loadSnapshot(filePath)!
    const diff = diffSnapshots(snapshot, loaded)
    expect(diff.removed).toHaveLength(0)
    expect(diff.added).toHaveLength(0)
    expect(diff.propsRemoved).toHaveLength(0)
    expect(diff.propsAdded).toHaveLength(0)
  })
})
