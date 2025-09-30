'use client'

import { useState } from 'react'
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Store,
  FileCheck,
  ShoppingBag,
  CreditCard,
  Truck,
  Megaphone,
  ChevronRight,
  Clock,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  cn,
  useToast
} from '@homejiak/ui'
import Link from 'next/link'

// Type definitions for better TypeScript support
interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  estimatedTime: string
  content: any
}

// Setup steps data
const setupSteps: SetupStep[] = [
  {
    id: 'requirements',
    title: 'Requirements',
    description: 'What you need before starting',
    icon: FileCheck,
    estimatedTime: '5 min',
    content: {
      overview: 'Before you start selling on KitchenCloud, ensure you have these essential requirements ready.',
      items: [
        {
          title: 'SFA Home-Based Food Business License',
          description: 'Required by law for all home-based food businesses in Singapore',
          action: 'Apply through GoBusiness',
          link: 'https://www.gobusiness.gov.sg/browse-all-licences/singapore-food-agency-(sfa)/home-based-small-scale-food-business-licence',
          important: true
        },
        {
          title: 'PayNow Business Account',
          description: 'Register your mobile number or UEN with PayNow for instant payments',
          action: 'Set up via your bank app',
          tips: ['Use UEN for business account', 'Mobile number for personal account', 'Generate QR code from bank app']
        },
        {
          title: 'Food Photos',
          description: 'High-quality images of your products (minimum 3-5 photos)',
          tips: ['Natural lighting works best', 'Show different angles', 'Include packaging shots', 'Minimum 800x800px resolution']
        },
        {
          title: 'Business Information',
          description: 'Your business name, description, operating hours, and delivery areas',
          tips: ['Keep descriptions concise', 'Be specific about delivery zones', 'Set realistic operating hours']
        }
      ]
    }
  },
  {
    id: 'account',
    title: 'Account Setup',
    description: 'Create and verify your merchant account',
    icon: Store,
    estimatedTime: '10 min',
    content: {
      overview: 'Let\'s get your merchant account set up and verified.',
      steps: [
        {
          title: 'Sign Up',
          description: 'Go to the registration page and select "I\'m a Merchant"',
          substeps: ['Enter your email and mobile number', 'Create a strong password', 'Verify via SMS OTP']
        },
        {
          title: 'Business Verification',
          description: 'Upload your documents for verification',
          substeps: ['Upload NRIC (front & back)', 'Upload SFA license', 'Enter license number'],
          note: 'Verification usually takes 1-2 hours during business hours'
        },
        {
          title: 'Choose Your Plan',
          description: 'Select the right subscription for your business',
          plans: [
            { name: 'FREE', orders: 'Up to 50 orders/month', price: '$0', features: ['Basic storefront', 'Order management', 'WhatsApp notifications'] },
            { name: 'STARTER', orders: 'Unlimited orders', price: '$19/month', features: ['Everything in FREE', 'SMS marketing', 'Analytics dashboard', 'Priority support'] },
            { name: 'PRO', orders: 'Unlimited orders', price: '$39/month', features: ['Everything in STARTER', 'Multi-outlet support', 'API access', 'Custom domain'] }
          ]
        }
      ]
    }
  },
  {
    id: 'storefront',
    title: 'Storefront Setup',
    description: 'Customize your digital storefront',
    icon: ShoppingBag,
    estimatedTime: '15 min',
    content: {
      overview: 'Create an attractive storefront that converts visitors into customers.',
      sections: [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Business Name', example: 'Ah Ma\'s Kitchen', tip: 'Use a memorable, searchable name' },
            { label: 'Tagline', example: 'Authentic Peranakan Kueh Since 2020', tip: 'Keep it short and descriptive' },
            { label: 'Description', example: 'Home-based bakery specializing in traditional kueh...', tip: 'Include your specialties and unique selling points' },
            { label: 'Business Type', options: ['Bakery', 'Meals', 'Desserts', 'Beverages', 'Snacks'], tip: 'Choose primary category for better discovery' }
          ]
        },
        {
          title: 'Visual Identity',
          fields: [
            { label: 'Logo', specs: 'Square image, 500x500px minimum', tip: 'Use a clear, professional logo' },
            { label: 'Cover Photo', specs: '1200x400px recommended', tip: 'Showcase your best products or workspace' },
            { label: 'Color Theme', options: ['Use default', 'Custom colors'], tip: 'Match your brand identity' }
          ]
        },
        {
          title: 'Contact & Location',
          fields: [
            { label: 'WhatsApp Number', example: '+65 9XXX XXXX', tip: 'For customer inquiries' },
            { label: 'Email', example: 'orders@ahmaskitchen.sg', tip: 'For order confirmations' },
            { label: 'General Area', example: 'Tampines, East Region', tip: 'Don\'t share exact address publicly' }
          ]
        }
      ]
    }
  },
  {
    id: 'products',
    title: 'Product Catalog',
    description: 'Add your products and set pricing',
    icon: ShoppingBag,
    estimatedTime: '20 min',
    content: {
      overview: 'Build your product catalog with appealing descriptions and competitive pricing.',
      bestPractices: [
        {
          title: 'Product Photos',
          tips: [
            'Use natural lighting or bright white light',
            'Show the actual portion size',
            'Include multiple angles for complex items',
            'Add lifestyle shots (e.g., on dining table)',
            'Compress images for fast loading (max 2MB)'
          ]
        },
        {
          title: 'Product Information',
          structure: {
            name: 'Be specific and descriptive',
            description: 'Include ingredients, taste profile, serving size',
            price: 'Research competitor pricing, factor in all costs',
            category: 'Organize products logically',
            variants: 'Size options, flavors, spice levels',
            allergens: 'List all potential allergens clearly'
          }
        },
        {
          title: 'Inventory Management',
          tips: [
            'Set daily production limits',
            'Use "Made to Order" for customizable items',
            'Enable pre-orders for popular items',
            'Set cut-off times for same-day orders',
            'Mark seasonal items clearly'
          ]
        }
      ],
      example: {
        name: 'Ondeh Ondeh (10 pieces)',
        description: 'Traditional pandan-flavored glutinous rice balls filled with melted gula melaka, coated in fresh coconut. Made fresh daily.',
        price: '$8.50',
        category: 'Traditional Kueh',
        prepTime: '1 day advance order',
        allergens: 'Contains coconut',
        tags: ['Bestseller', 'Gluten-free', 'Vegetarian']
      }
    }
  },
  {
    id: 'payments',
    title: 'Payment Setup',
    description: 'Configure PayNow and payment confirmations',
    icon: CreditCard,
    estimatedTime: '10 min',
    content: {
      overview: 'Set up secure payment collection directly to your bank account.',
      steps: [
        {
          title: 'PayNow Configuration',
          description: 'Add your PayNow details for direct payments',
          options: [
            { method: 'UEN', best: 'For registered businesses', example: 'T20SS0123A' },
            { method: 'Mobile Number', best: 'For sole proprietors', example: '+65 9XXX XXXX' },
            { method: 'QR Code', best: 'Universal option', tip: 'Generate from your banking app' }
          ]
        },
        {
          title: 'Payment Confirmation Flow',
          description: 'How orders are confirmed',
          flow: [
            'Customer places order',
            'Customer receives PayNow details',
            'Customer makes payment & uploads screenshot',
            'You receive notification',
            'Verify payment in banking app',
            'Confirm order in dashboard',
            'Customer receives confirmation'
          ],
          automationTip: 'Enable auto-confirmation for trusted repeat customers'
        },
        {
          title: 'Alternative Payment Methods',
          options: [
            { method: 'Cash on Delivery', when: 'For regular customers only', risk: 'Higher cancellation rate' },
            { method: 'PayLah/GrabPay', when: 'If you have business wallet', note: 'Add QR codes to payment options' },
            { method: 'Bank Transfer', when: 'For large corporate orders', note: 'Longer confirmation time' }
          ]
        }
      ]
    }
  },
  {
    id: 'delivery',
    title: 'Delivery Setup',
    description: 'Configure delivery zones and fees',
    icon: Truck,
    estimatedTime: '10 min',
    content: {
      overview: 'Set up your delivery options to balance convenience with profitability.',
      options: [
        {
          title: 'Self-Delivery',
          description: 'You handle deliveries yourself',
          setup: [
            'Define delivery zones by postal codes',
            'Set delivery fees per zone ($3-$10 typical)',
            'Specify delivery time slots',
            'Set minimum order per zone',
            'Block out unavailable dates'
          ],
          tips: ['Batch deliveries by area', 'Use Google Maps for route planning', 'Consider delivery subscription for regulars']
        },
        {
          title: 'Self-Collection',
          description: 'Customers pick up from you',
          setup: [
            'Set collection time slots',
            'Provide clear pickup instructions',
            'Send automated reminders',
            'Set up contactless collection if preferred'
          ],
          tips: ['Offer small discount for self-collection', 'Prepare orders 15min before collection time']
        },
        {
          title: 'Third-Party Delivery',
          description: 'Use Grab/Lalamove for delivery',
          setup: [
            'Enable customer-arranged delivery',
            'Provide packaging for courier',
            'Set preparation time accurately',
            'Include delivery instructions template'
          ],
          note: 'Customer bears delivery cost directly'
        }
      ],
      zoneExample: {
        zone1: { name: 'Nearby (5km)', postcodes: '46XXXX-48XXXX', fee: '$4', minimum: '$25' },
        zone2: { name: 'East Region', postcodes: '40XXXX-52XXXX', fee: '$7', minimum: '$35' },
        zone3: { name: 'Central/West', postcodes: 'Others', fee: '$10', minimum: '$50' }
      }
    }
  },
  {
    id: 'marketing',
    title: 'Marketing & Growth',
    description: 'Promote your business and get orders',
    icon: Megaphone,
    estimatedTime: '15 min',
    content: {
      overview: 'Launch your business and start getting orders from day one.',
      launchStrategy: [
        {
          week: 'Week 1: Soft Launch',
          actions: [
            'Share with friends and family',
            'Offer 20% first-order discount',
            'Request feedback and testimonials',
            'Take photos of delivered orders'
          ]
        },
        {
          week: 'Week 2: Social Media Push',
          actions: [
            'Post on Instagram/Facebook with storefront link',
            'Join FB groups like "Home Based Food SG"',
            'Share in neighborhood Telegram groups',
            'Create Instagram highlights for menu'
          ]
        },
        {
          week: 'Week 3: Optimize & Scale',
          actions: [
            'Analyze best-selling products',
            'Adjust pricing based on demand',
            'Set up repeat order reminders',
            'Launch referral program'
          ]
        }
      ],
      marketingChannels: [
        {
          channel: 'WhatsApp Status',
          effectiveness: '⭐⭐⭐⭐⭐',
          tips: ['Post daily specials', 'Share customer reviews', 'Show behind-the-scenes']
        },
        {
          channel: 'Instagram',
          effectiveness: '⭐⭐⭐⭐⭐',
          tips: ['Use food hashtags #sghomebaker #sgfoodie', 'Post during lunch/dinner time', 'Create Reels of cooking process']
        },
        {
          channel: 'Facebook Groups',
          effectiveness: '⭐⭐⭐⭐',
          tips: ['Join local community groups', 'Share in moderation (1-2x/week)', 'Engage with others\' posts too']
        },
        {
          channel: 'Word of Mouth',
          effectiveness: '⭐⭐⭐⭐⭐',
          tips: ['Exceed expectations on quality', 'Include thank you notes', 'Offer loyalty rewards']
        }
      ],
      promoIdeas: [
        'Early bird discount (order before 10am)',
        'Bundle deals (e.g., 3 for $25)',
        'Seasonal menus (CNY, Hari Raya, Deepavali)',
        'Subscription plans (weekly/monthly)',
        'Birthday month specials',
        'Referral rewards program'
      ]
    }
  },
  {
    id: 'operations',
    title: 'Daily Operations',
    description: 'Manage orders and grow your business',
    icon: TrendingUp,
    estimatedTime: '10 min',
    content: {
      overview: 'Establish efficient daily operations to handle growth sustainably.',
      dailyRoutine: [
        { time: '8:00 AM', task: 'Check new orders', tip: 'Confirm payments first thing' },
        { time: '8:30 AM', task: 'Send confirmations', tip: 'Use templates for speed' },
        { time: '9:00 AM', task: 'Update inventory', tip: 'Mark sold out items immediately' },
        { time: '10:00 AM', task: 'Start preparation', tip: 'Batch similar items together' },
        { time: '3:00 PM', task: 'Prepare for delivery', tip: 'Double-check addresses' },
        { time: '6:00 PM', task: 'Update tomorrow\'s availability', tip: 'Post on social media' },
        { time: '8:00 PM', task: 'Review daily sales', tip: 'Note popular items' }
      ],
      automation: [
        {
          feature: 'Auto-Confirmation',
          benefit: 'Save 30 min/day',
          setup: 'Enable for customers with 3+ successful orders'
        },
        {
          feature: 'SMS Reminders',
          benefit: 'Reduce no-shows by 90%',
          setup: 'Send 2 hours before delivery/collection'
        },
        {
          feature: 'Inventory Alerts',
          benefit: 'Never oversell',
          setup: 'Auto-disable orders when stock runs out'
        },
        {
          feature: 'Repeat Orders',
          benefit: 'Increase retention 40%',
          setup: 'Send weekly reminder to past customers'
        }
      ],
      growthTips: [
        'Track your best-selling items weekly',
        'Ask for reviews after successful delivery',
        'Take photos of every product batch',
        'Respond to inquiries within 1 hour',
        'Keep 20% capacity for last-minute orders',
        'Test new items with loyal customers first'
      ]
    }
  }
]

export function SetupGuide() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set<number>())
  const { toast } = useToast()

  const progress = ((completedSteps.size / setupSteps.length) * 100)

  const handleStepComplete = () => {
    const newCompleted = new Set(completedSteps)
    newCompleted.add(currentStep)
    setCompletedSteps(newCompleted)
    
    if (currentStep < setupSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      toast({
        title: "🎉 Setup Complete!",
        description: "You're ready to start receiving orders on KitchenCloud",
      })
    }
  }

  const step = setupSteps[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/help">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Help
                </Button>
              </Link>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Setup Guide</h1>
                <p className="text-sm text-gray-600">Complete setup in 30 minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <Progress value={progress} className="w-32" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {completedSteps.size}/{setupSteps.length} Complete
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sm:hidden px-4 py-3 bg-white border-b">
        <h1 className="text-lg font-bold text-gray-900">Setup Guide</h1>
        <Progress value={progress} className="mt-2" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Step Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Setup Steps</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {setupSteps.map((s, idx) => {
                    const isActive = idx === currentStep
                    const isCompleted = completedSteps.has(idx)
                    
                    return (
                      <button
                        key={s.id}
                        onClick={() => setCurrentStep(idx)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive && "bg-orange-100 text-orange-700",
                          !isActive && !isCompleted && "hover:bg-gray-50",
                          isCompleted && !isActive && "text-green-600"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <Circle className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive && "fill-orange-600 text-orange-600"
                          )} />
                        )}
                        <span className="flex-1 text-left">{s.title}</span>
                        {isActive && <ChevronRight className="w-4 h-4" />}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                        {step?.icon && (
                            <step.icon className="w-6 h-6 text-orange-600" />
                        )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        Step {currentStep + 1}: {step?.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {step?.description}
                      </CardDescription>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        Estimated time: {step?.estimatedTime}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Step Content - Dynamic based on step */}
            <Card>
              <CardContent className="pt-6">
                {/* Requirements Step */}
                {step?.id === 'requirements' && (
                  <div className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {step?.content.overview}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4">
                      {step.content.items.map((item: any, idx: number) => (
                        <Card key={idx} className={cn(
                          "border",
                          item.important && "border-orange-200 bg-orange-50"
                        )}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                  {item.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </p>
                                {item.tips && (
                                  <ul className="mt-3 space-y-1">
                                    {item.tips.map((tip: string, i: number) => (
                                      <li key={i} className="text-sm text-gray-500 flex items-start">
                                        <span className="text-orange-500 mr-2">•</span>
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {item.link && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                                    {item.action}
                                    <ExternalLink className="w-3 h-3 ml-2" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Setup Step */}
                {step?.id === 'account' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    <Tabs defaultValue="steps" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="steps">Setup Steps</TabsTrigger>
                        <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="steps" className="space-y-4 mt-4">
                        {step.content.steps.map((s: any, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="pt-6">
                              <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-semibold text-orange-600">{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                                  <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                                  {s.substeps && (
                                    <ul className="mt-3 space-y-1">
                                      {s.substeps.map((sub: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-500 flex items-center">
                                          <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" />
                                          {sub}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {s.note && (
                                    <Alert className="mt-3">
                                      <AlertDescription className="text-sm">
                                        {s.note}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="plans" className="mt-4">
                        <div className="grid sm:grid-cols-3 gap-4">
                          {(() => {
                            // Safely access the plans from the account step
                            if (step.id === 'account' && step.content.steps) {
                              // The plans are specifically in the third step (index 2)
                              const planStep = step.content.steps[2]
                              if (planStep && 'plans' in planStep && Array.isArray(planStep.plans)) {
                                return planStep.plans.map((plan: any, idx: number) => (
                                  <Card key={idx} className={cn(
                                    "relative",
                                    idx === 1 && "border-orange-500 shadow-lg"
                                  )}>
                                    {idx === 1 && (
                                      <Badge className="absolute -top-3 right-4 bg-orange-500">
                                        Popular
                                      </Badge>
                                    )}
                                    <CardHeader>
                                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                                      <div className="text-2xl font-bold text-orange-600">{plan.price}</div>
                                      <CardDescription>{plan.orders}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <ul className="space-y-2">
                                        {plan.features.map((f: string, i: number) => (
                                          <li key={i} className="text-sm flex items-center">
                                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                                            {f}
                                          </li>
                                        ))}
                                      </ul>
                                    </CardContent>
                                  </Card>
                                ))
                              }
                            }
                            return null
                          })()}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Storefront Setup */}
                {step?.id === 'storefront' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    {step.content.sections.map((section: any, idx: number) => (
                      <div key={idx}>
                        <h3 className="font-semibold text-lg text-gray-900 mb-4">
                          {section.title}
                        </h3>
                        <div className="grid gap-4">
                          {section.fields.map((field: any, i: number) => (
                            <Card key={i}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <label className="font-medium text-sm text-gray-700">
                                      {field.label}
                                    </label>
                                    {field.example && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        Example: {field.example}
                                      </p>
                                    )}
                                    {field.specs && (
                                      <p className="text-xs text-gray-400 mt-1">
                                        {field.specs}
                                      </p>
                                    )}
                                    {field.options && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {field.options.map((opt: string) => (
                                          <Badge key={opt} variant="outline">
                                            {opt}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {field.tip && (
                                      <p className="text-xs text-orange-600 mt-2">
                                        💡 {field.tip}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Products Setup */}
                {step?.id === 'products' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    <Tabs defaultValue="best-practices" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
                        <TabsTrigger value="example">Example</TabsTrigger>
                        <TabsTrigger value="tips">Pro Tips</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="best-practices" className="space-y-4 mt-4">
                        {step.content.bestPractices.map((practice: any, idx: number) => (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-base">{practice.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {practice.tips && (
                                <ul className="space-y-2">
                                  {practice.tips.map((tip: string, i: number) => (
                                    <li key={i} className="text-sm text-gray-600 flex items-start">
                                      <Sparkles className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0 mt-0.5" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {practice.structure && (
                                <div className="space-y-2">
                                  {Object.entries(practice.structure).map(([key, value]) => (
                                    <div key={key} className="text-sm">
                                      <span className="font-medium text-gray-700 capitalize">{key}:</span>
                                      <span className="text-gray-600 ml-2">{value as string}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="example" className="mt-4">
                        <Card className="bg-gradient-to-br from-orange-50 to-white">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {step.content.example.name}
                                </h3>
                                <p className="text-sm text-gray-600 mt-2">
                                  {step.content.example.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between py-3 border-t">
                                <span className="text-2xl font-bold text-orange-600">
                                  {step.content.example.price}
                                </span>
                                <Badge>{step.content.example.category}</Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center text-gray-500">
                                  <Clock className="w-4 h-4 mr-2" />
                                  {step.content.example.prepTime}
                                </div>
                                <div className="flex items-center text-gray-500">
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  {step.content.example.allergens}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {step.content.example.tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="tips" className="mt-4">
                        <Alert>
                          <Zap className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Quick Win:</strong> Start with 5-10 best products. You can always add more later!
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Delivery Setup */}
                {step?.id === 'delivery' && step.content && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    {step.content.options?.map((option: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-base">{option.title}</CardTitle>
                          <CardDescription>{option.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {option.setup && (
                            <ul className="space-y-2 mb-4">
                              {option.setup.map((item: string, i: number) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start">
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                          {option.tips && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700">Pro Tips:</p>
                              {option.tips.map((tip: string, i: number) => (
                                <p key={i} className="text-xs text-gray-500">• {tip}</p>
                              ))}
                            </div>
                          )}
                          {option.note && (
                            <Alert className="mt-3">
                              <AlertDescription className="text-sm">{option.note}</AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {step.content.zoneExample && (
                      <Card className="bg-gray-50">
                        <CardHeader>
                          <CardTitle className="text-base">Example Delivery Zones</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(step.content.zoneExample).map(([key, zone]: [string, any]) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{zone.name}</span>
                                  <span className="text-gray-500 ml-2">({zone.postcodes})</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge variant="secondary">Min: {zone.minimum}</Badge>
                                  <Badge>{zone.fee}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Marketing & Growth Setup */}
                {step?.id === 'marketing' && step.content && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    <Tabs defaultValue="launch" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="launch">Launch Plan</TabsTrigger>
                        <TabsTrigger value="channels">Channels</TabsTrigger>
                        <TabsTrigger value="promos">Promotions</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="launch" className="space-y-4 mt-4">
                        {step.content.launchStrategy?.map((week: any, idx: number) => (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-base">{week.week}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {week.actions.map((action: string, i: number) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start">
                                    <Sparkles className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0 mt-0.5" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="channels" className="mt-4">
                        <div className="space-y-3">
                          {step.content.marketingChannels?.map((channel: any, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{channel.channel}</h4>
                                    <p className="text-sm text-yellow-600 mt-1">{channel.effectiveness}</p>
                                    <ul className="mt-2 space-y-1">
                                      {channel.tips.map((tip: string, i: number) => (
                                        <li key={i} className="text-xs text-gray-500">• {tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="promos" className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          {step.content.promoIdeas?.map((idea: string, idx: number) => (
                            <Card key={idx} className="hover:border-orange-300 transition-colors cursor-pointer">
                              <CardContent className="p-3">
                                <p className="text-sm text-gray-700">{idea}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Daily Operations */}
                {step?.id === 'operations' && step.content && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    <Tabs defaultValue="routine" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="routine">Daily Routine</TabsTrigger>
                        <TabsTrigger value="automation">Automation</TabsTrigger>
                        <TabsTrigger value="growth">Growth Tips</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="routine" className="mt-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              {step.content.dailyRoutine?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-start space-x-4">
                                  <Badge variant="outline" className="min-w-[80px]">
                                    {item.time}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{item.task}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.tip}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="automation" className="mt-4">
                        <div className="space-y-3">
                          {step.content.automation?.map((auto: any, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium text-sm">{auto.feature}</h4>
                                    <p className="text-sm text-green-600 mt-1">{auto.benefit}</p>
                                    <p className="text-xs text-gray-500 mt-2">{auto.setup}</p>
                                  </div>
                                  <Zap className="w-5 h-5 text-orange-500" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="growth" className="mt-4">
                        <Card className="bg-gradient-to-br from-orange-50 to-white">
                          <CardContent className="pt-6">
                            <ul className="space-y-3">
                              {step.content.growthTips?.map((tip: string, idx: number) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start">
                                  <TrendingUp className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0 mt-0.5" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
                
                {step?.id === 'payments' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">{step.content.overview}</p>
                    
                    {step.content.steps.map((s: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-base">{s.title}</CardTitle>
                          <CardDescription>{s.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {s.options && (
                            <div className="space-y-3">
                              {s.options.map((opt: any, i: number) => (
                                <div key={i} className="flex items-start space-x-3">
                                  <Badge variant="outline">{opt.method}</Badge>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-600">{opt.best}</p>
                                    {opt.example && (
                                      <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                        {opt.example}
                                      </code>
                                    )}
                                    {opt.tip && (
                                      <p className="text-xs text-gray-500 mt-1">{opt.tip}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {s.flow && (
                            <ol className="space-y-2 mt-4">
                              {s.flow.map((step: string, i: number) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start">
                                  <span className="font-medium text-orange-600 mr-2">{i + 1}.</span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          )}
                          {s.automationTip && (
                            <Alert className="mt-4">
                              <Sparkles className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                {s.automationTip}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-4">
                {!completedSteps.has(currentStep) && (
                  <Button
                    variant="outline"
                    onClick={handleStepComplete}
                  >
                    Mark as Complete
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    if (currentStep === setupSteps.length - 1) {
                      window.location.href = '/dashboard'
                    } else {
                      setCurrentStep(currentStep + 1)
                    }
                  }}
                >
                  {currentStep === setupSteps.length - 1 ? (
                    <>
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}