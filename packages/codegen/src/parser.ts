import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { AnalyticsSchema, ParsedEvent, ParsedField, SchemaEvent } from './types.js'

const FIELD_RE = /^(\w+)(\?)?$/

export function parseSchema(filePath: string): ParsedEvent[] {
  const raw = readFileSync(filePath, 'utf-8')
  const schema = yaml.load(raw) as AnalyticsSchema

  if (!schema || typeof schema !== 'object' || !schema.events) {
    throw new Error(`Invalid schema: expected top-level "events" key`)
  }

  return Object.entries(schema.events).map(([name, event]) => parseEvent(name, event))
}

function parseFieldValue(key: string, value: string): ParsedField {
  const match = key.match(FIELD_RE)
  if (!match) {
    throw new Error(`Invalid field name: "${key}"`)
  }
  return {
    name: match[1],
    type: value,
    optional: !!match[2],
  }
}

function parseEvent(name: string, event: SchemaEvent): ParsedEvent {
  const fields: ParsedField[] = []
  let description: string | undefined

  for (const [key, value] of Object.entries(event)) {
    if (key === 'description') {
      description = value as string
    } else if (typeof value === 'string') {
      fields.push(parseFieldValue(key, value))
    }
  }

  return { name, description, fields }
}
