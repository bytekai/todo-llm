import { Todo, Category, CreateTodoInput } from "../types";

const API_BASE = "http://localhost:3000/api";

export const api = {
  async getTodos(category?: string, sortByPugh = true): Promise<Todo[]> {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (!sortByPugh) params.append("sort", "id");
    const response = await fetch(`${API_BASE}/todo?${params}`);
    return response.json();
  },

  async getTodo(id: number): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todo/${id}`);
    return response.json();
  },

  async createTodo(todo: CreateTodoInput): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE}/todo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    return response.json();
  },

  async updateTodo(id: number, updates: Partial<Todo>): Promise<void> {
    await fetch(`${API_BASE}/todo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },

  async completeTodo(id: number): Promise<void> {
    await fetch(`${API_BASE}/todo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ op: "replace", path: "/completed", value: true }]),
    });
  },

  async deleteTodo(id: number): Promise<void> {
    await fetch(`${API_BASE}/todo/${id}`, {
      method: "DELETE",
    });
  },

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/category`);
    return response.json();
  },

  async createCategory(name: string, weight: number): Promise<void> {
    await fetch(`${API_BASE}/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, weight }),
    });
  },
};
