import { CliTable } from "./table.js";
import { Todo } from "../types.js";
import { formatTime, formatDeadline } from "./date.js";

export function createTodoTable(todos: Todo[], showScore = true): CliTable<Todo> {
  const table = new CliTable<Todo>();

  table.addColumn({
    header: "ID",
    align: "center",
    format: (todo: Todo) => todo.id.toString(),
  });

  table.addColumn({
    header: "P/T/V",
    align: "center",
    format: (todo: Todo) => `${todo.priority}/${formatTime(todo.timeRequired)}/${todo.value}`,
  });

  if (showScore) {
    table.addColumn({
      header: "Score",
      align: "center",
      format: (todo: Todo) => (todo.score || 0).toFixed(2),
    });
  }

  const maxCategoryLength = Math.max(...todos.map((todo) => todo.category.length), 8);

  table.addColumn({
    header: "Project",
    format: (todo: Todo) => todo.project?.name || "-",
  });

  table.addColumn({
    header: "Deadline",
    align: "center",
    format: (todo: Todo) => formatDeadline(todo.deadline),
  });

  table.addColumn({
    header: "Deps",
    align: "center",
    format: (todo: Todo) => (todo.dependencies?.length ? `#${todo.dependencies.join(",")}` : "-"),
  });

  table.addColumn({
    header: "Text",
    format: (todo: Todo) => todo.text,
  });

  return table.setData(todos);
}
