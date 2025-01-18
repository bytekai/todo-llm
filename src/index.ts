#!/usr/bin/env nodeimport { Command } from "commander";
import { createClient } from "@libsql/client";
import { Command } from "commander";
import prompts from "prompts";
import { createContainer } from "./lib/container.js";
import { Project } from "./repositories/projects.js";
import { createServer } from "./server.js";
import { Category, Todo } from "./types.js";
import { CliTable, InteractiveTable } from "./utils/table.js";
import { createTodoTable } from "./utils/todo-table.js";
import { formatDeadline, formatTime } from "./utils/date.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { services, repositories } = createContainer(createClient({ url: "file:" + path.join(__dirname, "todo.db") }));

const program = new Command();

program.name("todo").description("A simple CLI todo app").version("1.0.0");

program
  .command("add")
  .alias("a")
  .description("Add a new todo")
  .action(async () => {
    try {
      const categories = await services.categoryService.listCategories();
      const existingTodos = await services.todoService.listTodos();

      const response = await prompts([
        {
          type: "text",
          name: "todo",
          message: "What needs to be done?",
        },
        {
          type: "select",
          name: "category",
          message: "Select a category",
          choices: categories.map((cat) => ({ title: cat.name, value: cat.name })),
        },
        {
          type: "number",
          name: "priority",
          message: "Priority (0-10):",
          validate: (value) => value >= 0 && value <= 10,
        },
        {
          type: "number",
          name: "timeRequired",
          message: "Time required (hours):",
          initial: 1,
          validate: (value) => value > 0 && value <= 100,
        },
        {
          type: "number",
          name: "value",
          message: "Value (0-10):",
          validate: (value) => value >= 0 && value <= 10,
        },
        {
          type: "confirm",
          name: "hasDeadline",
          message: "Does this todo have a deadline?",
          initial: false,
        },
        {
          type: (prev) => (prev ? "date" : null),
          name: "deadline",
          message: "Enter deadline:",
          initial: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          type: "confirm",
          name: "hasDependencies",
          message: "Does this todo depend on other todos?",
          initial: false,
        },
        {
          type: (prev) => (prev && existingTodos.length > 0 ? "multiselect" : null),
          name: "dependencies",
          message: "Select dependencies:",
          choices: existingTodos.map((todo) => ({
            title: `#${todo.id}: ${todo.text}`,
            value: todo.id,
          })),
          hint: "Space to select, Enter to confirm",
        },
      ]);

      if (response.todo && response.category) {
        try {
          const todoId = await services.todoService.createTodo(
            {
              text: response.todo,
              category: response.category,
              priority: response.priority,
              timeRequired: response.timeRequired,
              value: response.value,
              deadline: response.hasDeadline ? new Date(response.deadline).getTime() : undefined,
              createdAt: Date.now(),
            },
            response.hasDependencies ? response.dependencies : undefined
          );
          console.log(`Todo #${todoId} added successfully!`);
        } catch (err) {
          console.error("Error adding todo:", err);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });

program
  .command("list")
  .alias("ls")
  .description("List all todos")
  .option("-c, --category <category>", "Filter by category")
  .option("-s, --sort <method>", "Sort method: pugh (default) or id", "pugh")
  .action(async (options) => {
    try {
      const todos = await services.todoService.listTodos(options.category, options.sort === "pugh");
      if (todos.length === 0) {
        console.log(options.category ? `No todos found in category '${options.category}'.` : "No todos found.");
        return;
      }

      const interactiveTable = new InteractiveTable<Todo>(() => services.todoService.listTodos(options.category, true));

      interactiveTable.addColumn("ID", (todo) => todo.id.toString(), "center");
      interactiveTable.addColumn("Completed", (todo) => (todo.completed ? "✓" : " "), "center", "checkbox");
      interactiveTable.addColumn("P/T/V", (todo) => `${todo.priority}/${formatTime(todo.timeRequired)}/${todo.value}`);
      interactiveTable.addColumn("Score", (todo) => (todo.score || 0).toFixed(2), "center");
      interactiveTable.addColumn("Project", (todo) => todo.project?.name || "-");
      interactiveTable.addColumn("Deadline", (todo) => formatDeadline(todo.deadline));
      interactiveTable.addColumn("Deps", (todo) => (todo.dependencies || []).join(", "));
      interactiveTable.addColumn("Task", (todo) => todo.text);
      interactiveTable.setData(todos);

      interactiveTable.onKey("c", "Complete", async (todo) => {
        interactiveTable.refresh();
        await services.todoService.completeTodo(todo.id);
      });

      interactiveTable.onKey("d", "Delete", async (todo) => {
        interactiveTable.refresh();
        await services.todoService.deleteTodo(todo.id);
      });

      await interactiveTable.start();
    } catch (err) {
      console.error("Error listing todos:", err);
    }
  });

program
  .command("complete")
  .alias("done")
  .description("Mark a todo as complete")
  .argument("<id>", "Todo ID")
  .action(async (id: string) => {
    try {
      const success = await services.todoService.completeTodo(parseInt(id));
      if (success) {
        console.log("Todo marked as complete!");
      } else {
        console.log("Todo not found.");
      }
    } catch (err) {
      console.error("Error completing todo:", err);
    }
  });

program
  .command("modify")
  .alias("m")
  .description("Modify a todo")
  .argument("<id>", "Todo ID")
  .action(async (id: string) => {
    try {
      const todo = await services.todoService.getTodo(parseInt(id));
      if (!todo) {
        console.log("Todo not found.");
        return;
      }

      const columnToEdit = await prompts<string>([
        {
          type: "select",
          name: "column",
          message: "Select column to edit:",
          choices: [
            { title: "Text", value: "text" },
            { title: "Category", value: "category" },
            { title: "Priority", value: "priority" },
            { title: "Time Required", value: "timeRequired" },
            { title: "Value", value: "value" },
            { title: "Deadline", value: "deadline" },
            { title: "Project", value: "projectId" },
          ],
        },
      ]);

      let question: prompts.PromptObject = {
        type: "text",
        name: "value",
        message: `Enter new value for ${columnToEdit.column}:`,
      };

      switch (columnToEdit.column) {
        case "projectId":
          const projects = await repositories.projectsRepository.findAll();
          question.type = "autocomplete";
          question.message = "Select a project:";
          question.choices = projects.map((project) => ({ title: project.name, value: project.id }));
          break;
        case "dependencies":
          const todos = await services.todoService.listTodos();
          question.type = "multiselect";
          question.message = "Select dependencies:";
          question.choices = todos.map((todo) => ({ title: todo.text, value: todo.id }));
          break;
        default:
          break;
      }

      const columnValue = await prompts([question]);

      const column = columnToEdit.column as any;

      //@ts-expect-error
      todo[column] = columnValue.value;

      await services.todoService.updateTodo(parseInt(id), todo);
    } catch (err) {
      console.error("Error updating todo:", err);
    }
  });

program
  .command("remove")
  .alias("rm")
  .description("Remove a todo")
  .argument("<id>", "Todo ID")
  .action(async (id: string) => {
    try {
      const todo = await services.todoService.getTodo(parseInt(id));
      if (!todo) {
        console.log("Todo not found.");
        return;
      }

      const response = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Are you sure you want to delete: "${todo.text}"?`,
        initial: false,
      });

      if (response.confirm) {
        const success = await services.todoService.deleteTodo(parseInt(id));
        if (success) {
          console.log("Todo deleted successfully!");
        } else {
          console.log("Failed to delete todo.");
        }
      } else {
        console.log("Operation cancelled.");
      }
    } catch (err) {
      console.error("Error deleting todo:", err);
    }
  });

const categoriesCommand = program.command("categories").alias("cat").description("Manage categories");

categoriesCommand
  .command("list")
  .alias("ls")
  .description("List all categories")
  .action(async () => {
    try {
      const categories = await services.categoryService.listCategories();

      const categoriesTable = new CliTable<Category>();
      categoriesTable.addColumn({ header: "Category", format: (cat) => cat.name });
      categoriesTable.addColumn({ header: "Weight", format: (cat) => cat.weight.toString(), align: "center" });

      categoriesTable.setData(categories);
      console.log(categoriesTable.toString());
    } catch (err) {
      console.error("Error listing categories:", err);
    }
  });

categoriesCommand
  .command("add")
  .alias("a")
  .description("Add a new category")
  .action(async () => {
    const response = await prompts([
      {
        type: "text",
        name: "category",
        message: "Enter new category name:",
      },
      {
        type: "number",
        name: "weight",
        message: "Enter category weight (0-5):",
        validate: (value) => value >= 0 && value <= 5,
        initial: 1,
      },
    ]);

    if (response.category && response.weight !== undefined) {
      try {
        await repositories.categoryRepository.create({ name: response.category, weight: response.weight });
        console.log(`Category '${response.category}' added successfully with weight ${response.weight}!`);
      } catch (err) {
        console.error("Error adding category:", err);
      }
    }
  });

categoriesCommand
  .command("modify")
  .alias("m")
  .description("Modify a category")
  .argument("<name>", "Category name")
  .action(async (name: string) => {
    try {
      const category = await repositories.categoryRepository.findByName(name);
      if (!category) {
        console.log("Category not found.");
        return;
      }

      const response = await prompts([
        {
          type: "text",
          name: "name",
          message: "New name (leave empty to keep current):",
          initial: category.name,
        },
        {
          type: "number",
          name: "weight",
          message: "New weight (0-5, leave empty to keep current):",
          initial: category.weight,
          validate: (value) => value >= 0 && value <= 5,
        },
      ]);

      const updates: Partial<Category> = {};
      if (response.name !== category.name) updates.name = response.name;
      if (response.weight !== category.weight) updates.weight = response.weight;

      if (Object.keys(updates).length === 0) {
        console.log("No changes made.");
        return;
      }

      const success = await repositories.categoryRepository.update(name, updates);
      if (success) {
        console.log("Category updated successfully!");
      } else {
        console.log("Failed to update category.");
      }
    } catch (err) {
      console.error("Error updating category:", err);
    }
  });

categoriesCommand
  .command("remove")
  .alias("rm")
  .description("Remove a category")
  .argument("<name>", "Category name")
  .action(async (name: string) => {
    try {
      const category = await repositories.categoryRepository.findByName(name);
      if (!category) {
        console.log("Category not found.");
        return;
      }

      const response = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Are you sure you want to delete category '${name}'?`,
        initial: false,
      });

      if (response.confirm) {
        const success = await repositories.categoryRepository.delete(name);
        if (success) {
          console.log("Category deleted successfully!");
        } else {
          console.log("Failed to delete category.");
        }
      } else {
        console.log("Operation cancelled.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("has")) {
        console.log(err.message);
      } else {
        console.error("Error deleting category:", err);
      }
    }
  });

categoriesCommand
  .command("weight")
  .alias("w")
  .description("Update category weight")
  .argument("<category>", "Category name")
  .argument("<weight>", "New weight (0-5)")
  .action(async (categoryName: string, weightStr: string) => {
    const weight = parseFloat(weightStr);

    try {
      const success = await repositories.categoryRepository.update(categoryName, { weight });
      if (success) {
        console.log(`Updated weight for category '${categoryName}' to ${weight}`);
      } else {
        console.log("Category not found.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("between 0 and 5")) {
        console.log("Weight must be between 0 and 5");
      } else {
        console.error("Error updating category weight:", err);
      }
    }
  });

const projectsCommand = program.command("projects").alias("p").description("Manage projects");

projectsCommand
  .command("list")
  .alias("ls")
  .description("List all projects")
  .action(async () => {
    const projects = await repositories.projectsRepository.findAll();

    const projectsTable = new CliTable<Project>(2);
    projectsTable.addColumn({ header: "Project", format: (project) => project.name });
    projectsTable.addColumn({ header: "Category", format: (project) => project.categoryId.toString() });
    projectsTable.addColumn({ header: "Weight", format: (project) => project.weight.toString(), align: "center" });
    projectsTable.addColumn({ header: "Description", format: (project) => project.description });
    projectsTable.setData(projects);
    console.log(projectsTable.toString());
  });

projectsCommand
  .command("add")
  .alias("a")
  .description("Add a new project")
  .action(async () => {
    const categories = await services.categoryService.listCategories();
    const project = await prompts([
      { type: "text", name: "name", message: "Enter project name:" },
      {
        type: "text",
        name: "description",
        message: "Enter project description:",
      },
      {
        type: "select",
        name: "categoryId",
        message: "Select project category:",
        choices: categories.map((cat) => ({ title: cat.name, value: cat.name })),
      },
      {
        type: "number",
        name: "weight",
        message: "Enter project weight (0-5):",
        validate: (value) => value >= 0 && value <= 5,
        initial: 1,
      },
    ]);
    await repositories.projectsRepository.create(project);
  });

projectsCommand
  .command("modify")
  .alias("m")
  .description("Modify a project")
  .argument("<id>", "Project ID")
  .action(async (id: string) => {
    const projects = await repositories.projectsRepository.findAll();
    const fieldToEdit = await prompts([
      {
        type: "autocomplete",
        name: "field",
        message: "Which Project to edit?",
        choices: projects.map((project) => ({ title: project.name, value: project.id })),
      },
      {
        type: "select",
        name: "field",
        message: "Select field to edit:",
        choices: [
          { title: "Name", value: "name" },
          { title: "Description", value: "description" },
          { title: "Category", value: "categoryId" },
          { title: "Weight", value: "weight" },
        ],
      },
    ]);

    const projectSelected = projects.find((project) => project.id === Number(id));

    if (!projectSelected) {
      console.log("Project not found.");
      return;
    }

    const fieldValue = await prompts([
      { type: "text", name: "value", message: `Enter new value for ${fieldToEdit.field}:` },
    ]);

    await repositories.projectsRepository.update(Number(id), {
      ...projectSelected,
      [fieldToEdit.field]: fieldValue.value,
    });
  });

projectsCommand
  .command("remove")
  .alias("rm")
  .description("Remove a project")
  .argument("<id>", "Project ID")
  .action(async (id: string) => {
    await repositories.projectsRepository.delete(Number(id));
  });

program
  .command("serve")
  .description("Start the REST API server")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action(async (options) => {
    try {
      const port = parseInt(options.port);
      const { server, container } = await createServer(port);

      process.on("SIGINT", () => {
        console.log("\nShutting down server...");
        server.close();
        container.client.close();
        process.exit(0);
      });
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  });

services.todoService
  .initializeDatabase()
  .then(() => {
    program.parse();
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
