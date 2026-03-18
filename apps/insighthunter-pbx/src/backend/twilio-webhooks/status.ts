
import { Env } from '../types';

export const status = async (request: Request, env: Env) => {
  // Handle call status changes
  console.log('Call status update:', await request.json());
  return new Response('OK');
};
