export interface SchemaEvent {
  description?: string
  [field: string]: string | undefined
}

export interface AnalyticsSchema {
  events: Record<string, SchemaEvent>
}

export interface ParsedField {
  name: string
  type: string
  optional: boolean
  description?: string
}

export interface ParsedEvent {
  name: string
  description?: string
  fields: ParsedField[]
}

export interface CodegenOptions {
  input: string
  output?: string
  clientVar?: string
}
