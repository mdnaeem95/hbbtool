'use client'

import { useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  RotateCcw,
  ClipboardCheck,
  User,
  FileCheck,
  CreditCard,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Lock,
  Download
} from 'lucide-react'
import { Card, CardContent, Button, Badge } from '@homejiak/ui'

// Test suites structure
const TEST_SUITES = [
  {
    id: 'signup-happy',
    name: 'Signup Flow - Happy Path',
    icon: User,
    tests: [
      {
        id: 'signup-valid-merchant',
        name: 'Create new merchant account with valid data',
        type: 'manual',
        steps: [
          'Navigate to /auth',
          'Click "Sign Up"',
          'Enter business name: "Test Bakery"',
          'Enter email: test-{timestamp}@example.com',
          'Enter phone: +65 9123 4567',
          'Enter password: "SecurePass123"',
          'Submit form',
          'Verify success message appears',
          'Check email for verification link'
        ]
      },
      {
        id: 'email-verification',
        name: 'Email verification flow',
        type: 'manual',
        steps: [
          'Open verification email',
          'Click verification link',
          'Verify "Email verified" message',
          'Return to /auth',
          'Login with new credentials'
        ]
      },
      {
        id: 'first-login',
        name: 'First login experience',
        type: 'manual',
        steps: [
          'Login with newly created account',
          'Verify redirect to /dashboard',
          'Verify onboarding overlay appears',
          'Check for "first login" indicator'
        ]
      }
    ]
  },
  {
    id: 'signup-validation',
    name: 'Signup Validation',
    icon: AlertCircle,
    tests: [
      {
        id: 'invalid-email',
        name: 'Invalid email formats rejected',
        type: 'automated',
        testCases: [
          { input: 'notanemail', expected: 'error' },
          { input: 'test@', expected: 'error' },
          { input: '@example.com', expected: 'error' },
          { input: 'valid@example.com', expected: 'success' }
        ]
      },
      {
        id: 'invalid-phone',
        name: 'Invalid phone formats rejected',
        type: 'automated',
        testCases: [
          { input: '12345678', expected: 'error', reason: 'Missing +65' },
          { input: '+65 71234567', expected: 'error', reason: 'Starts with 7' },
          { input: '+65 812345', expected: 'error', reason: 'Too short' },
          { input: '+65 81234567', expected: 'success' },
          { input: '+65 91234567', expected: 'success' }
        ]
      },
      {
        id: 'weak-password',
        name: 'Weak passwords rejected',
        type: 'automated',
        testCases: [
          { input: 'pass', expected: 'error', reason: 'Too short' },
          { input: '1234567', expected: 'error', reason: 'Too short' },
          { input: 'SecurePass123', expected: 'success' }
        ]
      }
    ]
  },
  {
    id: 'onboarding-tour',
    name: 'Onboarding Tour',
    icon: LayoutDashboard,
    tests: [
      {
        id: 'tour-display',
        name: 'Tour displays on first login',
        type: 'manual',
        steps: [
          'Create new merchant account',
          'Verify email and login',
          'Verify onboarding overlay appears',
          'Check progress indicator (Step 1 of 7)',
          'Verify merchant name in welcome message'
        ]
      },
      {
        id: 'tour-navigation',
        name: 'Tour navigation works',
        type: 'manual',
        steps: [
          'Click "Next" button',
          'Verify step advances',
          'Navigate through all 7 steps',
          'On final step, click "Complete Tour"',
          'Verify tour closes'
        ]
      },
      {
        id: 'tour-skip',
        name: 'Tour skip functionality',
        type: 'manual',
        steps: [
          'Start onboarding tour',
          'Click "Skip Tour"',
          'Verify confirmation dialog',
          'Confirm skip',
          'Verify tour closes',
          'Logout and login again',
          'Verify tour does NOT reappear'
        ]
      }
    ]
  },
  {
    id: 'verification',
    name: 'Business Verification',
    icon: FileCheck,
    tests: [
      {
        id: 'document-upload',
        name: 'Document upload validation',
        type: 'manual',
        steps: [
          'Navigate to verification page',
          'Try uploading .txt file - should reject',
          'Try uploading >10MB file - should reject',
          'Upload valid NRIC front (jpg/png)',
          'Upload valid NRIC back',
          'Upload SFA license',
          'Enter license number',
          'Submit for verification'
        ]
      }
    ]
  },
  {
    id: 'paynow',
    name: 'PayNow Integration',
    icon: CreditCard,
    tests: [
      {
        id: 'paynow-mobile',
        name: 'PayNow mobile number setup',
        type: 'manual',
        steps: [
          'Go to Settings > Payments',
          'Enter invalid: 71234567 - should reject',
          'Enter valid: 81234567',
          'Verify QR auto-generates',
          'Save and check storefront'
        ]
      }
    ]
  },
  {
    id: 'access-control',
    name: 'Dashboard Access',
    icon: Lock,
    tests: [
      {
        id: 'merchant-access',
        name: 'Merchant dashboard access',
        type: 'manual',
        steps: [
          'Login as merchant',
          'Verify lands on /dashboard',
          'Try /admin/dashboard',
          'Verify access denied'
        ]
      },
      {
        id: 'admin-access',
        name: 'Admin dashboard access',
        type: 'manual',
        steps: [
          'Login as admin',
          'Verify lands on /admin/dashboard',
          'Can access merchant list'
        ]
      }
    ]
  }
]

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

interface TestResult {
  testId: string
  status: TestStatus
  notes?: string
  timestamp?: Date
}

export default function AuthTestingPage() {
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set(['signup-happy']))
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
  const [notes, setNotes] = useState<Map<string, string>>(new Map())

  const toggleSuite = (suiteId: string) => {
    const newExpanded = new Set(expandedSuites)
    if (newExpanded.has(suiteId)) {
      newExpanded.delete(suiteId)
    } else {
      newExpanded.add(suiteId)
    }
    setExpandedSuites(newExpanded)
  }

  const updateTestStatus = (testId: string, status: TestStatus) => {
    const newResults = new Map(testResults)
    newResults.set(testId, {
      testId,
      status,
      timestamp: new Date(),
      notes: notes.get(testId)
    })
    setTestResults(newResults)
  }

  const updateNotes = (testId: string, note: string) => {
    const newNotes = new Map(notes)
    newNotes.set(testId, note)
    setNotes(newNotes)
  }

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-gray-400" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'bg-green-50 border-green-200'
      case 'failed': return 'bg-red-50 border-red-200'
      case 'running': return 'bg-blue-50 border-blue-200'
      case 'skipped': return 'bg-gray-50 border-gray-200'
      default: return 'bg-white border-gray-200'
    }
  }

  const getSummary = () => {
    const total = Array.from(testResults.values()).length
    const passed = Array.from(testResults.values()).filter(r => r.status === 'passed').length
    const failed = Array.from(testResults.values()).filter(r => r.status === 'failed').length
    const skipped = Array.from(testResults.values()).filter(r => r.status === 'skipped').length
    return { total, passed, failed, skipped }
  }

  const exportResults = () => {
    const results = Array.from(testResults.values())
    const summary = getSummary()
    const data = {
      timestamp: new Date().toISOString(),
      summary,
      results: results.map(r => ({
        ...r,
        notes: notes.get(r.testId)
      }))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auth-test-results-${Date.now()}.json`
    a.click()
  }

  const summary = getSummary()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🔐 Auth & Onboarding Testing</h1>
              <p className="text-orange-100">KitchenCloud - Merchant Testing Suite</p>
            </div>
            <ClipboardCheck className="w-16 h-16 opacity-50" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Tests</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total || '-'}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-green-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Passed</div>
            <div className="text-2xl font-bold text-green-600">{summary.passed || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-600">{summary.failed || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-gray-400">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Skipped</div>
            <div className="text-2xl font-bold text-gray-600">{summary.skipped || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto mb-6 flex gap-3">
        <Button
          variant="outline"
          onClick={() => setTestResults(new Map())}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All
        </Button>
        <Button
          onClick={exportResults}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Results
        </Button>
      </div>

      {/* Test Suites */}
      <div className="max-w-6xl mx-auto space-y-4">
        {TEST_SUITES.map((suite) => {
          const Icon = suite.icon
          const isExpanded = expandedSuites.has(suite.id)

          return (
            <Card key={suite.id}>
              <button
                onClick={() => toggleSuite(suite.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-orange-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{suite.name}</h3>
                    <p className="text-sm text-gray-500">{suite.tests.length} tests</p>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 space-y-4">
                  {suite.tests.map((test) => {
                    const testId = test.id
                    const result = testResults.get(testId)
                    const status = result?.status || 'pending'

                    return (
                      <div
                        key={testId}
                        className={`rounded-lg border-2 p-4 transition-all ${getStatusColor(status)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(status)}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{test.name}</h4>
                              <Badge variant="secondary">{test.type}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTestStatus(testId, 'passed')}
                              className="bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              Pass
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTestStatus(testId, 'failed')}
                              className="bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Fail
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTestStatus(testId, 'skipped')}
                            >
                              Skip
                            </Button>
                          </div>
                        </div>

                        {/* Test Steps */}
                        {'steps' in test && (
                          <div className="ml-8 mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Steps:</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                              {test.steps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Test Cases */}
                        {'testCases' in test && (
                          <div className="ml-8 mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Test Cases:</p>
                            <div className="space-y-2">
                              {test.testCases.map((tc, i) => (
                                <div key={i} className="text-sm bg-white/50 rounded p-2 border border-gray-200">
                                  <code className="font-mono text-xs">{tc.input}</code>
                                  <span className="mx-2">→</span>
                                  <span className={tc.expected === 'success' ? 'text-green-600' : 'text-red-600'}>
                                    {tc.expected}
                                  </span>
                                  {tc.reason && <span className="text-gray-500 ml-2">({tc.reason})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        <div className="ml-8">
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Notes:</label>
                          <textarea
                            value={notes.get(testId) || ''}
                            onChange={(e) => updateNotes(testId, e.target.value)}
                            placeholder="Add testing notes..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-8 text-center text-sm text-gray-500 space-y-2">
        <p>🔒 Hidden Testing Page • Access: <code className="bg-gray-100 px-2 py-1 rounded">/testing/auth</code></p>
        <p>💾 Export results regularly • Reset between test runs</p>
      </div>
    </div>
  )
}