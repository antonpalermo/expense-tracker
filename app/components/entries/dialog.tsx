import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import type { ReactNode } from "react"
import type { Dialog as BaseDialog } from "@base-ui/react"

export type EntryDialogProps<T> = {
    header: { title: string; description?: string }
    children: ReactNode
    handler: BaseDialog.Handle<T>
}

export default function EntryDialog<T>({
    header,
    children,
    handler
}: EntryDialogProps<T>) {
    return (
        <Dialog handle={handler}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{header.title}</DialogTitle>
                    <DialogDescription>{header.description}</DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    )
}
