const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
})

export function formatCurrency(amount: number) {
    return formatter.format(amount)
}
