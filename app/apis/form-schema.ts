import { request } from '@/apis/http'
import type { FormSchema } from '../../worker/bindings'

export async function getFormSchema(ledgerId: string) {
    return await request<FormSchema>(`/api/ledgers/${ledgerId}/forms/schema`)
}
