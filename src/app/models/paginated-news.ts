import { News } from "./news";

export interface PaginatedNews {
  items: News[];
  total: number;
}