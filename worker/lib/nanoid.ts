import { customAlphabet } from 'nanoid'

const SAMPLES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export default customAlphabet(SAMPLES, 20)
