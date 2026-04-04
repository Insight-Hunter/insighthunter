export class CfoAgent {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    // Implement your durable object logic here
    return new Response('Hello from CfoAgent!');
  }
}
