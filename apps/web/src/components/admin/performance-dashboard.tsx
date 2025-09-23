'use client'

import { useState } from 'react'
import { useApiPerformance } from '../../hooks/use-api-performance'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@homejiak/ui'

export function PerformanceDashboard() {
  const { metrics, stats } = useApiPerformance()
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null
  
  const [isOpen, setIsOpen] = useState(false)
  
  // Calculate overall stats
  const overallStats = {
    totalCalls: metrics.length,
    avgDuration: metrics.reduce((acc, m) => acc + m.duration, 0) / metrics.length || 0,
    errorRate: (metrics.filter(m => m.status === 'error').length / metrics.length) * 100 || 0,
  }
  
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-black text-white p-3 shadow-lg"
      >
        📊
      </button>
      
      {/* Dashboard */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-h-[600px] overflow-auto bg-white rounded-lg shadow-xl border">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                API Performance
                <button onClick={() => setIsOpen(false)}>✕</button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {overallStats.totalCalls}
                  </div>
                  <div className="text-xs text-gray-500">Total Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {overallStats.avgDuration.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-gray-500">Avg Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {overallStats.errorRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Error Rate</div>
                </div>
              </div>
              
              {/* Endpoint Stats */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Endpoints</h3>
                {Array.from(stats.entries())
                  .sort(([, a], [, b]) => b.avgDuration - a.avgDuration)
                  .slice(0, 10)
                  .map(([endpoint, stat]) => (
                    <div key={endpoint} className="flex justify-between items-center text-sm">
                      <span className="font-mono text-xs truncate flex-1">
                        {endpoint}
                      </span>
                      <div className="flex gap-2">
                        <Badge variant={stat.avgDuration > 1000 ? 'destructive' : 
                                       stat.avgDuration > 500 ? 'secondary' : 'default'}>
                          {stat.avgDuration.toFixed(0)}ms
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ({stat.count} calls)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Recent Slow Calls */}
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold text-sm">Recent Slow Calls (&gt;1s)</h3>
                {metrics
                  .filter(m => m.duration > 1000)
                  .slice(-5)
                  .reverse()
                  .map((metric, i) => (
                    <div key={i} className="text-xs flex justify-between">
                      <span className="font-mono truncate flex-1">
                        {metric.endpoint}
                      </span>
                      <Badge variant="destructive">
                        {(metric.duration / 1000).toFixed(2)}s
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}