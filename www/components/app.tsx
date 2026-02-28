import * as React from "react"

export default function App() {
  const [count, setCount] = React.useState(0)

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(current => current + 1)}>
        increment
      </button>
    </div>
  )
}
