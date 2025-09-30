'use client'

import { useState, useMemo } from 'react'
import { Search, Phone, Mail, MessageCircle, Clock, ChevronDown, ChevronRight, 
  ExternalLink, BookOpen, PlayCircle, Users, HelpCircle, Zap, CreditCard, Package, 
  TrendingUp, Shield, 
  Link} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Badge, Alert, AlertDescription, cn, toast } from '@homejiak/ui'

// FAQ Data structured by categories
const faqData = [
  {
    category: "Getting Started",
    icon: <Zap className="w-5 h-5" />,
    questions: [
      {
        q: "How do I set up my digital storefront?",
        a: "Setting up your storefront takes just 10 minutes! Go to 'Storefront' in your dashboard, upload your logo and cover photo, add your business description, operating hours, and delivery zones. Upload your PayNow QR code or add your registered mobile number/UEN so customers can pay you directly - we never hold your funds!",
        tags: ["setup", "storefront", "onboarding"]
      },
      {
        q: "What documents do I need to start selling?",
        a: "For home-based businesses in Singapore, you'll need: 1) A valid SFA Home-Based Food Business License, 2) Your NRIC/FIN for verification, 3) Your PayNow details (QR code, mobile number, or UEN) for receiving direct payments. We'll guide you through the SFA application if needed.",
        tags: ["documents", "license", "SFA", "requirements"]
      },
      {
        q: "How do payments work on KitchenCloud?",
        a: "Payments go directly from customers to you - we're not a middleman! When customers order, they see your PayNow QR/details and pay you directly. They upload a payment screenshot, you verify it in your banking app, then confirm the order. The money is already in your bank - instant and secure!",
        tags: ["payments", "paynow", "direct", "instant"]
      },
      {
        q: "How do I migrate from WhatsApp ordering?",
        a: "We make migration seamless! Export your WhatsApp customer list, and we'll help you import contacts. Share your new storefront link with a pre-written message template we provide. Most merchants see 80% adoption within 2 weeks.",
        tags: ["whatsapp", "migration", "customers"]
      }
    ]
  },
  {
    category: "Orders & Fulfillment",
    icon: <Package className="w-5 h-5" />,
    questions: [
      {
        q: "How do I manage pre-orders and same-day orders?",
        a: "Set different lead times for each product. For pre-orders, set 1-7 days advance notice. For same-day orders, set cut-off times (e.g., 'Order before 2pm for same-day delivery'). The system automatically shows available slots to customers.",
        tags: ["orders", "pre-order", "delivery", "scheduling"]
      },
      {
        q: "Can I set order limits and delivery zones?",
        a: "Yes! Set daily order limits under 'Settings > Capacity'. Define delivery zones by postal codes or MRT stations with different delivery fees. You can also set minimum order amounts per zone to optimize your delivery routes.",
        tags: ["limits", "delivery", "zones", "capacity"]
      },
      {
        q: "How do order notifications work?",
        a: "You'll receive instant notifications via: 1) Push notifications on your phone (enable in settings), 2) SMS for urgent orders (customizable), 3) Email summaries. The dashboard also has a real-time order bell that chimes for new orders.",
        tags: ["notifications", "alerts", "real-time"]
      },
      {
        q: "How do I confirm customer payments?",
        a: "After customers place an order, they upload their PayNow payment screenshot. You'll see this in the order details. Once you verify the payment in your bank app, mark the order as 'Payment Confirmed' to start preparation. For regular customers, you can enable 'auto-confirm' based on trust.",
        tags: ["payments", "confirmation", "paynow", "verification"]
      }
    ]
  },
  {
    category: "Payments & Pricing",
    icon: <CreditCard className="w-5 h-5" />,
    questions: [
      {
        q: "What are the transaction fees?",
        a: "We charge ZERO commission! Payments go directly to you via PayNow (FREE) or PayLah (FREE). For credit/debit cards, we charge only the processing fee (2.9% + $0.30). You receive payments instantly to your PayNow - we never hold your money!",
        tags: ["fees", "commission", "pricing", "payments"]
      },
      {
        q: "How do refunds and cancellations work?",
        a: "Since payments go directly to you, refunds are handled between you and your customer. For PayNow/PayLah, transfer the refund directly and mark the order as 'Refunded' in the system. For card payments (if enabled), process through your payment gateway. Set clear cancellation policies in Settings to manage expectations.",
        tags: ["refunds", "cancellation", "payments"]
      },
      {
        q: "Can I offer promotions and discounts?",
        a: "Yes! Create percentage or fixed discounts, first-time customer offers, bundle deals, or seasonal promotions. Set validity periods, usage limits, and minimum order amounts. Track performance in the Analytics tab.",
        tags: ["promotions", "discounts", "marketing"]
      },
      {
        q: "What does KitchenCloud cost?",
        a: "We offer a simple subscription model: FREE plan for up to 50 orders/month, STARTER at $19/month for unlimited orders, and PRO at $39/month with advanced features like SMS marketing and multi-outlet support. No hidden fees, no commissions on your sales!",
        tags: ["subscription", "pricing", "plans", "cost"]
      },
      {
        q: "How are payment disputes handled?",
        a: "Since payments are direct between you and customers via PayNow, you handle any disputes directly. We provide order records, timestamps, and customer details to help resolve issues. Pro tip: Always wait for payment confirmation before preparing orders, and keep PayNow transaction screenshots for 30 days.",
        tags: ["disputes", "payments", "paynow", "issues"]
      }
    ]
  },
  {
    category: "Growth & Marketing",
    icon: <TrendingUp className="w-5 h-5" />,
    questions: [
      {
        q: "How can I increase my orders?",
        a: "Top strategies from successful merchants: 1) Enable customer reviews and showcase them, 2) Post regularly on Instagram/Facebook with your storefront link, 3) Offer a first-time discount, 4) Create seasonal menus, 5) Use our automated SMS marketing for repeat customers.",
        tags: ["growth", "marketing", "sales", "tips"]
      },
      {
        q: "Can I integrate with social media?",
        a: "Yes! Add 'Order Now' buttons to your Instagram/Facebook. Use our social media templates for posts. Enable Instagram Shopping tags. Share your custom QR code at markets and events. Track which channels drive the most orders in Analytics.",
        tags: ["social media", "instagram", "facebook", "integration"]
      }
    ]
  },
  {
    category: "Compliance & Safety",
    icon: <Shield className="w-5 h-5" />,
    questions: [
      {
        q: "How do I ensure SFA compliance?",
        a: "We help you stay compliant! Display your SFA license number on your storefront, use our food allergen labels, maintain temperature logs (we provide templates), and keep customer records for traceability. We'll remind you about license renewals.",
        tags: ["SFA", "compliance", "safety", "regulations"]
      },
      {
        q: "What about GST registration?",
        a: "If your annual revenue exceeds S$1 million, GST registration is mandatory. We track your revenue and alert you at S$900k. Our invoicing system is GST-ready - just enable it in Settings once registered.",
        tags: ["GST", "tax", "compliance"]
      }
    ]
  }
]

// Quick action links
const quickActions = [
  { icon: <BookOpen className="w-5 h-5" />, label: "Setup Guide", time: "5 min read", link: "/help/setup-guide", available: true },
  { icon: <PlayCircle className="w-5 h-5" />, label: "Video Tutorials", time: "Watch now", link: "#", available: false },
  { icon: <Users className="w-5 h-5" />, label: "Join Community", time: "500+ merchants", link: "#", available: false }
]

export function MerchantHelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Getting Started']))
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())

  // Filter FAQs based on search
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return faqData
    
    const query = searchQuery.toLowerCase()
    return faqData.map(category => ({
      ...category,
      questions: category.questions.filter(item =>
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      )
    })).filter(category => category.questions.length > 0)
  }, [searchQuery])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-gray-600">Get answers and support to grow your home-based food business</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search for answers... (e.g., 'delivery zones', 'PayNow', 'SFA license')"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery && (
                  <p className="mt-3 text-sm text-gray-600">
                    Found {filteredFAQs.reduce((acc, cat) => acc + cat.questions.length, 0)} results
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {!searchQuery && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickActions.map((action, idx) => (
                  action.available ? (
                    <Link key={idx} href={action.link}>
                      <Button
                        variant="outline"
                        className="h-auto p-4 justify-start hover:border-orange-300 w-full"
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:bg-orange-200 transition-colors">
                            {action.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm text-left">{action.label}</h3>
                            <p className="text-xs text-gray-500 mt-1 text-left">{action.time}</p>
                          </div>
                        </div>
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      key={idx}
                      variant="outline"
                      className="h-auto p-4 justify-start hover:border-orange-300"
                      onClick={() => {
                        toast({
                          title: "Coming Soon! 🚀",
                          description: `${action.label} will be available soon. We're working hard to bring you the best experience.`,
                        })
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:bg-orange-200 transition-colors">
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm text-left">{action.label}</h3>
                          <p className="text-xs text-gray-500 mt-1 text-left">{action.time}</p>
                        </div>
                      </div>
                    </Button>
                  )
                ))}
              </div>
            )}

            {/* FAQ Categories */}
            <div className="space-y-4">
              {filteredFAQs.map((category, catIdx) => (
                <Card key={catIdx}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleCategory(category.category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                          {category.icon}
                        </div>
                        <CardTitle className="text-lg">{category.category}</CardTitle>
                        <span className="text-sm text-gray-500">({category.questions.length})</span>
                      </div>
                      {expandedCategories.has(category.category) ? 
                        <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                  </CardHeader>

                  {expandedCategories.has(category.category) && (
                    <CardContent className="pt-0">
                      {category.questions.map((item, qIdx) => {
                        const questionId = `${catIdx}-${qIdx}`
                        const isExpanded = expandedQuestions.has(questionId)
                        
                        return (
                          <div key={qIdx} className="border-b border-gray-100 last:border-b-0">
                            <button
                              onClick={() => toggleQuestion(questionId)}
                              className="w-full px-2 py-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <h3 className="font-medium text-gray-900 pr-4">{item.q}</h3>
                                <ChevronDown 
                                  className={cn(
                                    "w-5 h-5 text-gray-400 flex-shrink-0 transition-transform",
                                    isExpanded && "transform rotate-180"
                                  )} 
                                />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-2 pb-4">
                                <p className="text-gray-600 leading-relaxed">{item.a}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.tags.map((tag, tagIdx) => (
                                    <Badge 
                                      key={tagIdx}
                                      variant="secondary"
                                      className="bg-orange-50 text-orange-700"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar - Contact & Resources */}
          <div className="space-y-6">
            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle>Need More Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* WhatsApp Support */}
                <a 
                  href="https://wa.me/6591234567"
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-green-50 transition-colors group"
                >
                  <div className="p-2 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-200">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">WhatsApp Support</h3>
                    <p className="text-sm text-gray-600">+65 9123 4567</p>
                    <p className="text-xs text-gray-500 mt-1">Mon-Fri: 9am-6pm</p>
                  </div>
                </a>

                {/* Email Support */}
                <a 
                  href="mailto:support@kitchencloud.sg"
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Email Support</h3>
                    <p className="text-sm text-gray-600">support@kitchencloud.sg</p>
                    <p className="text-xs text-gray-500 mt-1">Response within 24 hours</p>
                  </div>
                </a>

                {/* Phone Support */}
                <a 
                  href="tel:+6568123456"
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
                >
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Phone Support</h3>
                    <p className="text-sm text-gray-600">+65 6812 3456</p>
                    <p className="text-xs text-gray-500 mt-1">Mon-Fri: 10am-5pm</p>
                  </div>
                </a>

                {/* Support Hours */}
                <Alert className="bg-orange-50 border-orange-200">
                  <Clock className="w-4 h-4 text-orange-700" />
                  <AlertDescription className="text-orange-700">
                    <span className="font-medium">Support Hours</span>
                    <p className="text-xs mt-2">
                      Monday - Friday: 9:00 AM - 6:00 PM<br />
                      Saturday: 10:00 AM - 2:00 PM<br />
                      Sunday & PH: Closed
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="/blog" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-gray-700 group-hover:text-orange-600">Success Stories</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
                <a href="/guides" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-gray-700 group-hover:text-orange-600">Business Guides</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
                <a href="/webinars" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-gray-700 group-hover:text-orange-600">Free Webinars</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
                <a href="/grants" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-gray-700 group-hover:text-orange-600">Government Grants</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700">All systems operational</span>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">API Response</span>
                    <span className="text-green-600 font-medium">45ms</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uptime (30d)</span>
                    <span className="text-green-600 font-medium">99.98%</span>
                  </div>
                </div>
                
                <a href="/status" className="mt-4 text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1">
                  <span>View detailed status</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Still Need Help? */}
        <Card className="mt-12 bg-gradient-to-r from-orange-100 to-purple-100 border-0">
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Still can't find what you're looking for?</h2>
            <p className="text-gray-600 mb-6">
              Our merchant success team is here to help you grow your business
            </p>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
              Schedule a Call
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}