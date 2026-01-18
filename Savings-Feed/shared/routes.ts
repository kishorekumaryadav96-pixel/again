import { z } from 'zod';
import { insertDealSchema, insertSniperSchema, deals, snipers } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  deals: {
    list: {
      method: 'GET' as const,
      path: '/api/deals',
      responses: {
        200: z.array(z.custom<typeof deals.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/deals',
      input: insertDealSchema,
      responses: {
        201: z.custom<typeof deals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    kill: {
      method: 'POST' as const,
      path: '/api/deals/:id/kill',
      responses: {
        200: z.custom<typeof deals.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  snipers: {
    list: {
      method: 'GET' as const,
      path: '/api/snipers',
      responses: {
        200: z.array(z.custom<typeof snipers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/snipers',
      input: insertSniperSchema,
      responses: {
        201: z.custom<typeof snipers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
