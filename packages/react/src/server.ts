// No 'use client' — this module is safe to import in server context (Next.js server actions, etc.)
import type { LoggerStrategy } from '@emit-io/core'

/**
 * withAnalytics — wraps a Next.js server action (or any async function) to
 * automatically track success/error events with duration via a LoggerStrategy.
 *
 * Usage:
 *   const myAction = withAnalytics(originalAction, {
 *     eventName: 'submit-contact-form',
 *     logger: myLogger,
 *     extractProps: (formData) => ({ email: formData.get('email') }),
 *   })
 *
 * @param action - The async function / server action to wrap.
 * @param options.eventName - Base event name. Logged with status='success'|'error'.
 * @param options.logger - Optional LoggerStrategy instance to fire events on.
 * @param options.extractProps - Optional function to extract additional properties from args.
 */
export function withAnalytics<TArgs extends any[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: {
    eventName: string
    logger?: LoggerStrategy
    extractProps?: (...args: TArgs) => Record<string, unknown>
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const start = Date.now()
    const props = options.extractProps?.(...args) ?? {}

    try {
      const result = await action(...args)
      options.logger?.event(options.eventName as any, {
        ...props,
        status: 'success',
        durationMs: Date.now() - start,
      } as any)
      return result
    } catch (err) {
      options.logger?.event(options.eventName as any, {
        ...props,
        status: 'error',
        durationMs: Date.now() - start,
        error: (err as Error).message,
      } as any)
      throw err
    }
  }
}
