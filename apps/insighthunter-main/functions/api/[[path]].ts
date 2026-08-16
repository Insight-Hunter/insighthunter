export const onRequestGet = async () => {
  return new Response(JSON.stringify({ ok: true, service: "insighthunter-main-api" }), {
    headers: { "content-type": "application/json" },
  });
};
