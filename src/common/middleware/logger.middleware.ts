import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? 'unknown';

    // Skip health check dari log (biar tidak spam)
        const skipPaths = [
      '/api/v1/health',
      '/api/v1/health/live',
      '/api/v1/health/ready',
      '/api/docs',
    ];
    const shouldSkip = skipPaths.some((p) => originalUrl.startsWith(p));

    // Log saat response selesai
    res.on('finish', () => {
      if (shouldSkip) return;

      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') ?? 0;

      // Warna status code
      let statusColor = '\x1b[32m'; // green
      if (statusCode >= 500) statusColor = '\x1b[31m'; // red
      else if (statusCode >= 400) statusColor = '\x1b[33m'; // yellow
      else if (statusCode >= 300) statusColor = '\x1b[36m'; // cyan
      const reset = '\x1b[0m';

      // Warna duration (slow request warning)
      let durationColor = '\x1b[32m'; // green
      if (duration > 1000) durationColor = '\x1b[31m'; // red (slow)
      else if (duration > 500) durationColor = '\x1b[33m'; // yellow (medium)

      const logMessage = `${method} ${originalUrl} ${statusColor}${statusCode}${reset} ${durationColor}${duration}ms${reset} - ${contentLength}b - ${ip} - ${userAgent.substring(0, 50)}`;

      // Log level berdasarkan status code
      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }

      // Warning untuk slow request
      if (duration > 1000) {
        this.logger.warn(
          `🐌 SLOW REQUEST: ${method} ${originalUrl} took ${duration}ms`,
        );
      }
    });

    next();
  }
}
