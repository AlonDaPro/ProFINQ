/** A message under one form input. */
export interface FieldMessage {
  text: string;
  /** Untranslated detail (the server's English message), isolated so the RTL text cannot reorder it. */
  detail?: string;
}
