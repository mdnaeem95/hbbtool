import { useEffect, useState } from 'react'

interface ApiCallMetric {
  endpoint: string
  duration: number
  timestamp: number
  status: 'success' | 'error'
  size?: number
}

class ApiPerformanceMonitor {
  private metrics: ApiCallMetric[] = []
  private observers: Set<(metrics: ApiCallMetric[]) => void> = new Set()
  
  recordApiCall(metric: ApiCallMetric) {
    this.metrics.push(metric)
    
    // Keep only last 100 calls in memory
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }
    
    // Notify observers
    this.observers.forEach(observer => observer(this.metrics))
    
    // Log slow calls
    if (metric.duration > 1000) {
      console.warn(`Slow API call: ${metric.endpoint} took ${metric.duration}ms`)
    }
  }
  
  getMetrics() {
    return this.metrics
  }
  
  getStats() {
    const stats = new Map<string, {
      count: number
      avgDuration: number
      maxDuration: number
      errors: number
    }>()
    
    this.metrics.forEach(metric => {
      const existing = stats.get(metric.endpoint) || {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        errors: 0,
      }
      
      existing.count++
      existing.avgDuration = 
        (existing.avgDuration * (existing.count - 1) + metric.duration) / existing.count
      existing.maxDuration = Math.max(existing.maxDuration, metric.duration)
      if (metric.status === 'error') existing.errors++
      
      stats.set(metric.endpoint, existing)
    })
    
    return stats
  }
  
  subscribe(callback: (metrics: ApiCallMetric[]) => void) {
    this.observers.add(callback)
    return () => {
      this.observers.delete(callback)
    }
  }
  
  clear() {
    this.metrics = []
  }
}

export const apiMonitor = new ApiPerformanceMonitor()

// Hook to use in components
export function useApiPerformance() {
  const [metrics, setMetrics] = useState<ApiCallMetric[]>([])
  const [stats, setStats] = useState<Map<string, any>>(new Map())
  
  useEffect(() => {
    const unsubscribe = apiMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics)
      setStats(apiMonitor.getStats())
    })
    
    return unsubscribe
  }, [])
  
  return { metrics, stats }
}