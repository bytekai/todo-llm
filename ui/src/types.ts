export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  category: string;
  priority: number;
  timeRequired: number;
  value: number;
  weight?: number;
  deadline?: number;
  createdAt: number;
  score?: number;
  dependencies?: number[];
}

export interface Category {
  name: string;
  weight: number;
}

export interface CreateTodoInput {
  text: string;
  category: string;
  priority: number;
  timeRequired: number;
  value: number;
  deadline?: number;
  dependencies?: number[];
}
