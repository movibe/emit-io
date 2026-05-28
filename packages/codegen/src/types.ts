export type SchemaEvent = {
  description?: string
  [field: string]: string | undefined
}

export type AnalyticsSchema = {
  events: Record<string, SchemaEvent>
}

export type ParsedField = {
  name: string
  type: string
  optional: boolean
  description?: string
}

export type ParsedEvent = {
  name: string
  description?: string
  fields: ParsedField[]
}

export type CodegenOptions = {
  input: string
  output?: string
  clientVar?: string
}
