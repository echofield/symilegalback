import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';

export const logger = isDev
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
      formatters: {
        level: (label) => ({ level: label }),
      },
    })
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: { level: (label) => ({ level: label }) },
    });

