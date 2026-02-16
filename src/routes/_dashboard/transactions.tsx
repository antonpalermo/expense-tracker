import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import TransactionDialog from "@/components/transaction-dialog"

export const Route = createFileRoute("/_dashboard/transactions")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div>
      <div className="w-full flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Transaction</Button>
          </DialogTrigger>
          <TransactionDialog />
        </Dialog>
      </div>
    </div>
  )
}
