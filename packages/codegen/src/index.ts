#!/usr/bin/env node
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { parseSchema } from './parser.js'
import { generate } from './generator.js'
import { detectPII } from './pii.js'
import { loadSnapshot, saveSnapshot, buildSnapshot, diffSnapshots } from './check.js'
import { eventsToJSONSchemaFiles } from './export-json-schema.js'
import { eventsToAvroFiles } from './export-avro.js'

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(`
@emitio/codegen — Generate typed analytics tracker from YAML schema

USAGE
  npx @emitio/codegen generate <schema.yaml> [options]
  npx @emitio/codegen check <schema.yaml> [options]
  npx @emitio/codegen export <schema.yaml> --format=<fmt> [options]

GENERATE OPTIONS
  --out <dir>     Output directory (default: same as schema file)
  --detect-pii    Warn about suspected PII fields (stderr)
  --strict-pii    Exit 1 if any PII fields are detected

CHECK OPTIONS
  --update        Update snapshot even if breaking changes are detected
  --strict        Fail on any change, including additions
  --detect-pii    Warn about suspected PII fields (stderr)
  --strict-pii    Exit 1 if any PII fields are detected

EXPORT OPTIONS
  --format <fmt>  Output format: json-schema or avro (required)
  --out <dir>     Output directory (default: same as schema file)

EXAMPLES
  npx @emitio/codegen generate analytics-schema.yaml
  npx @emitio/codegen generate schema.yaml --out src/analytics --detect-pii
  npx @emitio/codegen check schema.yaml
  npx @emitio/codegen check schema.yaml --strict
  npx @emitio/codegen check schema.yaml --update
  npx @emitio/codegen export schema.yaml --format json-schema --out schemas/
  npx @emitio/codegen export schema.yaml --format avro --out schemas/
`)
    process.exit(0)
  }

  if (command === 'generate') {
    const schemaPath = resolve(args[1])

    if (!existsSync(schemaPath)) {
      console.error(`Schema file not found: ${schemaPath}`)
      process.exit(1)
    }

    const outDirIndex = args.indexOf('--out')
    const outDir = outDirIndex !== -1 ? resolve(args[outDirIndex + 1]) : dirname(schemaPath)
    const detectPIIFlag = args.includes('--detect-pii')
    const strictPIIFlag = args.includes('--strict-pii')

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    const events = parseSchema(schemaPath)

    if (detectPIIFlag || strictPIIFlag) {
      const matches = detectPII(events)
      for (const m of matches) {
        process.stderr.write(`[PII WARN] event '${m.event}' property '${m.property}' suspected PII (matched: ${m.pattern})\n`)
      }
      if (strictPIIFlag && matches.length > 0) {
        process.exit(1)
      }
    }

    const typesFile = 'analytics-events.types.ts'
    const trackerFile = 'analytics-tracker.ts'
    const { types, tracker } = generate(events, schemaPath, outDir, typesFile)

    const typesPath = resolve(outDir, typesFile)
    const trackerPath = resolve(outDir, trackerFile)

    writeFileSync(typesPath, types, 'utf-8')
    writeFileSync(trackerPath, tracker, 'utf-8')

    console.log(`\nGenerated:\n  ${typesPath}\n  ${trackerPath}`)
    process.exit(0)
  }

  if (command === 'check') {
    const schemaPath = resolve(args[1])

    if (!existsSync(schemaPath)) {
      console.error(`Schema file not found: ${schemaPath}`)
      process.exit(1)
    }

    const updateFlag = args.includes('--update')
    const strictFlag = args.includes('--strict')
    const detectPIIFlag = args.includes('--detect-pii')
    const strictPIIFlag = args.includes('--strict-pii')

    const events = parseSchema(schemaPath)

    if (detectPIIFlag || strictPIIFlag) {
      const matches = detectPII(events)
      for (const m of matches) {
        process.stderr.write(`[PII WARN] event '${m.event}' property '${m.property}' suspected PII (matched: ${m.pattern})\n`)
      }
      if (strictPIIFlag && matches.length > 0) {
        process.exit(1)
      }
    }

    const snapshotPath = resolve(dirname(schemaPath), '.analytics-schema.snapshot.json')
    const currentSnapshot = buildSnapshot(events)
    const prevSnapshot = loadSnapshot(snapshotPath)

    if (prevSnapshot === null) {
      saveSnapshot(snapshotPath, currentSnapshot)
      console.log(`Snapshot created: ${snapshotPath}`)
      process.exit(0)
    }

    const drift = diffSnapshots(currentSnapshot, prevSnapshot)

    const hasBreaking = drift.removed.length > 0 || drift.propsRemoved.length > 0
    const hasAdditions = drift.added.length > 0 || drift.propsAdded.length > 0

    if (hasBreaking) {
      for (const name of drift.removed) {
        console.error(`[DRIFT] Event removed: '${name}'`)
      }
      for (const { event, property } of drift.propsRemoved) {
        console.error(`[DRIFT] Property removed: event '${event}' property '${property}'`)
      }
      if (updateFlag) {
        saveSnapshot(snapshotPath, currentSnapshot)
        console.log(`Snapshot updated (breaking changes acknowledged): ${snapshotPath}`)
        process.exit(0)
      }
      process.exit(1)
    }

    if (strictFlag && hasAdditions) {
      for (const name of drift.added) {
        console.error(`[DRIFT] Event added: '${name}'`)
      }
      for (const { event, property } of drift.propsAdded) {
        console.error(`[DRIFT] Property added: event '${event}' property '${property}'`)
      }
      process.exit(1)
    }

    saveSnapshot(snapshotPath, currentSnapshot)
    if (hasAdditions) {
      console.log(`Schema has additions — snapshot updated: ${snapshotPath}`)
    } else {
      console.log(`Schema is in sync with snapshot.`)
    }
    process.exit(0)
  }

  if (command === 'export') {
    const schemaPath = resolve(args[1])

    if (!existsSync(schemaPath)) {
      console.error(`Schema file not found: ${schemaPath}`)
      process.exit(1)
    }

    const formatIdx = args.indexOf('--format')
    const format = formatIdx !== -1 ? args[formatIdx + 1] : undefined
    if (!format || !['json-schema', 'avro'].includes(format)) {
      console.error('--format must be json-schema or avro')
      process.exit(1)
    }

    const outIdx = args.indexOf('--out')
    const outDir = outIdx !== -1 ? resolve(args[outIdx + 1]) : dirname(schemaPath)

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    const events = parseSchema(schemaPath)
    const files = format === 'json-schema'
      ? eventsToJSONSchemaFiles(events)
      : eventsToAvroFiles(events)

    for (const f of files) {
      const p = resolve(outDir, f.filename)
      writeFileSync(p, f.content, 'utf-8')
      console.log(`Generated: ${p}`)
    }

    process.exit(0)
  }

  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

main()
