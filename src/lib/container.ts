import { Client } from "@libsql/client";
import { TodoRepository } from "../repositories/todo.js";
import { CategoryRepository } from "../repositories/category.js";
import { ProjectsRepository } from "../repositories/projects.js";
import { CategoryService } from "../services/category.js";
import { TodoService } from "../services/todo.js";

export type RepositoryContainer = {
  todoRepository: TodoRepository;
  categoryRepository: CategoryRepository;
  projectsRepository: ProjectsRepository;
};

export type ServiceContainer = {
  todoService: TodoService;
  categoryService: CategoryService;
};

export type Container = {
  services: ServiceContainer;
  repositories: RepositoryContainer;
  client: Client;
};

export const createContainer = (db: Client): Container => {
  const todoRepository = new TodoRepository(db);
  const categoryRepository = new CategoryRepository(db);
  const projectsRepository = new ProjectsRepository(db);
  const todoService = new TodoService(todoRepository, categoryRepository, projectsRepository);
  const categoryService = new CategoryService(categoryRepository);
  return {
    services: { todoService, categoryService },
    repositories: { todoRepository, categoryRepository, projectsRepository },
    client: db,
  };
};
