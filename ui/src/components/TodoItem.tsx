import { Todo } from "../types";

interface TodoItemProps {
  todo: Todo;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onComplete, onDelete }: TodoItemProps) {
  const deadlineDate = todo.deadline ? new Date(todo.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate.getTime() < Date.now();

  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onComplete(todo.id)}
          className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <div className="flex-1">
          <h3 className={`font-medium ${todo.completed ? "line-through text-gray-500" : "text-gray-900"}`}>
            {todo.text}
          </h3>
          <div className="mt-1 text-sm text-gray-500 space-y-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {todo.category}
              </span>
              {deadlineDate && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isOverdue ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {deadlineDate.toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="font-medium">Priority:</span> {todo.priority}
              </div>
              <div>
                <span className="font-medium">Time:</span> {todo.timeRequired}h
              </div>
              <div>
                <span className="font-medium">Value:</span> {todo.value}
              </div>
            </div>
            {todo.score !== undefined && (
              <div>
                <span className="font-medium">Score:</span> {todo.score.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(todo.id)} className="p-1 text-red-500 hover:text-red-700 focus:outline-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
