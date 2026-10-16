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

/** Narrows the list. Every word must appear in the full name (any order, case and accents ignored). */
export interface ListFilter {
  nameWords: readonly string[];
  country?: string;
}

export interface PageRequest {
  limit: number;
  after?: PageCursor;
  filter: ListFilter;
}
