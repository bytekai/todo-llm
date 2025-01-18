import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TodoService } from "./todo.js";
import { TodoRepository } from "../repositories/todo.js";
import { CategoryRepository } from "../repositories/category.js";
import sqlite3 from "sqlite3";
import { Todo } from "../types.js";
import { ProjectsRepository } from "../repositories/projects.js";
import { Client, createClient } from "@libsql/client";
import { PughScoreCalculator } from "../lib/pugh-score.js";

describe("TodoService", () => {
  let db: sqlite3.Database;
  let client: Client;
  let todoService: TodoService;
  let todoRepository: TodoRepository;
  let categoryRepository: CategoryRepository;
  let projectsRepository: ProjectsRepository;

  beforeEach(async () => {
    db = new sqlite3.Database(":memory:");
    client = createClient({ url: ":memory:" });
    todoRepository = new TodoRepository(client);
    categoryRepository = new CategoryRepository(client);
    projectsRepository = new ProjectsRepository(client);
    todoService = new TodoService(todoRepository, categoryRepository, projectsRepository);
    await todoService.initializeDatabase();

    // Add a test category
    await categoryRepository.create({ name: "Test Category", weight: 1 });
  });

  afterEach(() => {
    return new Promise<void>((resolve) => db.close(() => resolve()));
  });

  describe("createTodo", () => {
    it("should create a todo without dependencies", async () => {
      const todo = {
        text: "Test todo",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 7,
        createdAt: Date.now(),
      };

      const id = await todoService.createTodo(todo);
      expect(id).toBeGreaterThan(0);

      const created = await todoService.getTodo(id);
      expect(created).toMatchObject({
        text: todo.text,
        category: todo.category,
        priority: todo.priority,
        timeRequired: todo.timeRequired,
        value: todo.value,
        id,
      });
      expect(created?.completed).toBe(0);
    });

    it("should create a todo with dependencies", async () => {
      // Create a dependency todo first
      const depTodo = await todoService.createTodo({
        text: "Dependency todo",
        category: "Test Category",
        priority: 3,
        timeRequired: 1,
        value: 5,
        createdAt: Date.now(),
      });

      const todo = {
        text: "Test todo with dependency",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 7,
        createdAt: Date.now(),
      };

      const id = await todoService.createTodo(todo, [depTodo]);
      const created = await todoService.getTodo(id);
      expect(created?.dependencies).toEqual([depTodo]);
    });

    it("should throw error when dependency does not exist", async () => {
      const todo = {
        text: "Test todo",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 7,
        createdAt: Date.now(),
      };

      await expect(todoService.createTodo(todo, [999])).rejects.toThrow("Dependency todo #999 not found");
    });
  });

  describe("listTodos", () => {
    it("should list todos sorted by Pugh score with dependencies at the end", async () => {
      // Create test todos
      const todo1 = await todoService.createTodo({
        text: "High priority independent",
        category: "Test Category",
        priority: 10,
        timeRequired: 1,
        value: 10,
        createdAt: Date.now(),
      });

      const todo2 = await todoService.createTodo({
        text: "Low priority independent",
        category: "Test Category",
        priority: 1,
        timeRequired: 1,
        value: 1,
        createdAt: Date.now(),
      });

      const todo3 = await todoService.createTodo(
        {
          text: "Dependent todo",
          category: "Test Category",
          priority: 8,
          timeRequired: 1,
          value: 8,
          createdAt: Date.now(),
        },
        [todo1]
      );

      const todos = await todoService.listTodos();

      expect(todos).toHaveLength(3);
      expect(todos[0].id).toBe(todo1); // High priority independent first
      expect(todos[1].id).toBe(todo2); // Low priority independent second
      expect(todos[2].id).toBe(todo3); // Dependent todo last
    });

    it("should filter todos by category", async () => {
      await categoryRepository.create({ name: "Another Category", weight: 1 });

      await todoService.createTodo({
        text: "Todo in test category",
        category: "Test Category",
        priority: 5,
        timeRequired: 1,
        value: 5,
        createdAt: Date.now(),
      });

      await todoService.createTodo({
        text: "Todo in another category",
        category: "Another Category",
        priority: 5,
        timeRequired: 1,
        value: 5,
        createdAt: Date.now(),
      });

      const todos = await todoService.listTodos("Test Category");
      expect(todos).toHaveLength(1);
      expect(todos[0].category).toBe("Test Category");
    });
  });

  describe("updateTodo", () => {
    it("should update todo fields", async () => {
      const id = await todoService.createTodo({
        text: "Original todo",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 7,
        createdAt: Date.now(),
      });

      const updates = {
        text: "Updated todo",
        priority: 8,
        value: 9,
      };

      const success = await todoService.updateTodo(id, updates);
      expect(success).toBe(true);

      const updated = await todoService.getTodo(id);
      expect(updated).toMatchObject({
        ...updates,
        id,
      });
    });

    it("should validate priority range", async () => {
      const id = await todoService.createTodo({
        text: "Test todo",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 7,
        createdAt: Date.now(),
      });

      await expect(todoService.updateTodo(id, { priority: 11 })).rejects.toThrow("Priority must be between 0 and 10");
    });
  });

  describe("calculatePughScore", () => {
    it("should calculate higher score for urgent todos", async () => {
      const now = Date.now();
      const urgentTodo: Todo = {
        id: 1,
        text: "Urgent todo",
        category: "Test Category",
        priority: 8,
        timeRequired: 2,
        value: 8,
        deadline: now + 24 * 60 * 60 * 1000, // 1 day from now
        createdAt: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        completed: false,
        project: {
          id: 1,
          name: "Test Project",
          description: "Test Project",
          categoryId: 1,
          weight: 1,
        },
      };

      const nonUrgentTodo: Todo = {
        id: 2,
        text: "Non-urgent todo",
        category: "Test Category",
        priority: 8,
        timeRequired: 2,
        value: 8,
        deadline: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        createdAt: now - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        completed: false,
        project: {
          id: 1,
          name: "Test Project",
          description: "Test Project",
          categoryId: 1,
          weight: 1,
        },
      };

      const urgentScore = PughScoreCalculator.calculatePughScore(urgentTodo);
      const nonUrgentScore = PughScoreCalculator.calculatePughScore(nonUrgentTodo);

      expect(urgentScore).toBeGreaterThan(nonUrgentScore);
    });

    it("should apply category weight to score", async () => {
      const now = Date.now();
      const todo: Todo = {
        id: 1,
        text: "Test todo",
        category: "Test Category",
        priority: 5,
        timeRequired: 2,
        value: 5,
        createdAt: now,
        completed: false,
        project: {
          id: 1,
          name: "Test Project",
          description: "Test Project",
          categoryId: 1,
          weight: 2,
        },
      };

      const sameToDoLowerWeight = { ...todo, weight: 1 };

      const highWeightScore = PughScoreCalculator.calculatePughScore(todo);
      const lowWeightScore = PughScoreCalculator.calculatePughScore(sameToDoLowerWeight);

      expect(highWeightScore).toBeGreaterThan(lowWeightScore);
    });
  });
});
