import { z } from "zod";
import { projectSchema } from "./repositories/projects.js";

export const todoCreateSchema = z.object({
  text: z.string(),
  completed: z.boolean(),
  category: z.string(),
  priority: z.number(),
  timeRequired: z.number(),
  value: z.number(),
  deadline: z.number().optional(),
  projectId: z.number().optional(),
  dependencies: z.array(z.number()).optional(),
});

export type TodoCreate = z.infer<typeof todoCreateSchema>;

export const todoSchema = todoCreateSchema.merge(
  z.object({
    id: z.number(),
    createdAt: z.number(),
    score: z.number().optional(),
    project: projectSchema.optional(),
  })
);

export type Todo = z.infer<typeof todoSchema>;

export interface Category {
  name: string;
  weight: number;
}
