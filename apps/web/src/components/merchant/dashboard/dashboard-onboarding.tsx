import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle, HelpCircle, SkipForward } from 'lucide-react'

// This component overlays on TOP of your existing dashboard
export const DashboardOnboarding = ({ onComplete, onSkip, dashboardData }: { 
  onComplete: () => void
  onSkip: () => void
  dashboardData?: any
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)

  // Tour steps that highlight actual dashboard sections
  const tourSteps = [
    {
      id: 'welcome',
      title: `Welcome to KitchenCloud, ${dashboardData?.merchant?.businessName || 'Chef'}!`,
      description: "Your dashboard is your command center. Let me show you around - this will only take 2 minutes.",
      target: null,
      placement: 'center',
      highlight: null
    },
    {
      id: 'stats',
      title: "Your Business Metrics",
      description: "Track your revenue, orders, and growth at a glance. These numbers update in real-time as orders come in.",
      target: '[data-tour="dashboard-stats"]',
      placement: 'bottom',
      highlight: true
    },
    {
      id: 'orders',
      title: "Recent Orders",
      description: "New orders appear here instantly. You can update order status, print receipts, and contact customers directly.",
      target: '[data-tour="recent-orders"]',
      placement: 'top',
      highlight: true
    },
    {
      id: 'quick-stats',
      title: "Quick Performance Indicators",
      description: "Monitor completion rates, preparation times, and customer ratings. Green means you're doing great!",
      target: '[data-tour="quick-stats"]',
      placement: 'bottom',
      highlight: true
    },
    {
      id: 'products',
      title: "Popular Products",
      description: "See what's selling best. Click any product to edit details, update stock, or change pricing instantly.",
      target: '[data-tour="popular-products"]',
      placement: 'top',
      highlight: true
    },
    {
      id: 'navigation',
      title: "Navigation Menu",
      description: "Access all features from the sidebar: Products, Orders, Customers, Analytics, and Settings.",
      target: '[data-tour="sidebar"]',
      placement: 'right',
      highlight: true
    },
    {
      id: 'complete',
      title: "You're Ready to Roll! 🎉",
      description: "Your dashboard is set up and ready. Let's add your first product to start receiving orders!",
      target: null,
      placement: 'center',
      highlight: null
    }
  ]

  const currentStepData = tourSteps[currentStep]

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMinimized(true)
      } else if (e.key === 'ArrowRight' && currentStep < tourSteps.length - 1) {
        setCurrentStep(prev => prev + 1)
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentStep])

  // Apply highlight effect
  useEffect(() => {
    if (currentStepData?.highlight && currentStepData?.target) {
      const element = document.querySelector(currentStepData.target)
      if (element) {
        element.classList.add('onboarding-highlight')
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    return () => {
      // Clean up highlights
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight')
      })
    }
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (window.confirm('Skip the tour? You can always restart it from the help menu.')) {
      onSkip()
    }
  }

  // Calculate position for tooltip
  const getTooltipPosition = () => {
    if (!currentStepData?.target || currentStepData.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001
      }
    }

    const element = document.querySelector(currentStepData.target)
    if (!element) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001
      }
    }

    const rect = element.getBoundingClientRect()
    const tooltipWidth = 400
    const tooltipHeight = 200
    const offset = 20

    let style: any = {
      position: 'fixed',
      zIndex: 10001
    }

    switch (currentStepData.placement) {
      case 'top':
        style.bottom = `${window.innerHeight - rect.top + offset}px`
        style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        break
      case 'bottom':
        style.top = `${rect.bottom + offset}px`
        style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`
        break
      case 'left':
        style.right = `${window.innerWidth - rect.left + offset}px`
        style.top = `${rect.top + rect.height / 2 - tooltipHeight / 2}px`
        break
      case 'right':
        style.left = `${rect.right + offset}px`
        style.top = `${rect.top + rect.height / 2 - tooltipHeight / 2}px`
        break
    }

    // Keep tooltip on screen
    if (style.left && parseInt(style.left) < 10) style.left = '10px'
    if (style.right && parseInt(style.right) < 10) style.right = '10px'
    if (style.top && parseInt(style.top) < 10) style.top = '10px'
    if (style.bottom && parseInt(style.bottom) < 10) style.bottom = '10px'

    return style
  }

  // Minimized state - floating help button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:scale-110 transition-all z-50 group"
      >
        <HelpCircle className="h-6 w-6" />
        <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Resume Tour
        </span>
      </button>
    )
  }

  return (
    <>
      {/* Dark overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9999] transition-opacity"
        onClick={() => setIsMinimized(true)}
      />
      
      {/* Spotlight effect for highlighted elements */}
      {currentStepData?.highlight && (
        <div>
          <style>{`
            .onboarding-highlight {
              position: relative !important;
              z-index: 10000 !important;
              box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.5),
                          0 0 0 8px rgba(251, 146, 60, 0.25),
                          0 0 0 10000px rgba(0, 0, 0, 0.4);
              border-radius: 8px;
              animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
              0%, 100% {
                box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.5),
                            0 0 0 8px rgba(251, 146, 60, 0.25),
                            0 0 0 10000px rgba(0, 0, 0, 0.4);
              }
              50% {
                box-shadow: 0 0 0 8px rgba(251, 146, 60, 0.5),
                            0 0 0 16px rgba(251, 146, 60, 0.25),
                            0 0 0 10000px rgba(0, 0, 0, 0.4);
              }
            }
          `}</style>
        </div>
      )}

      {/* Tour tooltip */}
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        style={getTooltipPosition()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 rounded-t-xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {currentStepData?.title}
              </h3>
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {tourSteps.length}
              </p>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Minimize (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-700 mb-6">
            {currentStepData?.description}
          </p>

          {/* Special content for last step */}
          {currentStep === tourSteps.length - 1 && (
            <div className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 text-orange-700">
                <Sparkles className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Pro tip: Add at least 3 products to make your store look established!
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 text-sm transition-colors flex items-center gap-1"
            >
              <SkipForward className="h-3 w-3" />
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-purple-700 transition-all flex items-center gap-1"
              >
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    Complete Tour
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Tip: Use ← → arrow keys to navigate • ESC to minimize
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardOnboarding