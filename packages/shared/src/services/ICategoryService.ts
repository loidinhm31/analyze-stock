import type { Category } from "../types";

export interface ICategoryService {
  getCategories(): Promise<Category[]>;
}
