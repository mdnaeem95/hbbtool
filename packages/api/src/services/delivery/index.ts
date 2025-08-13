export class DeliveryService {
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula for distance calculation
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return Math.round(distance * 10) / 10 // Round to 1 decimal place
  }
  
  static isWithinDeliveryRadius(
    merchantLat: number,
    merchantLon: number,
    deliveryLat: number,
    deliveryLon: number,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(
      merchantLat,
      merchantLon,
      deliveryLat,
      deliveryLon
    )
    
    return distance <= radiusKm
  }
  
  static estimateDeliveryTime(
    distanceKm: number,
    preparationTimeMinutes: number = 30
  ): { min: number; max: number } {
    // Assume average speed of 30km/h in Singapore traffic
    const avgSpeedKmh = 30
    const deliveryTimeMinutes = (distanceKm / avgSpeedKmh) * 60
    
    // Add buffer for pickup and delivery
    const bufferMinutes = 15
    
    const totalMin = preparationTimeMinutes + deliveryTimeMinutes + bufferMinutes
    const totalMax = totalMin * 1.5 // 50% buffer for delays
    
    return {
      min: Math.round(totalMin),
      max: Math.round(totalMax),
    }
  }
  
  static calculateDeliveryFee(
    baseDeliveryFee: number,
    distanceKm: number,
    orderTotal: number,
    freeDeliveryThreshold?: number
  ): number {
    // Free delivery if order exceeds threshold
    if (freeDeliveryThreshold && orderTotal >= freeDeliveryThreshold) {
      return 0
    }
    
    // Simple tiered pricing based on distance
    let fee = baseDeliveryFee
    
    if (distanceKm > 5) {
      fee += 2 // Extra $2 for 5-10km
    }
    if (distanceKm > 10) {
      fee += 3 // Extra $3 for >10km
    }
    
    return fee
  }
  
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
