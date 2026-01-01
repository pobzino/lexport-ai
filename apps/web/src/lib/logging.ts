/**
 * Request Logging with Correlation IDs
 *
 * Provides structured logging with request tracking across the application.
 * Each request gets a unique correlation ID that's propagated through all logs.
 */

import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

// Generate a unique correlation ID
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// Header name for correlation ID
export const CORRELATION_ID_HEADER = "x-correlation-id";

// Log levels
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  correlationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  error?: Error;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

/**
 * Structured logger that outputs JSON logs
 */
class Logger {
  private formatEntry(level: LogLevel, message: string, context: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        // Ensure we don't log sensitive data
        ...(context.error && {
          error: {
            name: context.error.name,
            message: context.error.message,
            stack: process.env.NODE_ENV === "development" ? context.error.stack : undefined,
          },
        }),
      },
    };
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    const entry = this.formatEntry(level, message, context);

    // In production, output JSON for log aggregation
    if (process.env.NODE_ENV === "production") {
      const output = JSON.stringify(entry);
      switch (level) {
        case "error":
          console.error(output);
          // Also report to Sentry
          if (context.error) {
            Sentry.captureException(context.error, {
              extra: context,
              tags: {
                correlationId: context.correlationId,
              },
            });
          }
          break;
        case "warn":
          console.warn(output);
          break;
        default:
          console.log(output);
      }
    } else {
      // In development, use pretty formatting
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      const contextStr = Object.keys(context).length > 0
        ? `\n${JSON.stringify(context, null, 2)}`
        : "";

      switch (level) {
        case "error":
          console.error(`${prefix} ${message}${contextStr}`);
          break;
        case "warn":
          console.warn(`${prefix} ${message}${contextStr}`);
          break;
        case "debug":
          console.debug(`${prefix} ${message}${contextStr}`);
          break;
        default:
          console.log(`${prefix} ${message}${contextStr}`);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

export const logger = new Logger();

/**
 * Get or create correlation ID from request headers
 */
export async function getCorrelationId(): Promise<string> {
  try {
    const headersList = await headers();
    return headersList.get(CORRELATION_ID_HEADER) || generateCorrelationId();
  } catch {
    // Headers not available (e.g., in non-request context)
    return generateCorrelationId();
  }
}

/**
 * Create a request logger with context
 */
export function createRequestLogger(correlationId: string, path: string, method: string) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      logger.debug(message, { correlationId, path, method, ...extra }),
    info: (message: string, extra?: Record<string, unknown>) =>
      logger.info(message, { correlationId, path, method, ...extra }),
    warn: (message: string, extra?: Record<string, unknown>) =>
      logger.warn(message, { correlationId, path, method, ...extra }),
    error: (message: string, error?: Error, extra?: Record<string, unknown>) =>
      logger.error(message, { correlationId, path, method, error, ...extra }),
  };
}

/**
 * Log an API request (for use in API routes)
 */
export function logApiRequest(
  request: Request,
  correlationId: string,
  context?: Record<string, unknown>
): void {
  const url = new URL(request.url);
  logger.info("API Request", {
    correlationId,
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get("user-agent") || undefined,
    ...context,
  });
}

/**
 * Log an API response (for use in API routes)
 */
export function logApiResponse(
  request: Request,
  correlationId: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
): void {
  const url = new URL(request.url);
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

  logger[level]("API Response", {
    correlationId,
    method: request.method,
    path: url.pathname,
    statusCode,
    duration,
    ...context,
  });
}

/**
 * Wrapper for API route handlers that adds logging
 */
export function withRequestLogging<T>(
  handler: (
    request: Request,
    context: { correlationId: string; log: ReturnType<typeof createRequestLogger> }
  ) => Promise<T>
) {
  return async (request: Request): Promise<T> => {
    const startTime = Date.now();
    const correlationId = request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
    const url = new URL(request.url);
    const log = createRequestLogger(correlationId, url.pathname, request.method);

    // Set Sentry context
    Sentry.setTag("correlationId", correlationId);

    log.info("Request started");

    try {
      const response = await handler(request, { correlationId, log });
      const duration = Date.now() - startTime;

      if (response instanceof Response) {
        log.info("Request completed", {
          statusCode: response.status,
          duration,
        });
      } else {
        log.info("Request completed", { duration });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error("Request failed", error instanceof Error ? error : new Error(String(error)), {
        duration,
      });
      throw error;
    }
  };
}
