import { middleware } from '../trpc/core'
import type { ProcedureType } from '@trpc/server'

interface PerformanceMetrics {
  path: string
  type: ProcedureType
  duration: number
  timestamp: number
  input?: unknown
  error?: string
  userId?: string
  dbQueries?: number
  memoryUsed?: number
}

// Store metrics in memory (or Redis for production)
const metricsStore: PerformanceMetrics[] = []

// For production, you might want to use Redis
// import { redis } from '@homejiak/database'

export const performanceMiddleware = middleware(async ({ next, ctx, path, type, input }) => {
  const start = performance.now()
  const startMemory = process.memoryUsage?.().heapUsed // Optional chaining for edge runtime
  
  // Track database query count using Prisma's built-in logging
  // Note: This needs to be configured when creating the Prisma client
  let queryCount = 0
  
  // If you want to track queries, you need to enable it in your Prisma client:
  // const prisma = new PrismaClient({
  //   log: [
  //     { emit: 'event', level: 'query' }
  //   ]
  // })
  // Then listen to events: prisma.$on('query', e => { queryCount++ })
  
  try {
    const result = await next({ ctx })
    const duration = performance.now() - start
    const memoryUsed = startMemory ? process.memoryUsage().heapUsed - startMemory : undefined
    
    const metrics: PerformanceMetrics = {
      path,
      type,
      duration,
      timestamp: Date.now(),
      input: process.env.NODE_ENV === 'development' ? input : undefined,
      userId: ctx.session?.user?.id, // Fixed: use user.id instead of userId
      dbQueries: queryCount,
      memoryUsed,
    }
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`🐌 Slow API call detected:`, {
        path,
        duration: `${duration.toFixed(2)}ms`,
        queries: queryCount,
        memory: memoryUsed ? `${(memoryUsed / 1024 / 1024).toFixed(2)}MB` : 'N/A',
        user: ctx.session?.user?.email || 'anonymous'
      })
    }
    
    // Store metrics
    metricsStore.push(metrics)
    
    // Keep only last 1000 metrics in memory
    if (metricsStore.length > 1000) {
      metricsStore.splice(0, metricsStore.length - 1000)
    }
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && process.env.POSTHOG_KEY) {
      // Batch send to avoid too many requests
      // You might want to batch these and send periodically
      // await sendToAnalytics(metrics)
    }
    
    // Add timing header (if headers are available)
    if (ctx.resHeaders) {
      ctx.resHeaders.set('X-Response-Time', `${duration.toFixed(2)}ms`)
      ctx.resHeaders.set('X-DB-Queries', queryCount.toString())
      ctx.resHeaders.set('Server-Timing', `api;dur=${duration.toFixed(2)}`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    
    metricsStore.push({
      path,
      type,
      duration,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: ctx.session?.user?.id, // Fixed: use user.id
      dbQueries: queryCount,
    })
    
    throw error
  }
})

// Expose metrics endpoint
export function getMetrics(since?: number): PerformanceMetrics[] {
  if (since) {
    return metricsStore.filter(m => m.timestamp > since)
  }
  return metricsStore.slice(-100) // Return last 100 metrics
}

// Get aggregated stats
export function getAggregatedStats() {
  const stats = new Map<string, {
    count: number
    totalDuration: number
    avgDuration: number
    maxDuration: number
    minDuration: number
    errors: number
    p95: number
    p99: number
    avgQueries: number
  }>()
  
  metricsStore.forEach(metric => {
    const existing = stats.get(metric.path) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      errors: 0,
      p95: 0,
      p99: 0,
      avgQueries: 0,
    }
    
    existing.count++
    existing.totalDuration += metric.duration
    existing.maxDuration = Math.max(existing.maxDuration, metric.duration)
    existing.minDuration = Math.min(existing.minDuration, metric.duration)
    existing.avgQueries = ((existing.avgQueries * (existing.count - 1)) + (metric.dbQueries || 0)) / existing.count
    if (metric.error) existing.errors++
    
    stats.set(metric.path, existing)
  })
  
  // Calculate averages and percentiles
  stats.forEach((stat, path) => {
    stat.avgDuration = stat.totalDuration / stat.count
    
    // Calculate percentiles
    const durations = metricsStore
      .filter(m => m.path === path && !m.error)
      .map(m => m.duration)
      .sort((a, b) => a - b)
    
    if (durations.length > 0) {
      const p95Index = Math.floor(durations.length * 0.95)
      const p99Index = Math.floor(durations.length * 0.99)
      stat.p95 = durations[p95Index] || 0
      stat.p99 = durations[p99Index] || 0
    }
  })
  
  return Array.from(stats.entries())
    .map(([path, stats]) => ({ path, ...stats }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
}

// Create a simple performance report
export function getPerformanceReport() {
  const stats = getAggregatedStats()
  
  return {
    summary: {
      totalEndpoints: stats.length,
      totalCalls: metricsStore.length,
      averageResponseTime: stats.reduce((sum, s) => sum + s.avgDuration, 0) / stats.length,
      errorRate: (metricsStore.filter(m => m.error).length / metricsStore.length) * 100,
    },
    slowestEndpoints: stats.slice(0, 5).map(s => ({
      path: s.path,
      avgDuration: Math.round(s.avgDuration),
      p95: Math.round(s.p95),
      calls: s.count,
    })),
    mostCalled: [...stats].sort((a, b) => b.count - a.count).slice(0, 5).map(s => ({
      path: s.path,
      calls: s.count,
      avgDuration: Math.round(s.avgDuration),
    })),
    errors: stats.filter(s => s.errors > 0).map(s => ({
      path: s.path,
      errors: s.errors,
      errorRate: ((s.errors / s.count) * 100).toFixed(2) + '%',
    })),
  }
}