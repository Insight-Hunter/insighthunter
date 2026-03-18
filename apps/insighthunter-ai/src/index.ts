import { CfoAgent } from './agents/CfoAgent';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Implement your fetch logic here
    return new Response('Hello from InsightHunter Agents!');
  },
};

export { CfoAgent };
