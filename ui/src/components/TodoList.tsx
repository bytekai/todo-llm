import { useEffect, useState } from "react";
import { Todo, Category, CreateTodoInput } from "../types";
import { api } from "../api/client";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortByPugh, setSortByPugh] = useState(true);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryWeight, setNewCategoryWeight] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [fetchedTodos, fetchedCategories] = await Promise.all([
      api.getTodos(selectedCategory, sortByPugh),
      api.getCategories(),
    ]);
    setTodos(fetchedTodos);
    setCategories(fetchedCategories);
  }

  async function handleCreateTodo(todo: CreateTodoInput) {
    await api.createTodo(todo);
    await loadData();
  }

  async function handleCompleteTodo(id: number) {
    await api.completeTodo(id);
    await loadData();
  }

  async function handleDeleteTodo(id: number) {
    await api.deleteTodo(id);
    await loadData();
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    await api.createCategory(newCategoryName, newCategoryWeight);
    setNewCategoryName("");
    setNewCategoryWeight(1);
    setShowNewCategoryForm(false);
    await loadData();
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={sortByPugh}
            onChange={(e) => setSortByPugh(e.target.checked)}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Sort by Pugh Matrix</span>
        </label>

        <button
          onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
          className="ml-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {showNewCategoryForm ? "Cancel" : "New Category"}
        </button>
      </div>

      {showNewCategoryForm && (
        <form onSubmit={handleCreateCategory} className="flex items-end gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Weight (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={newCategoryWeight}
              onChange={(e) => setNewCategoryWeight(Number(e.target.value))}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Category
          </button>
        </form>
      )}

      <TodoForm categories={categories} onSubmit={handleCreateTodo} />

      <div className="space-y-4">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onComplete={handleCompleteTodo} onDelete={handleDeleteTodo} />
        ))}
        {todos.length === 0 && <p className="text-center text-gray-500 py-8">No todos found.</p>}
      </div>
    </div>
  );
}
