import { cn } from "@kitchencloud/ui"

interface PriceProps {
  amount: number
  currency?: string
  className?: string
  originalAmount?: number
}

export function Price({ amount, currency = "SGD", className, originalAmount }: PriceProps) {
  const formattedAmount = new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
  }).format(amount)

  const formattedOriginal = originalAmount
    ? new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency,
      }).format(originalAmount)
    : null

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-semibold">{formattedAmount}</span>
      {formattedOriginal && (
        <span className="text-sm text-muted-foreground line-through">
          {formattedOriginal}
        </span>
      )}
    </div>
  )
}