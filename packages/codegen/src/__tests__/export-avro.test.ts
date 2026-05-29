import { describe, expect, test } from 'vitest'
import { eventsToAvroFiles, eventToAvro } from '../export-avro.js'
import type { ParsedEvent } from '../types.js'

function makeEvent(
  name: string,
  fields: Array<{ name: string; type: string; optional?: boolean; description?: string }>,
  description?: string,
): ParsedEvent {
  return {
    name,
    description,
    fields: fields.map((f) => ({
      name: f.name,
      type: f.type,
      optional: f.optional ?? false,
      description: f.description,
    })),
  }
}

describe('eventToAvro', () => {
  test('record type is "record"', () => {
    const event = makeEvent('user_login', [])
    const avro = eventToAvro(event)
    expect(avro.type).toBe('record')
  })

  test('record name equals event name', () => {
    const event = makeEvent('user_login', [])
    const avro = eventToAvro(event)
    expect(avro.name).toBe('user_login')
  })

  test('required string field maps to direct type "string"', () => {
    const event = makeEvent('user_login', [{ name: 'method', type: 'string', optional: false }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toBe('string')
    expect(avro.fields[0].default).toBeUndefined()
  })

  test('required number field maps to direct type "double"', () => {
    const event = makeEvent('page_view', [{ name: 'duration', type: 'number', optional: false }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toBe('double')
  })

  test('required integer field maps to direct type "long"', () => {
    const event = makeEvent('page_view', [{ name: 'count', type: 'integer', optional: false }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toBe('long')
  })

  test('required boolean field maps to direct type "boolean"', () => {
    const event = makeEvent('user_login', [{ name: 'active', type: 'boolean', optional: false }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toBe('boolean')
  })

  test('required array field maps to {type: "array", items: "string"}', () => {
    const event = makeEvent('user_login', [{ name: 'tags', type: 'array', optional: false }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toEqual({ type: 'array', items: 'string' })
  })

  test('optional field maps to union ["null", T] with default null', () => {
    const event = makeEvent('user_login', [
      { name: 'remember_me', type: 'boolean', optional: true },
    ])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toEqual(['null', 'boolean'])
    expect(avro.fields[0].default).toBeNull()
  })

  test('optional string field maps to ["null", "string"]', () => {
    const event = makeEvent('user_login', [{ name: 'note', type: 'string', optional: true }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toEqual(['null', 'string'])
    expect(avro.fields[0].default).toBeNull()
  })

  test('doc is preserved from event description', () => {
    const event = makeEvent('user_login', [], 'User signed in')
    const avro = eventToAvro(event)
    expect(avro.doc).toBe('User signed in')
  })

  test('doc is omitted when no event description', () => {
    const event = makeEvent('user_login', [])
    const avro = eventToAvro(event)
    expect(avro.doc).toBeUndefined()
  })

  test('field doc is preserved from field description', () => {
    const event = makeEvent('user_login', [
      { name: 'method', type: 'string', optional: false, description: 'Auth method' },
    ])
    const avro = eventToAvro(event)
    expect(avro.fields[0].doc).toBe('Auth method')
  })

  test('field doc is omitted when no field description', () => {
    const event = makeEvent('user_login', [{ name: 'method', type: 'string' }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].doc).toBeUndefined()
  })

  test('fields are ordered as declared', () => {
    const event = makeEvent('user_login', [
      { name: 'method', type: 'string' },
      { name: 'remember_me', type: 'boolean', optional: true },
      { name: 'session_id', type: 'string' },
    ])
    const avro = eventToAvro(event)
    expect(avro.fields.map((f) => f.name)).toEqual(['method', 'remember_me', 'session_id'])
  })

  test('unknown type defaults to "string"', () => {
    const event = makeEvent('user_login', [{ name: 'data', type: 'SomeCustomType' }])
    const avro = eventToAvro(event)
    expect(avro.fields[0].type).toBe('string')
  })

  test('event with no fields produces empty fields array', () => {
    const event = makeEvent('app_open', [])
    const avro = eventToAvro(event)
    expect(avro.fields).toHaveLength(0)
  })
})

describe('eventsToAvroFiles', () => {
  test('multiple events produce multiple files', () => {
    const events = [
      makeEvent('user_login', [{ name: 'method', type: 'string' }]),
      makeEvent('page_view', [{ name: 'url', type: 'string' }]),
    ]
    const files = eventsToAvroFiles(events)
    expect(files).toHaveLength(2)
    expect(files[0].filename).toBe('user_login.avsc')
    expect(files[1].filename).toBe('page_view.avsc')
  })

  test('filename has .avsc extension', () => {
    const events = [makeEvent('user_login', [])]
    const files = eventsToAvroFiles(events)
    expect(files[0].filename).toBe('user_login.avsc')
  })

  test('content is valid JSON', () => {
    const events = [makeEvent('user_login', [{ name: 'method', type: 'string' }])]
    const files = eventsToAvroFiles(events)
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  test('content ends with newline', () => {
    const events = [makeEvent('user_login', [])]
    const files = eventsToAvroFiles(events)
    expect(files[0].content.endsWith('\n')).toBe(true)
  })

  test('empty events list produces empty files list', () => {
    const files = eventsToAvroFiles([])
    expect(files).toHaveLength(0)
  })
})
