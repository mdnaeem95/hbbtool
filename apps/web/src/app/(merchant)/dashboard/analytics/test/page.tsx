"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import { useSession } from "@/hooks/use-session"
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from "@kitchencloud/ui"
import { subDays } from "date-fns"

export default function AnalyticsTestPage() {
  const { user, loading: sessionLoading } = useSession()
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  
  // Add log helper
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev, logMessage])
  }

  // Log session changes
  useEffect(() => {
    addLog(`Session loading: ${sessionLoading}, User: ${user?.id || 'null'}`)
  }, [sessionLoading, user])

  // Create STABLE date range
  const dateRange = React.useMemo(() => {
    const now = new Date()
    const from = startOfDay(subDays(now, 30))
    const to = endOfDay(now)
    addLog(`Date range created: ${from.toISOString()} to ${to.toISOString()}`)
    return { from, to }
  }, []) // Empty deps = created once

  // Test individual endpoints
  const testDashboardStats = async () => {
    addLog("Testing getDashboardStats...")
    try {
      // Use fetch directly through tRPC client
      const result = await fetch('/api/trpc/analytics.getDashboardStats?' + new URLSearchParams({
        input: JSON.stringify({ json: { preset: '30days' } })
      }), {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        }
      }).then(res => res.json())
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      addLog("getDashboardStats SUCCESS")
      setTestResults(prev => ({ ...prev, dashboardStats: result.result?.data?.json }))
    } catch (error) {
      addLog(`getDashboardStats ERROR: ${error}`)
      setTestResults(prev => ({ ...prev, dashboardStats: { error: String(error) } }))
    }
  }

  const testRevenueChart = async () => {
    addLog("Testing getRevenueChart...")
    try {
      const result = await fetch('/api/trpc/analytics.getRevenueChart?' + new URLSearchParams({
        input: JSON.stringify({ json: { preset: '30days', groupBy: 'day' } })
      }), {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        }
      }).then(res => res.json())
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const data = result.result?.data?.json || []
      addLog(`getRevenueChart SUCCESS: ${data.length} data points`)
      setTestResults(prev => ({ ...prev, revenueChart: data }))
    } catch (error) {
      addLog(`getRevenueChart ERROR: ${error}`)
      setTestResults(prev => ({ ...prev, revenueChart: { error: String(error) } }))
    }
  }

  const testOrderMetrics = async () => {
    addLog("Testing getOrderMetrics...")
    try {
      const result = await fetch('/api/trpc/analytics.getOrderMetrics?' + new URLSearchParams({
        input: JSON.stringify({ json: { preset: '30days' } })
      }), {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        }
      }).then(res => res.json())
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      addLog("getOrderMetrics SUCCESS")
      setTestResults(prev => ({ ...prev, orderMetrics: result.result?.data?.json }))
    } catch (error) {
      addLog(`getOrderMetrics ERROR: ${error}`)
      setTestResults(prev => ({ ...prev, orderMetrics: { error: String(error) } }))
    }
  }

  const testProductPerformance = async () => {
    addLog("Testing getProductPerformance...")
    try {
      const result = await fetch('/api/trpc/analytics.getProductPerformance?' + new URLSearchParams({
        input: JSON.stringify({ json: { preset: '30days', limit: 10 } })
      }), {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        }
      }).then(res => res.json())
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const data = result.result?.data?.json || []
      addLog(`getProductPerformance SUCCESS: ${data.length} products`)
      setTestResults(prev => ({ ...prev, productPerformance: data }))
    } catch (error) {
      addLog(`getProductPerformance ERROR: ${error}`)
      setTestResults(prev => ({ ...prev, productPerformance: { error: String(error) } }))
    }
  }

  const testCustomerInsights = async () => {
    addLog("Testing getCustomerInsights...")
    try {
      const result = await fetch('/api/trpc/analytics.getCustomerInsights?' + new URLSearchParams({
        input: JSON.stringify({ json: { preset: '30days' } })
      }), {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        }
      }).then(res => res.json())
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      addLog("getCustomerInsights SUCCESS")
      setTestResults(prev => ({ ...prev, customerInsights: result.result?.data?.json }))
    } catch (error) {
      addLog(`getCustomerInsights ERROR: ${error}`)
      setTestResults(prev => ({ ...prev, customerInsights: { error: String(error) } }))
    }
  }

  // Test with React Query hooks
  const [enableQueries, setEnableQueries] = useState(false)
  
  const statsQuery = api.analytics.getDashboardStats.useQuery(
    { preset: '30days' },
    { 
      enabled: enableQueries && !sessionLoading && !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  )

  const revenueQuery = api.analytics.getRevenueChart.useQuery(
    { preset: '30days' },
    { 
      enabled: enableQueries && !sessionLoading && !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  )
  
  // Log query state changes
  useEffect(() => {
    if (enableQueries) {
      addLog(`React Query Stats: ${statsQuery.status}, fetching: ${statsQuery.isFetching}, fetchStatus: ${statsQuery.fetchStatus}`)
    }
  }, [statsQuery.status, statsQuery.isFetching, statsQuery.fetchStatus])
  
  useEffect(() => {
    if (enableQueries) {
      addLog(`React Query Revenue: ${revenueQuery.status}, fetching: ${revenueQuery.isFetching}, fetchStatus: ${revenueQuery.fetchStatus}`)
    }
  }, [revenueQuery.status, revenueQuery.isFetching, revenueQuery.fetchStatus])

  // Run all tests
  const runAllTests = async () => {
    if (!user) {
      addLog("ERROR: No user session found!")
      return
    }

    addLog("Starting all tests...")
    setTestResults({})
    
    await testDashboardStats()
    await testRevenueChart()
    await testOrderMetrics()
    await testProductPerformance()
    await testCustomerInsights()
    
    addLog("All tests completed!")
  }

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Not authenticated. Please login first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics API Test Page</h1>
      
      {/* Session Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <p>User ID: {user.id}</p>
            <p>Email: {user.email}</p>
            <p>User Type: {user.user_metadata?.userType || 'unknown'}</p>
            <p>Session Loading: {String(sessionLoading)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runAllTests} variant="default">
              Run All Manual Tests
            </Button>
            <Button 
              onClick={() => setEnableQueries(!enableQueries)} 
              variant={enableQueries ? "destructive" : "outline"}
            >
              {enableQueries ? "Disable" : "Enable"} React Query Tests
            </Button>
            <Button onClick={() => setLogs([])} variant="outline">
              Clear Logs
            </Button>
          </div>
          
          {enableQueries && (
            <div className="p-4 bg-yellow-50 rounded">
              <p className="text-sm font-medium">React Query Status:</p>
              <p className="text-xs">Stats Query: {statsQuery.status} (fetching: {String(statsQuery.isFetching)})</p>
              <p className="text-xs">Revenue Query: {revenueQuery.status} (fetching: {String(revenueQuery.isFetching)})</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-xs">
            {logs.length === 0 ? (
              <p>No logs yet. Run tests to see activity.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(testResults).map(([key, value]) => (
              <div key={key} className="border p-4 rounded">
                <h3 className="font-semibold mb-2">{key}</h3>
                <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}