import { cn } from '@kitchencloud/ui'
import { LucideIcon, Check } from 'lucide-react'

interface Step {
  id: string
  label: string
  icon: LucideIcon
}

interface CheckoutStepsProps {
  currentStep: string
  steps: Step[]
}

export function CheckoutSteps({ currentStep, steps }: CheckoutStepsProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep)
  
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-0 top-5 h-0.5 w-full bg-gray-200">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isUpcoming = index > currentIndex
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted && "border-primary bg-primary text-white",
                  isCurrent && "border-primary bg-white text-primary",
                  isUpcoming && "border-gray-300 bg-white text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  (isCompleted || isCurrent) && "text-gray-900",
                  isUpcoming && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}