import { Client } from "@libsql/client";
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  categoryId: z.number(),
  weight: z.number(),
});

export type CreateProject = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({}).merge(createProjectSchema);
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export const projectSchema = z.object({ id: z.number() }).merge(createProjectSchema);

export type Project = z.infer<typeof projectSchema>;

export class ProjectsRepository {
  constructor(private db: Client) {}

  async findAll(): Promise<Project[]> {
    const result = await this.db.execute("SELECT * FROM projects");
    return result.rows as unknown as Project[];
  }

  async create(project: CreateProject): Promise<void> {
    await this.db.execute({
      sql: "INSERT INTO projects (name, description, categoryId, weight) VALUES (?, ?, ?, ?)",
      args: [project.name, project.description, project.categoryId, project.weight],
    });
  }

  async update(id: number, project: UpdateProject): Promise<void> {
    await this.db.execute({
      sql: "UPDATE projects SET name = ?, description = ?, categoryId = ?, weight = ? WHERE id = ?",
      args: [project.name, project.description, project.categoryId, project.weight, id],
    });
  }

  async delete(id: number): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM projects WHERE id = ?",
      args: [id],
    });
  }

  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        categoryId INTEGER,
        weight INTEGER
      )
    `);
  }
}
