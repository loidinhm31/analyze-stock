import type { Category } from "@/types";

/**
 * Category service interface
 */
export interface ICategoryService {
  /**
   * Get all categories
   */
  getCategories(): Promise<Category[]>;
}
