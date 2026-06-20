export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Try to serve static files first
    const asset = await env.ASSETS.fetch(request);
    if (asset.status === 200) {
      return asset;
    }

    // For SPA routes, serve index.html
    const indexRequest = new Request(new URL('/', url), request);
    return env.ASSETS.fetch(indexRequest);
  },
};
