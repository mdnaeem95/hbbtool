import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "KitchenCloud - Sign In",
  description: "Order delicious home-cooked meals from local home-based businesses",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo - visible on all screens */}
          <div className="text-center lg:text-left">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-orange-600">KitchenCloud</h1>
            </Link>
            <p className="mt-2 text-sm text-gray-600">
              Singapore's home-based F&B platform
            </p>
          </div>
          
          {/* Auth form content will be injected here */}
          {children}
        </div>
      </div>
      
      {/* Right Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-400 to-orange-600 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12 w-full">
          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Start selling your homemade food today
            </h2>
            <p className="text-lg text-orange-50 mb-8">
              Join hundreds of home-based businesses already thriving on KitchenCloud
            </p>
            
            {/* Features */}
            <div className="space-y-4">
              <FeatureItem 
                icon="✨" 
                title="Zero Commission" 
                description="Keep 100% of your earnings"
              />
              <FeatureItem 
                icon="📱" 
                title="WhatsApp Orders" 
                description="Receive orders directly to WhatsApp"
              />
              <FeatureItem 
                icon="🚀" 
                title="Quick Setup" 
                description="Start selling in under 5 minutes"
              />
              <FeatureItem 
                icon="🇸🇬" 
                title="Made for Singapore" 
                description="PayNow, GrabExpress integrated"
              />
            </div>
            
            {/* Social proof */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-2">
                  {['👩‍🍳', '👨‍🍳', '👩‍🍳', '👨‍🍳'].map((emoji, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-white/30"
                    >
                      <span className="text-lg">{emoji}</span>
                    </div>
                  ))}
                </div>
                <p className="text-orange-50 text-sm">
                  <span className="font-bold text-white">500+</span> active merchants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Feature component
function FeatureItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: string
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <p className="text-white font-semibold">{title}</p>
        <p className="text-orange-100 text-sm">{description}</p>
      </div>
    </div>
  )
}