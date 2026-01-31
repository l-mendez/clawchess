import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable the default Next.js server since we use a custom server.mjs
  serverExternalPackages: [
    "better-sqlite3",
    "drizzle-orm",
  ],
  webpack: (config) => {
    // Externalize better-sqlite3 unconditionally across all webpack compilations
    // (server, client, and edge). The instrumentation hook only runs server-side
    // at runtime, but Next.js compiles it in multiple webpack passes.
    config.externals = config.externals || [];
    config.externals.push({
      "better-sqlite3": "commonjs better-sqlite3",
      crypto: "commonjs crypto",
    });
    // Externalize "node:*" imports (e.g. "node:crypto" from drizzle-orm/migrator).
    // Webpack doesn't handle the node: scheme by default.
    config.externals.push(({ request }: { request?: string }, callback: Function) => {
      if (request && request.startsWith("node:")) {
        return callback(null, "commonjs " + request.slice(5));
      }
      callback();
    });

    return config;
  },
};

export default nextConfig;
