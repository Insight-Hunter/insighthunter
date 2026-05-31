export default {
  async fetch(request: Request) {
    return new Response(JSON.stringify({ status: 'ok', service: 'insighthunter-compliance' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

export const onRequestGet = async () => new Response('insighthunter-compliance ready');
