import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createClient } from "@libsql/client";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config.js";
import { createContainer } from "./lib/container.js";
import { createCategoryRouter } from "./routes/category.js";
import { createProjectsRouter } from "./routes/project.js";
import { createTodoRouter } from "./routes/todo.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createServer(port = config.port) {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", cors());

  const client = createClient({ url: "file:" + path.join(__dirname, "todo.sqlite") });
  const container = createContainer(client);
  await container.services.todoService.initializeDatabase();

  app.route("/api/todo", createTodoRouter(container));
  app.route("/api/category", createCategoryRouter(container));
  app.route("/api/projects", createProjectsRouter(container));

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("/*", serveStatic({ root: "./dist/ui" }));

  const server = serve({ fetch: app.fetch, port });
  console.log(`Server running at http://localhost:${port}`);

  return { app, server, container };
}
