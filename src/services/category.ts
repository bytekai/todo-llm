import { Category } from "../types.js";
import { CategoryRepository } from "../repositories/category.js";

export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async listCategories(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async getCategory(name: string): Promise<Category | null> {
    return this.categoryRepository.findByName(name);
  }

  async createCategory(name: string, weight: number): Promise<void> {
    if (weight < 0 || weight > 5) {
      throw new Error("Weight must be between 0 and 5");
    }

    const existing = await this.categoryRepository.findByName(name);
    if (existing) {
      throw new Error(`Category '${name}' already exists`);
    }

    await this.categoryRepository.create({
      name,
      weight,
    });
  }

  async updateCategory(name: string, updates: Partial<Category>): Promise<boolean> {
    const category = await this.categoryRepository.findByName(name);
    if (!category) {
      throw new Error(`Category '${name}' not found`);
    }

    if (updates.weight !== undefined && (updates.weight < 0 || updates.weight > 5)) {
      throw new Error("Weight must be between 0 and 5");
    }

    if (updates.name && updates.name !== name) {
      const existing = await this.categoryRepository.findByName(updates.name);
      if (existing) {
        throw new Error(`Category '${updates.name}' already exists`);
      }
    }

    return this.categoryRepository.update(name, updates);
  }

  async deleteCategory(name: string): Promise<boolean> {
    const todoCount = await this.categoryRepository.getTodoCount(name);
    if (todoCount > 0) {
      throw new Error(`Cannot delete category '${name}' because it has ${todoCount} todo(s)`);
    }

    return this.categoryRepository.delete(name);
  }

  async updateCategoryWeight(name: string, weight: number): Promise<boolean> {
    if (weight < 0 || weight > 5) {
      throw new Error("Weight must be between 0 and 5");
    }

    return this.categoryRepository.updateWeight(name, weight);
  }
}
