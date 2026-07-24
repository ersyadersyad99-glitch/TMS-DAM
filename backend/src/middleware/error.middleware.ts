import type { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('[Error]', err);

  if (err instanceof Error) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({
      error: err.message,
      code:  err.name,
    });
    return;
  }

  res.status(500).json({
    error: 'An unexpected error occurred',
    code:  'INTERNAL_SERVER_ERROR',
  });
}
