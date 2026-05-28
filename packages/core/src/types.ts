// ============================================================
// NOVA ARQUITETURA — Log Levels, Transport, Plugin, Provider
// ============================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export type LogEntry = {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
  error?: Error
}

export type Transport = {
  readonly name: string
  readonly minLevel: LogLevel
  enabled?: boolean
  log(entry: LogEntry): void | Promise<void>
  flush?(): void | Promise<void>
}

export function resolveEnabled(options?: { enabled?: boolean }): boolean {
  return options?.enabled ?? true
}

export type Plugin = (entry: LogEntry) => LogEntry | null

export interface AnalyticsProvider<
  TEvent extends Record<string, any> = Record<string, any>,
  TUser extends { id: string } = { id: string }
> {
  readonly name: string
  enabled: boolean
  init?(): void
  event?<K extends keyof TEvent>(name: K, properties?: TEvent[K]): void
  identify?(user: TUser): void
  screen?(name: string, params?: Record<string, any>): void
  error?(feature: string, name: string, critical: boolean, error: Error, extra?: Record<string, unknown>): void
  flush?(): void
  reset?(): void
}

// ============================================================
// Event Registry — module-augmentation hook
// ============================================================

export interface EventRegistry {}

export type RegisteredEvents = keyof EventRegistry extends never
  ? EVENT_TAGS
  : EventRegistry

export type ConsentState = {
  analytics?: boolean
  errors?: boolean
}

export interface EmitIoStrategyConfig<
  TEvent extends Record<string, any> = EVENT_TAGS,
  TUser extends { id: string } = User
> {
  providers?: AnalyticsProvider<TEvent, TUser>[]
  transports?: Transport[]
  plugins?: Plugin[]
  emitAppOpenOnInit?: boolean
  preInitBuffer?: { size?: number }
  consent?: ConsentState
}

// ============================================================
// TIPOS LEGADOS — mantidos para backward compatibility
// ============================================================

export type LOG_TAGS =
  | 'app_start'
  | 'app_background'
  | 'app_foreground'
  | 'app_crash'
  | 'user_login'
  | 'user_logout'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | string;

export type EVENT_TAGS = Record<string, Record<string, unknown>>

export type NETWORK_ANALYTICS_TAGS =
  | 'GraphqlQuery_error_graphql'
  | 'GraphqlQuery_info_graphql'
  | 'GraphqlQuery_request_graphql'
  | 'RestApi_error'
  | 'RestApi_info'
  | 'RestApi_request'
  | 'WebSocket_error'
  | 'WebSocket_info'
  | 'WebSocket_request';

export type User = {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  status?: string;
  [key: string]: any;
}

export type LogItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  [key: string]: any;
}

export type CheckoutData = {
  currency: string;
  value: number;
  items: LogItem[];
  [key: string]: any;
}

export type PaymentData = CheckoutData & {
  tax?: number;
  shipping?: number;
  transaction_id: string;
  type: string;
}

/** @deprecated Use AnalyticsProvider +EmitIoStrategyConfig */
export interface LoggerStrategyConstructor<
  TLogTags extends string = LOG_TAGS,
  TNetworkTags extends string = NETWORK_ANALYTICS_TAGS,
  TUser extends { id: string } = User,
  TBeginCheckout extends { currency?: string; value?: number } = BeginCheckoutEvent,
  TPurchase extends { type: string } = PurchaseLogEvent,
  TEvent extends Record<string, any> = EVENT_TAGS
> {
  class: LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>;
  enabled: boolean;
}

/** @deprecated Use AnalyticsProvider interface instead */
export abstract class LoggerStrategyType<
  TLogTags extends string = LOG_TAGS,
  TNetworkTags extends string = NETWORK_ANALYTICS_TAGS,
  TUser extends { id: string } = User,
  TBeginCheckout extends { currency?: string; value?: number } = BeginCheckoutEvent,
  TPurchase extends { type: string } = PurchaseLogEvent,
  TEvent extends Record<string, any> = EVENT_TAGS
> {
  abstract init(): void
  abstract log?(name: TLogTags, properties?: Record<string, any>): void
  abstract event?<T extends keyof TEvent>(name: T, properties?: TEvent[T]): void
  abstract network?(name: TNetworkTags, properties?: Record<string, any>): void

  abstract info?(feature: string, name: string, properties?: Record<string, any> | string | boolean): void
  abstract error?(feature: string, name: string, critical: boolean, error: Error, extra?: Record<string, unknown>): void

  abstract reset?(): void
  abstract logScreen?(screenName: string, params?: Record<string, any>): void

  abstract setUserId?(userId: string): void
  abstract setUserProperty?(name: string, value: Record<string, any>): void
  abstract setUser?(properties: TUser): void
  abstract setUserProperties?(properties: Record<string, any>): void

  abstract logBeginCheckout?(checkoutId: string, properties: TBeginCheckout): void
  abstract logPaymentSuccess?(checkoutId: string, properties: TPurchase): void

  abstract flush?(): void
  abstract getId?(): string
}

export type PurchaseLogEvent = {
  affiliation?: string
  coupon?: string
  currency?: string
  items?: Item[]
  shipping?: number
  tax?: number
  value?: number
  transaction_id?: string
  type: 'credit_card'
}

export type BeginCheckoutEvent = {
  currency?: string
  value?: number
  coupon?: string
  items?: Item[]
}

export type Item = {
  item_brand?: string
  item_id?: string
  item_name?: string
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_category4?: string
  item_category5?: string
  item_list_id?: string
  item_list_name?: string
  item_location_id?: string
  item_variant?: string
  quantity?: number
  price?: number
}
