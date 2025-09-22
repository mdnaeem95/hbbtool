# @homejiak/ui

Shared UI component library for HomeJiak applications.

## Components

This package provides a set of accessible, customizable UI components built with:
- Radix UI primitives
- Tailwind CSS
- TypeScript
- React 18

### Available Components

- **Button** - Primary interactive element with multiple variants
- **Card** - Container component with header, content, and footer sections
- **Dialog** - Modal dialog with overlay
- **Form** - Form utilities with label association and validation states
- **Input** - Text input with consistent styling
- **Label** - Accessible form labels
- **Toast** - Notification system with toast messages
- **Spinner** - Loading indicators
- **Skeleton** - Loading placeholders

## Installation

This package is part of the HomeJiak monorepo and is automatically available to other packages.

```bash
# From the root of the monorepo
pnpm install
```

## Usage

### Importing Components

```tsx
import { Button, Card, Input, useToast } from "@homejiak/ui"
```

### Importing Styles

In your app's main CSS file or layout:

```css
@import "@homejiak/ui/globals.css";
```

### Example Usage

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from "@homejiak/ui"

export function ProductCard() {
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Nasi Lemak</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Traditional coconut rice with sambal</p>
        <Button className="mt-4">Order Now</Button>
      </CardContent>
    </Card>
  )
}
```

### Using Toast Notifications

```tsx
import { Button, useToast } from "@homejiak/ui"

export function OrderButton() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: "Order Placed!",
          description: "Your order has been confirmed.",
        })
      }}
    >
      Place Order
    </Button>
  )
}
```

Don't forget to add the `<Toaster />` component to your app layout:

```tsx
import { Toaster } from "@homejiak/ui"

export function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

## Customization

### Tailwind Configuration

The components use CSS custom properties for theming. You can override these in your app:

```css
:root {
  --primary: 15 86% 61%; /* Your custom primary color */
  --secondary: 261 51% 60%; /* Your custom secondary color */
}
```

### Component Variants

Most components support variants via the `className` prop:

```tsx
<Button variant="outline" size="sm">
  Small Outline Button
</Button>

<Card className="border-primary shadow-lg">
  Custom styled card
</Card>
```

## Development

### Building the Package

```bash
# From packages/ui directory
pnpm build
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Design Tokens

The UI package follows HomeJiak's design system:

- **Colors**: Warm orange primary (#FF6B35), Deep purple secondary (#5D3FD3)
- **Typography**: Inter for UI, Playfair Display for headings
- **Spacing**: 4px base unit with scale (4, 8, 12, 16, 24, 32, 48, 64)
- **Border Radius**: 0.5rem default
- **Animations**: 200ms micro, 300ms macro interactions

## Accessibility

All components are built with accessibility in mind:
- Keyboard navigation support
- ARIA attributes
- Focus management
- Screen reader friendly
- Reduced motion support