import { Hono } from "hono";
import { Container } from "../lib/container.js";

interface JsonPatchOperation {
  op: "replace" | "add" | "remove" | "test" | "move" | "copy";
  path: string;
  value?: any;
  from?: string;
}

export function createTodoRouter({ services: { todoService } }: Container) {
  const app = new Hono();

  app.get("/", async (c) => {
    const category = c.req.query("category");
    const sortByPugh = c.req.query("sort") !== "id";
    const todos = await todoService.listTodos(category, sortByPugh);
    return c.json(todos);
  });

  app.get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const todo = await todoService.getTodo(id);
    if (!todo) {
      return c.json({ error: "Todo not found" }, 404);
    }
    return c.json(todo);
  });

  app.post("/", async (c) => {
    const body = await c.req.json();
    const { text, category, priority, timeRequired, value, deadline, dependencies } = body;

    try {
      const id = await todoService.createTodo(
        {
          text,
          category,
          priority,
          timeRequired,
          value,
          deadline: deadline ? new Date(deadline).getTime() : undefined,
          createdAt: Date.now(),
        },
        dependencies
      );
      return c.json({ id }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to create todo" }, 400);
    }
  });

  app.put("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const updates = await c.req.json();

    try {
      const success = await todoService.updateTodo(id, updates);
      if (!success) {
        return c.json({ error: "Todo not found" }, 404);
      }
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to update todo" }, 400);
    }
  });

  app.patch("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const operations: JsonPatchOperation[] = await c.req.json();

    try {
      const todo = await todoService.getTodo(id);
      if (!todo) {
        return c.json({ error: "Todo not found" }, 404);
      }

      for (const op of operations) {
        if (op.op !== "replace" || !op.path.startsWith("/")) {
          return c.json({ error: "Only replace operations are supported" }, 400);
        }

        const field = op.path.slice(1);
        switch (field) {
          case "completed":
            if (typeof op.value !== "boolean") {
              return c.json({ error: "Completed value must be a boolean" }, 400);
            }
            if (op.value) {
              await todoService.completeTodo(id);
            }
            break;
          case "text":
          case "category":
          case "priority":
          case "timeRequired":
          case "value":
          case "deadline":
            await todoService.updateTodo(id, { [field]: op.value });
            break;
          default:
            return c.json({ error: `Invalid path: ${op.path}` }, 400);
        }
      }

      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to patch todo" }, 400);
    }
  });

  app.delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const success = await todoService.deleteTodo(id);
    if (!success) {
      return c.json({ error: "Todo not found" }, 404);
    }
    return c.json({ success: true });
  });

  return app;
}
