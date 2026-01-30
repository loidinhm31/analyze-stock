import { invoke } from "@tauri-apps/api/core";
import type { ICategoryService } from "@/adapters/interfaces";
import type { Category } from "@/types";

/**
 * Tauri adapter for category operations using invoke() calls
 */
export class TauriCategoryAdapter implements ICategoryService {
  async getCategories(): Promise<Category[]> {
    return invoke("get_categories");
  }
}
