import { cn } from "@kitchencloud/ui"
import { Check, Truck, User, CreditCard } from "lucide-react"

interface CheckoutStepsProps {
  currentStep: 'delivery' | 'contact' | 'payment'
}

const steps = [
  { id: 'delivery', name: 'Delivery', icon: Truck },
  { id: 'contact', name: 'Contact', icon: User },
  { id: 'payment', name: 'Payment', icon: CreditCard },
]

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  
  return (
    <>
      {/* Desktop Progress */}
      <div className="hidden md:flex items-center justify-center mb-8">
        <div className="flex items-center gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = currentStepIndex >= idx
            const isCompleted = currentStepIndex > idx
            
            return (
              <div key={step.id} className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isActive 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" 
                      : "bg-slate-100 text-slate-400"
                  )}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium transition-colors",
                    isActive ? "text-slate-900" : "text-slate-400"
                  )}>
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 transition-colors",
                    isCompleted ? "bg-orange-500" : "bg-slate-200"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="md:hidden mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-900">
            Step {currentStepIndex + 1} of 3: {steps[currentStepIndex]?.name}
          </span>
          <span className="text-xs text-slate-500">
            {Math.round(((currentStepIndex + 1) / 3) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}