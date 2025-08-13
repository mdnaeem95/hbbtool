export function calculateQueryComplexity(input: any): number {
  let complexity = 1
  
  // Increase complexity for includes
  if (input?.include) {
    complexity += Object.keys(input.include).length * 2
  }
  
  // Increase complexity for large limits
  if (input?.pagination?.limit) {
    complexity += Math.floor(input.pagination.limit / 20)
  }
  
  // Increase complexity for date ranges
  if (input?.filters?.dateFrom && input?.filters?.dateTo) {
    complexity += 1
  }
  
  return complexity
}