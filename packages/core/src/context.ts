type Context = Record<string, unknown>

type Store = {
  run<T>(ctx: Context, fn: () => T): T
  getStore(): Context | undefined
}

function createStore(): Store {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks') as typeof import('node:async_hooks')
    const als = new AsyncLocalStorage<Context>()
    return {
      run: (ctx, fn) => als.run(ctx, fn),
      getStore: () => als.getStore(),
    }
  } catch {
    return {
      run: (_ctx, fn) => fn(),
      getStore: () => undefined,
    }
  }
}

const store = createStore()

export function runWithContext<T>(ctx: Context, fn: () => T): T {
  const parent = store.getStore()
  const merged = parent ? { ...parent, ...ctx } : ctx
  return store.run(merged, fn)
}

export function getContext(): Context | undefined {
  return store.getStore()
}
