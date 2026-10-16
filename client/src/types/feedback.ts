export enum FeedbackTone {
  Neutral = 'neutral',
  Success = 'success',
  Error = 'error',
}

export interface Feedback {
  tone: FeedbackTone.Success | FeedbackTone.Error;
  message: string;
  /** Technical detail (usually an English server message), rendered isolated from the surrounding text. */
  detail?: string;
}
