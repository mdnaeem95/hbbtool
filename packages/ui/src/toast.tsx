"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, XCircle, AlertCircle, Info, ShoppingCart } from "lucide-react"
import { cn } from "./lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen flex-col-reverse p-4",
      "sm:bottom-auto sm:right-0 sm:top-0 sm:flex-col",
      "md:max-w-[420px]", // Compact width
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex items-start gap-3 overflow-hidden",
    "w-full max-w-sm rounded-lg border p-4 pr-10 shadow-2xl",
    "backdrop-blur-sm transition-all duration-300",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
    "data-[state=closed]:slide-out-to-right-full",
    "hover:shadow-xl hover:scale-[1.02]"
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-white border-gray-200 text-gray-900",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-orange-500/10 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ),
        success: cn(
          "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-900",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-400/20 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ),
        destructive: cn(
          "bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-900",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-400/20 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ),
        warning: cn(
          "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-yellow-400/20 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ),
        info: cn(
          "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-900",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-400/20 before:to-transparent before:opacity-0",
          "hover:before:opacity-100 before:transition-opacity before:duration-300"
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Icon component to display based on variant
const ToastIcon = ({ variant, className }: { variant?: string; className?: string }) => {
  const iconClass = cn("h-5 w-5 shrink-0", className)
  
  switch (variant) {
    case "success":
      return <CheckCircle2 className={cn(iconClass, "text-green-600 animate-in zoom-in duration-300")} />
    case "destructive":
      return <XCircle className={cn(iconClass, "text-red-600 animate-in zoom-in duration-300")} />
    case "warning":
      return <AlertCircle className={cn(iconClass, "text-yellow-600 animate-in zoom-in duration-300")} />
    case "info":
      return <Info className={cn(iconClass, "text-blue-600 animate-in zoom-in duration-300")} />
    default:
      return <ShoppingCart className={cn(iconClass, "text-orange-600 animate-in zoom-in duration-300")} />
  }
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      showIcon?: boolean
    }
>(({ className, variant, showIcon = true, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {showIcon && (
        <div className="relative z-10">
          <ToastIcon variant={variant as string} />
        </div>
      )}
      <div className="relative z-10 flex-1">{children}</div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "relative z-10 inline-flex h-8 shrink-0 items-center justify-center",
      "rounded-md border border-gray-200 bg-white px-3",
      "text-sm font-medium text-gray-900",
      "ring-offset-white transition-all duration-200",
      "hover:bg-gray-100 hover:border-gray-300 hover:scale-105",
      "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-red-200 group-[.destructive]:hover:bg-red-100",
      "group-[.success]:border-green-200 group-[.success]:hover:bg-green-100",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 z-10 rounded-md p-1.5",
      "text-gray-500 opacity-70 transition-all duration-200",
      "hover:opacity-100 hover:bg-gray-100 hover:text-gray-900 hover:scale-110",
      "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400",
      "group-hover:opacity-100",
      "group-[.destructive]:text-red-500 group-[.destructive]:hover:bg-red-100",
      "group-[.success]:text-green-500 group-[.success]:hover:bg-green-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90 mt-0.5 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}