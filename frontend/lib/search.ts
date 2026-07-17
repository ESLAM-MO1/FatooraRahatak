import api from "./api";

export interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string | null;
  link: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const response = await api.get("/search", { params: { q: query } });
  return response.data.data.results;
}