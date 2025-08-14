import { cn } from "@kitchencloud/ui"
import { Check } from "lucide-react"

interface CheckoutStepsProps {
  currentStep: 'delivery' | 'contact' | 'payment'
}

const steps = [
  { id: 'delivery', name: 'Delivery', description: 'Choose delivery method' },
  { id: 'contact', name: 'Contact', description: 'Your information' },
  { id: 'payment', name: 'Payment', description: 'Complete payment' },
]

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li 
            key={step.name} 
            className={cn(
              stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '',
              'relative'
            )}
          >
            {stepIdx < currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <Check className="h-5 w-5 text-white" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : stepIdx === currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            )}
            <span className="absolute top-10 -left-2 sm:left-0 text-xs sm:text-sm">
              <span className="font-medium block">{step.name}</span>
              <span className="text-muted-foreground hidden sm:block">{step.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}