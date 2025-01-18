import { Client } from "@libsql/client";
import { Category } from "../types.js";
import { InValue } from "@libsql/client";

export class CategoryRepository {
  constructor(private db: Client) {}

  async findAll(): Promise<Category[]> {
    const result = await this.db.execute("SELECT * FROM categories ORDER BY name");
    return result.rows as unknown as Category[];
  }

  async findByName(name: string): Promise<Category | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM categories WHERE name = ?",
      args: [name],
    });
    return (result.rows[0] as unknown as Category) || null;
  }

  async create(category: Category): Promise<void> {
    await this.db.execute({
      sql: "INSERT INTO categories (name, weight) VALUES (?, ?)",
      args: [category.name, category.weight],
    });
  }

  async update(name: string, category: Partial<Category>): Promise<boolean> {
    const fields = Object.keys(category).filter((field) => category[field as keyof Category] !== undefined);
    if (fields.length === 0) return false;

    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => category[field as keyof Category]) as InValue[];

    const result = await this.db.execute({
      sql: `UPDATE categories SET ${setClause} WHERE name = ?`,
      args: [...values, name],
    });
    return result.rowsAffected > 0;
  }

  async delete(name: string): Promise<boolean> {
    const result = await this.db.execute({
      sql: "DELETE FROM categories WHERE name = ?",
      args: [name],
    });
    return result.rowsAffected > 0;
  }

  async updateWeight(name: string, weight: number): Promise<boolean> {
    return this.update(name, { weight });
  }

  async initializeTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY,
        weight REAL NOT NULL
      )
    `);
  }

  async getTodoCount(name: string): Promise<number> {
    const result = await this.db.execute({
      sql: "SELECT COUNT(*) as count FROM todos WHERE category = ?",
      args: [name],
    });
    return (result.rows[0] as unknown as { count: number }).count;
  }
}
