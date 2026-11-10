import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'

export type AppEnv = { Variables: { userId: number } }

/** An HTTPException that serialises as { error } JSON. */
export function httpError(status: 400 | 401 | 403 | 404 | 409 | 422, message: string) {
  return new HTTPException(status, {
    message,
    res: Response.json({ error: message }, { status }),
  })
}

export async function parseJson<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw httpError(400, 'Invalid JSON body')
  }
  const result = schema.safeParse(body)
  if (!result.success) throw httpError(400, result.error.issues[0]?.message ?? 'Invalid input')
  return result.data
}

export function parseQuery<T extends z.ZodTypeAny>(c: Context, schema: T): z.infer<T> {
  const result = schema.safeParse(c.req.query())
  if (!result.success) throw httpError(400, result.error.issues[0]?.message ?? 'Invalid query')
  return result.data
}
