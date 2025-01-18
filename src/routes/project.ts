import { Hono } from "hono";
import { Container } from "../lib/container.js";
import { createProjectSchema, updateProjectSchema } from "../repositories/projects.js";

export function createProjectsRouter({ repositories: { projectsRepository } }: Container) {
  const app = new Hono();

  app.get("/", async (c) => {
    const projects = await projectsRepository.findAll();
    return c.json(projects);
  });

  app.post("/", async (c) => {
    const project = createProjectSchema.parse(await c.req.json());
    await projectsRepository.create(project);
    return c.json({ success: true });
  });

  app.put("/:id", async (c) => {
    const id = c.req.param("id");
    const project = updateProjectSchema.parse(await c.req.json());
    await projectsRepository.update(Number(id), project);
    return c.json({ success: true });
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await projectsRepository.delete(Number(id));
    return c.json({ success: true });
  });

  return app;
}
