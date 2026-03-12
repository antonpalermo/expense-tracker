import EntryForm from "@client/components/entry/form"
import Entries from "@client/components/entries"
import { Button } from "@client/components/ui/button"

export default function App() {
  return (
    <div>
      <EntryForm />
      <Entries />
      <Button>Sample</Button>
    </div>
  )
}
