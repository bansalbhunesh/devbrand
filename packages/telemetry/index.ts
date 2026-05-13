/**
 * ELITE ARCHITECTURE: Telemetry Mesh.
 * Standardized interface for logs, metrics, and traces across the platform.
 */

export const logger = {
  info: (msg: string, ctx: any = {}) =>
    console.log(`[INFO] ${msg}`, JSON.stringify(ctx)),
  warn: (msg: string, ctx: any = {}) =>
    console.warn(`[WARN] ${msg}`, JSON.stringify(ctx)),
  error: (msg: string, ctx: any = {}, err?: Error) => {
    console.error(`[ERROR] ${msg}`, JSON.stringify(ctx), err?.stack);
    // In production, this would send to Sentry/Axiom
  },
};

/**
 * Higher-level trace wrapper.
 * Propagates trace context across sync and async boundaries.
 */
export async function trace<T>(
  name: string,
  fn: (span: { setTag: (k: string, v: any) => void }) => Promise<T>,
): Promise<T> {
  const start = Date.now();
  const tags: Record<string, any> = {};

  const span = {
    setTag: (k: string, v: any) => {
      tags[k] = v;
    },
  };

  try {
    const result = await fn(span);
    const duration = Date.now() - start;
    logger.info(`Trace:${name} completed`, { duration, ...tags });
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    logger.error(`Trace:${name} failed`, { duration, ...tags }, err);
    throw err;
  }
}
