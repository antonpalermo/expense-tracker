import * as React from "react"

export default function App() {
    const [msg, setMsg] = React.useState("")

    React.useEffect(() => {
        async function getMsg() {
            const res = await fetch("/api/health")

            if (!res) {
                throw new Error("unable to resolve")
            }

            const data = await res.json()

            setMsg(data.msg)
        }

        getMsg()
    }, [])

    return <h1>sample {msg}</h1>
}
