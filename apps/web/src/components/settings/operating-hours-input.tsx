'use client'

import { Switch, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@homejiak/ui"

interface DaySchedule {
  isOpen: boolean
  open?: string
  close?: string
}

interface OperatingHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

interface OperatingHoursInputProps {
  value?: OperatingHours
  onChange?: (value: OperatingHours) => void
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  return `${hour.toString().padStart(2, "0")}:${minute}`
})

const DEFAULT_HOURS: OperatingHours = {
  monday: { isOpen: true, open: "09:00", close: "18:00" },
  tuesday: { isOpen: true, open: "09:00", close: "18:00" },
  wednesday: { isOpen: true, open: "09:00", close: "18:00" },
  thursday: { isOpen: true, open: "09:00", close: "18:00" },
  friday: { isOpen: true, open: "09:00", close: "18:00" },
  saturday: { isOpen: true, open: "09:00", close: "18:00" },
  sunday: { isOpen: false },
}

export function OperatingHoursInput({ value = DEFAULT_HOURS, onChange }: OperatingHoursInputProps) {
    // use default hours if value not provided
    const hours = value || DEFAULT_HOURS

    const handleDayToggle = (day: keyof OperatingHours) => {
        const newValue = {
        ...value,
        [day]: {
            ...hours[day],
            isOpen: !value[day].isOpen,
            // Set default times when enabling
            ...((!hours[day].isOpen && !hours[day].open) && {
            open: "09:00",
            close: "18:00",
            }),
        },
        }
        onChange?.(newValue)
    }

    const handleTimeChange = (day: keyof OperatingHours, field: "open" | "close", time: string) => {
        const newValue = {
        ...value,
        [day]: {
            ...hours[day],
            [field]: time,
        },
        }
        onChange?.(newValue)
    }

    const applyToWeekdays = () => {
        const mondayHours = hours.monday
        const newValue = {
        ...hours,
        tuesday: { ...mondayHours },
        wednesday: { ...mondayHours },
        thursday: { ...mondayHours },
        friday: { ...mondayHours },
        }
        onChange?.(newValue)
    }

    const applyToAllDays = () => {
        const mondayHours = hours.monday
        const newValue: OperatingHours = {
        monday: { ...mondayHours },
        tuesday: { ...mondayHours },
        wednesday: { ...mondayHours },
        thursday: { ...mondayHours },
        friday: { ...mondayHours },
        saturday: { ...mondayHours },
        sunday: { ...mondayHours },
        }
        onChange?.(newValue)
    }

    return (
        <div className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 pb-2 border-b">
            <button
            type="button"
            onClick={applyToWeekdays}
            className="text-sm text-primary hover:underline"
            >
            Apply Monday to weekdays
            </button>
            <span className="text-muted-foreground">•</span>
            <button
            type="button"
            onClick={applyToAllDays}
            className="text-sm text-primary hover:underline"
            >
            Apply Monday to all days
            </button>
        </div>

        {/* Days */}
        <div className="space-y-3">
            {DAYS.map(({ key, label }) => {
            const daySchedule = value[key]
            
            return (
                <div key={key} className="flex items-center gap-4">
                <div className="w-24">
                    <Label className="text-sm font-medium">{label}</Label>
                </div>
                
                <Switch
                    checked={daySchedule.isOpen}
                    onCheckedChange={() => handleDayToggle(key)}
                    aria-label={`${label} open/closed`}
                />
                
                {daySchedule.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                    <Select
                        value={daySchedule.open}
                        onValueChange={(time) => handleTimeChange(key, "open", time)}
                    >
                        <SelectTrigger className="w-24">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                            {time}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    
                    <span className="text-sm text-muted-foreground">to</span>
                    
                    <Select
                        value={daySchedule.close}
                        onValueChange={(time) => handleTimeChange(key, "close", time)}
                    >
                        <SelectTrigger className="w-24">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                            {time}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground flex-1">Closed</span>
                )}
                </div>
            )
            })}
        </div>
        </div>
    )
}