import { Todo } from "../types.js";
import { Client } from "@libsql/client";

export class TodoRepository {
  constructor(private db: Client) {}

  async initializeDependenciesTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS todo_dependencies (
        todo_id INTEGER NOT NULL,
        depends_on_id INTEGER NOT NULL,
        PRIMARY KEY (todo_id, depends_on_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_id) REFERENCES todos(id) ON DELETE CASCADE
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS todo_dependencies (
        todo_id INTEGER NOT NULL,
        depends_on_id INTEGER NOT NULL,
        PRIMARY KEY (todo_id, depends_on_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_id) REFERENCES todos(id) ON DELETE CASCADE
      )
    `);
  }

  async create(todo: Omit<Todo, "id">): Promise<number> {
    const result = await this.db.batch([
      {
        sql: `INSERT INTO todos (text, category, priority, timeRequired, value, deadline, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          todo.text,
          todo.category,
          todo.priority,
          todo.timeRequired,
          todo.value,
          todo.deadline ?? null,
          todo.createdAt,
        ],
      },
    ]);

    const lastInsertRowid = result.at(-1)?.lastInsertRowid;

    if (!lastInsertRowid) {
      throw new Error("Failed to create todo");
    }

    todo.dependencies && (await this.addDependencies(Number(lastInsertRowid), todo.dependencies));

    return Number(lastInsertRowid);
  }

  async addDependencies(todoId: number, dependsOnIds: number[]): Promise<void> {
    await this.db.batch(
      dependsOnIds.map((id) => ({
        sql: `INSERT INTO todo_dependencies (todo_id, depends_on_id) VALUES (?, ?)`,
        args: [todoId, id],
      }))
    );
  }

  async getDependencies(todoId: number): Promise<number[]> {
    const result = await this.db.execute({
      sql: "SELECT depends_on_id FROM todo_dependencies WHERE todo_id = ?",
      args: [todoId],
    });
    return result.rows.map((row) => (row as any).depends_on_id);
  }

  async findAll(category?: string): Promise<Todo[]> {
    const projects = await this.db.execute("SELECT * FROM projects");

    const query = `
SELECT 
    t.*,
    GROUP_CONCAT(d.depends_on_id ORDER BY d.depends_on_id) AS dependencies
FROM todos t 
JOIN categories c ON t.category = c.name
LEFT JOIN todo_dependencies d ON t.id = d.todo_id
WHERE t.completed = 0 
    ${category ? "AND t.category = ?" : ""}
GROUP BY t.id
    `;

    const result = await this.db.execute({
      sql: query,
      args: category ? [category] : [],
    });

    for (const row of result.rows) {
      //@ts-expect-error
      row.dependencies = row.dependencies?.split(",").map((id) => parseInt(id)) || [];
      //@ts-expect-error
      row.project = projects.rows.find((project) => project.id === row.projectId);
    }

    const todos = result.rows as unknown as Todo[];

    return todos;
  }

  async findById(id: number): Promise<Todo | null> {
    const result = await this.db.execute({
      sql: `SELECT t.*
            FROM todos t 
            JOIN categories c ON t.category = c.name
            WHERE t.id = ?`,
      args: [id],
    });

    const todo = result.rows[0] as unknown as Todo | undefined;
    if (todo) {
      todo.dependencies = await this.getDependencies(todo.id);
    }

    return todo || null;
  }

  async markComplete(id: number): Promise<boolean> {
    const result = await this.db.execute({
      sql: "UPDATE todos SET completed = 1 WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async initializeTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        priority INTEGER NOT NULL,
        timeRequired REAL NOT NULL DEFAULT 1,
        value INTEGER NOT NULL,
        deadline INTEGER,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (category) REFERENCES categories(name)
      )
    `);
  }

  async runMigrations(): Promise<void> {
    await this.initMigrationTable();
    const existingMigrations = await this.getMigrations();
    const migrations = [
      {
        name: "addProjectRelation",
        sql: [`ALTER TABLE todos ADD COLUMN projectId INTEGER REFERENCES projects(id) ON DELETE CASCADE`],
      },
    ];
    const migrationsToRun = migrations.filter((migration) => !existingMigrations.includes(migration.name));

    for (const migration of migrationsToRun) {
      await this.db.batch([
        ...migration.sql,
        {
          sql: "INSERT INTO migrations (name, appliedAt) VALUES (?, ?)",
          args: [migration.name, new Date().getTime()],
        },
      ]);
    }
  }

  async getMigrations(): Promise<string[]> {
    const result = await this.db.execute("SELECT name FROM migrations");
    return result.rows.map((row) => (row as any).name);
  }

  async initMigrationTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        appliedAt INTEGER NOT NULL
      )
    `);
  }

  async addTimeRequiredColumn(): Promise<void> {
    try {
      await this.db.execute("ALTER TABLE todos ADD COLUMN timeRequired REAL NOT NULL DEFAULT 1");
    } catch (err: any) {
      if (!err.message.includes("duplicate column")) {
        throw err;
      }
    }
  }

  async updateDefaultTimeRequired(): Promise<void> {
    await this.db.execute("UPDATE todos SET timeRequired = 1 WHERE timeRequired IS NULL OR timeRequired = 0");
  }

  async update(id: number, todo: Partial<Omit<Todo, "id" | "weight">>): Promise<boolean> {
    const fields = Object.keys(todo);
    if (fields.length === 0) return false;

    const { setClause, values } = dynamicUpdateSetClause(todo, [
      "text",
      "category",
      "priority",
      "timeRequired",
      "value",
      "deadline",
      "projectId",
    ]);

    const result = await this.db.execute({
      sql: `UPDATE todos SET ${setClause} WHERE id = ?`,
      args: [...values, id],
    });
    return result.rowsAffected > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.execute({
      sql: "DELETE FROM todos WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async addDeadlineColumn(): Promise<void> {
    try {
      await this.db.execute("ALTER TABLE todos ADD COLUMN deadline INTEGER");
    } catch (err: any) {
      if (!err.message.includes("duplicate column")) {
        throw err;
      }
    }
  }
}

function dynamicUpdateSetClause(data: { [key: string]: any }, allowedFields: string[]) {
  const fields = Object.keys(data).filter((field) => allowedFields.includes(field));
  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const values = fields.map((field) => data[field as keyof typeof data]);
  return { setClause, values };
}
