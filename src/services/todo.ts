import { Todo } from "../types.js";
import { TodoRepository } from "../repositories/todo.js";
import { CategoryRepository } from "../repositories/category.js";
import { ProjectsRepository } from "../repositories/projects.js";
import { PughScoreCalculator } from "../lib/pugh-score.js";

export class TodoService {
  constructor(
    private todoRepository: TodoRepository,
    private categoryRepository: CategoryRepository,
    private projectsRepository: ProjectsRepository
  ) {}

  async createTodo(todo: Omit<Todo, "id" | "completed" | "weight">, dependencies?: number[]): Promise<number> {
    const todoId = await this.todoRepository.create({
      ...todo,
      completed: false,
    });

    if (dependencies && dependencies.length > 0) {
      // Verify all dependencies exist
      for (const depId of dependencies) {
        const depTodo = await this.todoRepository.findById(depId);
        if (!depTodo) {
          throw new Error(`Dependency todo #${depId} not found`);
        }
      }

      await this.todoRepository.addDependencies(todoId, dependencies);
    }

    return todoId;
  }

  async listTodos(category?: string, sortByPugh = true): Promise<Todo[]> {
    const todos = await this.todoRepository.findAll(category);

    // Calculate scores for all todos
    todos.forEach((todo) => {
      todo.score = Math.max(PughScoreCalculator.calculatePughScore(todo), 0);
    });

    // Separate todos into independent and dependent
    const independentTodos = todos.filter((todo) => !todo.dependencies?.length);
    const dependentTodos = todos.filter((todo) => todo.dependencies?.length);

    // Sort independent todos by Pugh score if requested
    if (sortByPugh) {
      independentTodos.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    // Sort dependent todos by number of dependencies and then by score
    dependentTodos.sort((a, b) => {
      const depDiff = (b.dependencies?.length || 0) - (a.dependencies?.length || 0);
      if (depDiff !== 0) return depDiff;
      return (b.score || 0) - (a.score || 0);
    });

    // Return independent todos first, followed by dependent ones
    return [...independentTodos, ...dependentTodos];
  }

  async completeTodo(id: number): Promise<boolean> {
    return this.todoRepository.markComplete(id);
  }

  async getTodo(id: number): Promise<Todo | null> {
    return this.todoRepository.findById(id);
  }

  async updateTodo(id: number, updates: Partial<Omit<Todo, "id" | "completed">>): Promise<boolean> {
    const todo = await this.todoRepository.findById(id);
    if (!todo) return false;

    if (updates.priority !== undefined && (updates.priority < 0 || updates.priority > 10)) {
      throw new Error("Priority must be between 0 and 10");
    }
    if (updates.value !== undefined && (updates.value < 0 || updates.value > 10)) {
      throw new Error("Value must be between 0 and 10");
    }
    if (updates.timeRequired !== undefined && (updates.timeRequired <= 0 || updates.timeRequired > 100)) {
      throw new Error("Time required must be between 0 and 100 hours");
    }
    if (updates.category) {
      const categories = await this.categoryRepository.findAll();
      if (!categories.some((c) => c.name === updates.category)) {
        throw new Error(`Category '${updates.category}' does not exist`);
      }
    }

    return this.todoRepository.update(id, updates);
  }

  async deleteTodo(id: number): Promise<boolean> {
    return this.todoRepository.delete(id);
  }

  async initializeDatabase(): Promise<void> {
    await this.categoryRepository.initializeTable();
    await this.todoRepository.initializeTable();
    await this.todoRepository.initializeDependenciesTable();
    await this.todoRepository.addTimeRequiredColumn();
    await this.todoRepository.updateDefaultTimeRequired();
    await this.todoRepository.addDeadlineColumn();
    await this.projectsRepository.initialize();
  }
}
