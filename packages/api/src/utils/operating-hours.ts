interface TimeSlot {
  open: string // "09:00"
  close: string // "21:00"
}

interface DaySchedule {
  isOpen: boolean
  slots?: TimeSlot[]
}

export interface OperatingHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

const DAY_MAP: Record<number, keyof OperatingHours> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/**
 * Check if a merchant is currently open based on operating hours
 * @param operatingHours - The merchant's operating hours
 * @param currentTime - Optional current time for testing (defaults to now)
 * @returns boolean indicating if the merchant is open
 */
export function checkIfOpen(
  operatingHours: OperatingHours,
  currentTime: Date = new Date()
): boolean {
  // Get Singapore time (UTC+8)
  const singaporeTime = new Date(
    currentTime.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  )
  
  const dayOfWeek = singaporeTime.getDay()
  const currentHour = singaporeTime.getHours()
  const currentMinute = singaporeTime.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute
  
  const todayKey = DAY_MAP[dayOfWeek]
  const todaySchedule = operatingHours[todayKey!]
  
  if (!todaySchedule || !todaySchedule.isOpen) {
    return false
  }
  
  if (!todaySchedule.slots || todaySchedule.slots.length === 0) {
    // If marked as open but no slots, assume 24/7
    return true
  }
  
  // Check if current time falls within any time slot
  return todaySchedule.slots.some((slot: any) => {
    const [openHour, openMinute] = slot.open.split(':').map(Number)
    const [closeHour, closeMinute] = slot.close.split(':').map(Number)
    
    const openTimeInMinutes = openHour * 60 + openMinute
    let closeTimeInMinutes = closeHour * 60 + closeMinute
    
    // Handle overnight hours (e.g., 22:00 - 02:00)
    if (closeTimeInMinutes < openTimeInMinutes) {
      // If we're after midnight
      if (currentTimeInMinutes < openTimeInMinutes) {
        closeTimeInMinutes += 24 * 60
      } else {
        // We're before midnight, so we're definitely open
        return true
      }
    }
    
    return currentTimeInMinutes >= openTimeInMinutes && 
           currentTimeInMinutes < closeTimeInMinutes
  })
}

/**
 * Get next opening time for a closed merchant
 * @param operatingHours - The merchant's operating hours
 * @param currentTime - Optional current time for testing
 * @returns Date of next opening or null if no future opening found
 */
export function getNextOpeningTime(
  operatingHours: OperatingHours,
  currentTime: Date = new Date()
): Date | null {
  const singaporeTime = new Date(
    currentTime.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  )
  
  // Check up to 7 days ahead
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const checkDate = new Date(singaporeTime)
    checkDate.setDate(checkDate.getDate() + daysAhead)
    
    const dayOfWeek = checkDate.getDay()
    const dayKey = DAY_MAP[dayOfWeek]
    const daySchedule = operatingHours[dayKey!]
    
    if (!daySchedule || !daySchedule.isOpen || !daySchedule.slots) {
      continue
    }
    
    for (const slot of daySchedule.slots) {
      const [openHour, openMinute] = slot.open.split(':').map(Number)
      
      const openingTime = new Date(checkDate)
      openingTime.setHours(openHour!, openMinute, 0, 0)
      
      // If this opening time is in the future, return it
      if (openingTime > singaporeTime) {
        return openingTime
      }
    }
  }
  
  return null
}

/**
 * Format operating hours for display
 * @param operatingHours - The merchant's operating hours
 * @returns Formatted string representation
 */
export function formatOperatingHours(operatingHours: OperatingHours): string[] {
  const days: (keyof OperatingHours)[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]
  
  return days.map(day => {
    const schedule = operatingHours[day]
    const dayName = day.charAt(0).toUpperCase() + day.slice(1)
    
    if (!schedule.isOpen) {
      return `${dayName}: Closed`
    }
    
    if (!schedule.slots || schedule.slots.length === 0) {
      return `${dayName}: Open 24 hours`
    }
    
    const timeSlots = schedule.slots
      .map(slot => `${slot.open} - ${slot.close}`)
      .join(', ')
    
    return `${dayName}: ${timeSlots}`
  })
}