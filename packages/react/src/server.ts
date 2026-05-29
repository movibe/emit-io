// No 'use client' — this module is safe to import in server context (Next.js server actions, etc.)
import type { EmitIoStrategy, RegisteredEvents } from 'emit-io-core'

// AnyStrategy: accepts any specialization of EmitIoStrategy without constraining TEvent.
type AnyStrategy = EmitIoStrategy<any, any, any, any, any, any>

/**
 * withAnalytics — wraps a Next.js server action (or any async function) to
 * automatically track success/error events with duration via a EmitIoStrategy.
 *
 * Usage:
 *   const myAction = withAnalytics(originalAction, {
 *     eventName: 'submit-contact-form',
 *     logger: myLogger,
 *     extractProps: (formData) => ({ email: formData.get('email') }),
 *   })
 *
 * @param action - The async function / server action to wrap.
 * @param options.eventName - Base event name (must be a key of RegisteredEvents). Logged with status='success'|'error'.
 * @param options.logger - Optional EmitIoStrategy instance to fire events on.
 * @param options.extractProps - Optional function to extract additional properties from args.
 */
export function withAnalytics<TArgs extends any[], TResult, K extends keyof RegisteredEvents>(
  action: (...args: TArgs) => Promise<TResult>,
  options: {
    eventName: K
    logger?: AnyStrategy
    extractProps?: (...args: TArgs) => Record<string, unknown>
  },
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const start = Date.now()
    const props = options.extractProps?.(...args) ?? {}

    try {
      const result = await action(...args)
      // Properties intentionally include runtime-injected fields (status, durationMs)
      // that may not match the static RegisteredEvents[K] payload shape.
      // Cast through unknown to acknowledge the intentional mismatch.
      options.logger?.event(options.eventName, {
        ...props,
        status: 'success',
        durationMs: Date.now() - start,
      } as unknown as RegisteredEvents[K])
      return result
    } catch (err) {
      options.logger?.event(options.eventName, {
        ...props,
        status: 'error',
        durationMs: Date.now() - start,
        error: (err as Error).message,
      } as unknown as RegisteredEvents[K])
      throw err
    }
  }
}
