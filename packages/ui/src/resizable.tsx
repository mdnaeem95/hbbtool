'use client'

import * as React from 'react'
import {
  PanelGroup as ResizablePanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle as ResizableHandle,
} from 'react-resizable-panels'
import { cn } from "@kitchencloud/ui"

// Optional wrappers to apply consistent styles
function KCResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePanelGroup>) {
  return <ResizablePanelGroup className={cn('w-full h-full', className)} {...props} />
}

function KCResizablePanel(props: React.ComponentProps<typeof ResizablePanel>) {
  return <ResizablePanel {...props} />
}

function KCResizableHandle({
  className,
  ...props
}: React.ComponentProps<typeof ResizableHandle>) {
  return (
    <ResizableHandle
      className={cn(
        'relative flex w-px items-center justify-center bg-border',
        'after:absolute after:h-10 after:w-1 after:rounded-sm after:bg-muted-foreground/40',
        className
      )}
      {...props}
    />
  )
}

export {
  KCResizablePanelGroup as ResizablePanelGroup,
  KCResizablePanel as ResizablePanel,
  KCResizableHandle as ResizableHandle,
}
