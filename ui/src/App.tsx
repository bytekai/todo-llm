import { TodoList } from "./components/TodoList";

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Smart Todo App</h1>
            </div>
            <div className="text-sm text-gray-500">Powered by Pugh Matrix</div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Task Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Organize and prioritize your tasks using the Pugh Matrix method. Tasks are automatically scored and
                  sorted based on their priority, time requirement, and value.
                </p>
              </div>
              <TodoList />
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Use the Pugh Matrix to make better decisions about task priority. Higher scores indicate tasks with better
            value-to-effort ratios.
          </p>
        </div>
      </footer>
    </div>
  );
}
