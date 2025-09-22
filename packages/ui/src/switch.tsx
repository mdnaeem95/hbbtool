"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@homejiak/ui"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Size and layout
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        // Transitions
        "transition-colors duration-200 ease-in-out",
        // Focus styles
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // OFF state (unchecked)
        "data-[state=unchecked]:bg-gray-300",
        // ON state (checked) 
        "data-[state=checked]:bg-orange-600",
        // Hover effects
        "hover:data-[state=unchecked]:bg-gray-400 hover:data-[state=checked]:bg-orange-700",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Base thumb styling
          "pointer-events-none block h-5 w-5 rounded-full bg-white ring-0",
          // Transitions
          "transition-transform duration-200 ease-in-out",
          // Transform positions
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5",
          // Shadow for visibility
          "shadow-lg drop-shadow-sm"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }