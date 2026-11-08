export interface PageRequest {
  limit: number;
  cursor?: string | undefined;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
}
