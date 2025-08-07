import * as React from "react"
import { cn } from "./lib/utils"

interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | string
  currency?: string
  locale?: string
  showCurrency?: boolean
  size?: "sm" | "md" | "lg"
  originalPrice?: number | string
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg font-semibold",
}

export function Price({
  amount,
  currency = "SGD",
  locale = "en-SG",
  showCurrency = true,
  size = "md",
  originalPrice,
  className,
  ...props
}: PriceProps) {
  const formatPrice = (value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value
    
    if (isNaN(numValue)) {
      return "0.00"
    }

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    return formatter.format(numValue)
  }

  const formattedPrice = formatPrice(amount)
  const formattedOriginalPrice = originalPrice ? formatPrice(originalPrice) : null

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)} {...props}>
      {formattedOriginalPrice && (
        <span className={cn("text-muted-foreground line-through", sizeClasses[size])}>
          {showCurrency && <span className="text-xs">{currency}</span>}
          {formattedOriginalPrice}
        </span>
      )}
      <span className={cn(sizeClasses[size], formattedOriginalPrice && "text-destructive")}>
        {showCurrency && <span className="text-sm">{currency} </span>}
        {formattedPrice}
      </span>
    </span>
  )
}

interface PriceRangeProps extends React.HTMLAttributes<HTMLSpanElement> {
  min: number | string
  max: number | string
  currency?: string
  locale?: string
  size?: "sm" | "md" | "lg"
}

export function PriceRange({
  min,
  max,
  currency = "SGD",
  locale = "en-SG",
  size = "md",
  className,
  ...props
}: PriceRangeProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)} {...props}>
      <Price amount={min} currency={currency} locale={locale} size={size} />
      <span className={cn("text-muted-foreground", sizeClasses[size])}>-</span>
      <Price amount={max} currency={currency} locale={locale} size={size} showCurrency={false} />
    </span>
  )
}