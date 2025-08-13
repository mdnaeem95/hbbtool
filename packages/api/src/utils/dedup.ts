const inFlightRequests = new Map<string, Promise<any>>()

export function dedupeRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing
  }
  
  const promise = fn().finally(() => {
    inFlightRequests.delete(key)
  })
  
  inFlightRequests.set(key, promise)
  return promise
}