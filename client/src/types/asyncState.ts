export enum AsyncStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

/** A discriminated union: `message` exists exactly when the status is Error. */
export type AsyncState =
  | { readonly status: AsyncStatus.Idle }
  | { readonly status: AsyncStatus.Loading }
  | { readonly status: AsyncStatus.Success }
  | { readonly status: AsyncStatus.Error; readonly message: string };

export const IDLE: AsyncState = { status: AsyncStatus.Idle };
export const LOADING: AsyncState = { status: AsyncStatus.Loading };
export const SUCCESS: AsyncState = { status: AsyncStatus.Success };

export function failed(message: string): AsyncState {
  return { status: AsyncStatus.Error, message };
}
