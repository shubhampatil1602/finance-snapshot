import type { ActionState } from "./types"

/** `true` when the server rejected this field, else `undefined` so `data-invalid`/`aria-invalid` are omitted. */
export function fieldInvalid(state: ActionState, name: string): true | undefined {
  return state.fieldErrors?.[name] ? true : undefined
}
