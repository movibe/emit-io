import { test, expect, describe } from 'vitest'
import { eventToJSONSchema, eventsToJSONSchemaFiles } from '../export-json-schema.js'
import type { ParsedEvent } from '../types.js'

function makeEvent(
  name: string,
  fields: Array<{ name: string; type: string; optional?: boolean; description?: string }>,
  description?: string
): ParsedEvent {
  return {
    name,
    description,
    fields: fields.map(f => ({
      name: f.name,
      type: f.type,
      optional: f.optional ?? false,
      description: f.description,
    })),
  }
}

describe('eventToJSONSchema', () => {
  test('string prop maps to type string', () => {
    const event = makeEvent('user_login', [{ name: 'method', type: 'string' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['method']).toEqual({ type: 'string' })
  })

  test('number prop maps to type number', () => {
    const event = makeEvent('page_view', [{ name: 'duration', type: 'number' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['duration']).toEqual({ type: 'number' })
  })

  test('integer prop maps to type integer', () => {
    const event = makeEvent('page_view', [{ name: 'count', type: 'integer' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['count']).toEqual({ type: 'integer' })
  })

  test('boolean prop maps to type boolean', () => {
    const event = makeEvent('user_login', [{ name: 'remember_me', type: 'boolean' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['remember_me']).toEqual({ type: 'boolean' })
  })

  test('array prop maps to type array', () => {
    const event = makeEvent('user_login', [{ name: 'tags', type: 'array' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['tags']).toEqual({ type: 'array' })
  })

  test('object prop maps to type object', () => {
    const event = makeEvent('user_login', [{ name: 'meta', type: 'object' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['meta']).toEqual({ type: 'object' })
  })

  test('enum prop (TS union literals) maps to type string with enum array', () => {
    const event = makeEvent('user_login', [{ name: 'method', type: "'email' | 'sso'" }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['method']).toEqual({ type: 'string', enum: ['email', 'sso'] })
  })

  test('unknown type maps to {} (any)', () => {
    const event = makeEvent('user_login', [{ name: 'data', type: 'SomeCustomType' }])
    const schema = eventToJSONSchema(event)
    expect(schema.properties['data']).toEqual({})
  })

  test('required array populated for non-optional fields', () => {
    const event = makeEvent('user_login', [
      { name: 'method', type: 'string', optional: false },
      { name: 'remember_me', type: 'boolean', optional: true },
    ])
    const schema = eventToJSONSchema(event)
    expect(schema.required).toContain('method')
    expect(schema.required).not.toContain('remember_me')
  })

  test('optional fields are not required', () => {
    const event = makeEvent('user_login', [
      { name: 'opt_field', type: 'string', optional: true },
    ])
    const schema = eventToJSONSchema(event)
    expect(schema.required).toHaveLength(0)
  })

  test('additionalProperties is false', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.additionalProperties).toBe(false)
  })

  test('description is preserved', () => {
    const event = makeEvent('user_login', [], 'User signed in')
    const schema = eventToJSONSchema(event)
    expect(schema.description).toBe('User signed in')
  })

  test('description is omitted when not provided', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.description).toBeUndefined()
  })

  test('$id equals event name', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.$id).toBe('user_login')
  })

  test('title equals event name', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.title).toBe('user_login')
  })

  test('$schema is JSON Schema draft-07', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
  })

  test('type is object', () => {
    const event = makeEvent('user_login', [])
    const schema = eventToJSONSchema(event)
    expect(schema.type).toBe('object')
  })
})

describe('eventsToJSONSchemaFiles', () => {
  test('multiple events produce multiple files', () => {
    const events = [
      makeEvent('user_login', [{ name: 'method', type: 'string' }]),
      makeEvent('page_view', [{ name: 'url', type: 'string' }]),
    ]
    const files = eventsToJSONSchemaFiles(events)
    expect(files).toHaveLength(2)
    expect(files[0].filename).toBe('user_login.schema.json')
    expect(files[1].filename).toBe('page_view.schema.json')
  })

  test('filename has .schema.json extension', () => {
    const events = [makeEvent('user_login', [])]
    const files = eventsToJSONSchemaFiles(events)
    expect(files[0].filename).toBe('user_login.schema.json')
  })

  test('content is valid JSON', () => {
    const events = [makeEvent('user_login', [{ name: 'method', type: 'string' }], 'User signed in')]
    const files = eventsToJSONSchemaFiles(events)
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  test('content ends with newline', () => {
    const events = [makeEvent('user_login', [])]
    const files = eventsToJSONSchemaFiles(events)
    expect(files[0].content.endsWith('\n')).toBe(true)
  })

  test('empty events list produces empty files list', () => {
    const files = eventsToJSONSchemaFiles([])
    expect(files).toHaveLength(0)
  })
})
