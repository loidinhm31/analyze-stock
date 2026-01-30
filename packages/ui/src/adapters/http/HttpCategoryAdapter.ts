import { HttpAdapter } from "./HttpAdapter";
import type { ICategoryService } from "@/adapters/interfaces";
import type { Category } from "@/types";

/**
 * HTTP adapter for category operations
 */
export class HttpCategoryAdapter
  extends HttpAdapter
  implements ICategoryService
{
  async getCategories(): Promise<Category[]> {
    return this.get<Category[]>("/categories");
  }
}
