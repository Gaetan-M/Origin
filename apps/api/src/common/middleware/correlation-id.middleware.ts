import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Express Request augmented with the resolved correlation id. */
export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

/**
 * Reads an incoming `x-correlation-id` header (or generates a UUID), attaches
 * it to the request and echoes it back on the response. Emits one structured
 * (JSON) access-log line per request including the correlation id.
 *
 * No PII is logged: only method, path (query string excluded), status code and
 * the correlation id — never request bodies, phone numbers, CNI or OTP codes.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_ID_HEADER];
    const provided = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim();
    const correlationId = provided && provided.length > 0 ? provided : randomUUID();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    res.on('finish', () => {
      // `req.path` excludes the query string to avoid leaking tokens/PII.
      process.stdout.write(
        `${JSON.stringify({
          level: 'info',
          msg: 'request',
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
        })}\n`,
      );
    });

    next();
  }
}
