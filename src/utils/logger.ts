/**
 * Production-safe logger that suppresses sensitive data in production builds.
 */
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (isDev) console.log(msg, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (isDev) console.info(msg, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (isDev) console.warn(msg, ...args);
    else console.warn(msg);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (isDev) console.error(msg, ...args);
    else console.error(msg); // omit sensitive data in production
  }
};
