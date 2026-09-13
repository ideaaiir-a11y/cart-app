// ─────────────────────────────────────────────────────────────
// Cloudflare Worker — routes all requests to the CartContainer
// (a Durable Object backed by a container running the Next.js
// standalone server).
//
// Environment variables available to the container:
//   - NODE_ENV          (var)
//   - DATABASE_URL      (var — override for D1/Data Proxy)
//   - APP_ORIGIN        (var — used for Bale notification links)
//   - ZAI_BASE_URL      (var — Z AI API endpoint)
//   - ZAI_API_KEY       (secret — set via `wrangler secret put`)
// ─────────────────────────────────────────────────────────────
import { Container, getContainer } from "@cloudflare/containers";

export class CartContainer extends Container {
  defaultPort = 3000;
  sleepAfter = "30m";

  envVars = {
    NODE_ENV: "production",
    DATABASE_URL: "file:/data/database.sqlite",
    APP_ORIGIN: "https://your-domain.com",
    ZAI_BASE_URL: "https://api.z.ai/v1",
  };

  onStart() {
    console.log("CartContainer started");
  }

  onStop() {
    console.log("CartContainer stopped");
  }

  onError(error) {
    console.error("CartContainer error:", error);
  }
}

export default {
  async fetch(request, env) {
    const container = getContainer(env.CART_CONTAINER);
    return container.fetch(request);
  },
};
