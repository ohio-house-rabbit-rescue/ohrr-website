import type { Env } from './env'

/** An error with the status the caller should get. The message is shown to people. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const v = await request.json()
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, 'Send JSON.')
  }
}

export function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

type Ctx = EventContext<Env, string, Record<string, unknown>>

/** Wrap a handler: HttpErrors keep their status and message; anything else is a 500 with a plain message. */
export function handle(fn: (ctx: Ctx) => Promise<Response>): PagesFunction<Env> {
  return async (ctx) => {
    try {
      return await fn(ctx as Ctx)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'Something went wrong on our side. Please try again in a moment.' }, 500)
    }
  }
}
