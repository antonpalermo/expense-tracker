import { useEffect, useState } from "react"

export function App() {
  const [msg, setMsg] = useState({})

  useEffect(() => {
    async function getMsg() {
      const req = await fetch("/msg")

      if (!req.ok) {
        setMsg({ msg: "unable to fetch" })
      }

      const res = await req.json()
      setMsg(res)
    }

    getMsg()
  }, [])

  return (
    <div>
      <pre>{JSON.stringify(msg, null, 2)}</pre>
    </div>
  )
}
