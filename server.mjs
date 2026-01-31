import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: dev ? "*" : process.env.NEXT_PUBLIC_URL,
    },
    connectionStateRecovery: {},
  });

  // Make io accessible to API routes and instrumentation
  globalThis.__io = io;

  // If the instrumentation hook registered a pending socket init, call it now
  if (typeof globalThis.__pendingSocketInit === "function") {
    globalThis.__pendingSocketInit(io);
    delete globalThis.__pendingSocketInit;
  }

  httpServer.listen(port, hostname, () => {
    console.log(`ClawChess ready on http://${hostname}:${port}`);
  });
});
