import { app } from '../src/index.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless function handler
export default async (req: VercelRequest, res: VercelResponse) => {
  // Let Express handle the request
  return app(req, res);
};
