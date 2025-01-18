import { useState } from "react";
import { CreateTodoInput, Category } from "../types";

interface TodoFormProps {
  categories: Category[];
  onSubmit: (todo: CreateTodoInput) => Promise<void>;
}

export function TodoForm({ categories, onSubmit }: TodoFormProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [priority, setPriority] = useState(1);
  const [timeRequired, setTimeRequired] = useState(1);
  const [value, setValue] = useState(1);
  const [deadline, setDeadline] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !category) return;

    await onSubmit({
      text,
      category,
      priority,
      timeRequired,
      value,
      deadline: deadline ? new Date(deadline).getTime() : undefined,
    });

    setText("");
    setPriority(1);
    setTimeRequired(1);
    setValue(1);
    setDeadline("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Task</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="What needs to be done?"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} (weight: {cat.weight})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Time Required (hrs)</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={timeRequired}
            onChange={(e) => setTimeRequired(Number(e.target.value))}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Value (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Add Todo
      </button>
    </form>
  );
}
