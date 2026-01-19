"use client"

export default function TransactionTable({ txn }: { txn: any }) {
  return <div>{JSON.stringify(txn)}</div>
}
