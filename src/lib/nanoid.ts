import { customAlphabet } from "nanoid"

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

export function nanoid(size?: number) {
  return customAlphabet(alphabet, size)
}
