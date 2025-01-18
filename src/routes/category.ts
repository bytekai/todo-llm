import { Hono } from "hono";
import { Container } from "../lib/container.js";

export function createCategoryRouter({ services: { categoryService } }: Container) {
  const app = new Hono();

  app.get("/", async (c) => {
    const categories = await categoryService.listCategories();
    return c.json(categories);
  });

  app.get("/:name", async (c) => {
    const name = c.req.param("name");
    const category = await categoryService.getCategory(name);
    if (!category) {
      return c.json({ error: "Category not found" }, 404);
    }
    return c.json(category);
  });

  app.post("/", async (c) => {
    const { name, weight } = await c.req.json();
    try {
      await categoryService.createCategory(name, weight);
      return c.json({ success: true }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to create category" }, 400);
    }
  });

  app.put("/:name", async (c) => {
    const name = c.req.param("name");
    const updates = await c.req.json();

    try {
      const success = await categoryService.updateCategory(name, updates);
      if (!success) {
        return c.json({ error: "Category not found" }, 404);
      }
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to update category" }, 400);
    }
  });

  app.delete("/:name", async (c) => {
    const name = c.req.param("name");
    try {
      const success = await categoryService.deleteCategory(name);
      if (!success) {
        return c.json({ error: "Category not found" }, 404);
      }
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Failed to delete category" }, 400);
    }
  });

  return app;
}
