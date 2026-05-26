import type { ParsedEvent } from './types.js'

export interface AvroField {
  name: string
  type: string | string[] | { type: string; items: string }
  default?: unknown
  doc?: string
}

export interface AvroRecord {
  type: 'record'
  name: string
  doc?: string
  fields: AvroField[]
}

function typeToAvro(
  type: string
): string | { type: string; items: string } {
  switch (type) {
    case 'string': return 'string'
    case 'number': return 'double'
    case 'integer': return 'long'
    case 'boolean': return 'boolean'
    case 'array': return { type: 'array', items: 'string' }
    default: return 'string'
  }
}

export function eventToAvro(event: ParsedEvent): AvroRecord {
  const fields: AvroField[] = event.fields.map(field => {
    const avroType = typeToAvro(field.type)

    if (field.optional) {
      const avroField: AvroField = {
        name: field.name,
        type: ['null', avroType as string | { type: string; items: string }] as string[],
        default: null,
      }
      if (field.description !== undefined) {
        avroField.doc = field.description
      }
      return avroField
    }

    const avroField: AvroField = {
      name: field.name,
      type: avroType,
    }
    if (field.description !== undefined) {
      avroField.doc = field.description
    }
    return avroField
  })

  const record: AvroRecord = {
    type: 'record',
    name: event.name,
    fields,
  }

  if (event.description !== undefined) {
    record.doc = event.description
  }

  return record
}

export function eventsToAvroFiles(
  events: ParsedEvent[]
): Array<{ filename: string; content: string }> {
  return events.map(e => ({
    filename: `${e.name}.avsc`,
    content: JSON.stringify(eventToAvro(e), null, 2) + '\n',
  }))
}
