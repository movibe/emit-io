import type { ParsedEvent } from './types.js'

// Enum detection: TS union literal strings like `'login' | 'signup'`
// A union is detected when the type string contains `|` and each part
// (after trimming) is a quoted string literal.
function parseEnumValues(type: string): string[] | null {
  const parts = type.split('|').map(p => p.trim())
  const stringLiterals = parts.map(p => {
    const m = p.match(/^['"](.+)['"]$/)
    return m ? m[1] : null
  })
  if (stringLiterals.every(v => v !== null)) {
    return stringLiterals as string[]
  }
  return null
}

type JSONSchemaProperty = Record<string, unknown>

export type JSONSchema = {
  $schema: string
  $id: string
  title: string
  description?: string
  type: 'object'
  properties: Record<string, JSONSchemaProperty>
  required: string[]
  additionalProperties: boolean
}

function typeToJSONSchema(type: string): JSONSchemaProperty {
  const enumValues = parseEnumValues(type)
  if (enumValues !== null) {
    return { type: 'string', enum: enumValues }
  }

  switch (type) {
    case 'string': return { type: 'string' }
    case 'number': return { type: 'number' }
    case 'integer': return { type: 'integer' }
    case 'boolean': return { type: 'boolean' }
    case 'array': return { type: 'array' }
    case 'object': return { type: 'object' }
    default: return {}
  }
}

export function eventToJSONSchema(event: ParsedEvent): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {}
  const required: string[] = []

  for (const field of event.fields) {
    properties[field.name] = typeToJSONSchema(field.type)
    if (!field.optional) {
      required.push(field.name)
    }
  }

  const schema: JSONSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: event.name,
    title: event.name,
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }

  if (event.description !== undefined) {
    schema.description = event.description
  }

  return schema
}

export function eventsToJSONSchemaFiles(
  events: ParsedEvent[]
): Array<{ filename: string; content: string }> {
  return events.map(e => ({
    filename: `${e.name}.schema.json`,
    content: JSON.stringify(eventToJSONSchema(e), null, 2) + '\n',
  }))
}
