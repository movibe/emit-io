// Shared types for @emit-io/next

/** Context propagated via AsyncLocalStorage through middleware and route handlers */
export interface RequestContext {
  requestId: string
  path: string
  method?: string
}
