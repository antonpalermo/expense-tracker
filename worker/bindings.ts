export type Bindings = {
    Bindings: CloudflareBindings
}

export type Field =
    | {
          uid: string
          name: string
      }
    | {
          type: "number"
          default: number
      }
    | {
          type: "text"
          default: string
      }
