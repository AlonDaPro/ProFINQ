/** Position after which the next page starts, in the list's (savedAt DESC, id DESC) order. */
export interface PageCursor {
  savedAt: string;
  id: string;
}

export interface Page<T> {
  items: T[];
  /** `null` on the last page. */
  nextCursor: PageCursor | null;
}

export interface PageRequest {
  limit: number;
  after?: PageCursor;
}
