import { getPasswordStrength } from '@kitchencloud/auth'
import { cn } from './lib/utils'

interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, strength, feedback } = getPasswordStrength(password)
  
  if (!password) return null

  const strengthColors = {
    'weak': 'bg-red-500',
    'fair': 'bg-orange-500',
    'good': 'bg-yellow-500',
    'strong': 'bg-green-500',
    'very-strong': 'bg-green-600',
  }

  const strengthText = {
    'weak': 'Weak',
    'fair': 'Fair',
    'good': 'Good',
    'strong': 'Strong',
    'very-strong': 'Very Strong',
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bars */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full bg-gray-200 transition-colors",
              index < score && strengthColors[strength]
            )}
          />
        ))}
      </div>
      
      {/* Strength text */}
      <p className="text-xs">
        Password strength: <span className={cn(
          "font-medium",
          strength === 'weak' && "text-red-500",
          strength === 'fair' && "text-orange-500",
          strength === 'good' && "text-yellow-500",
          strength === 'strong' && "text-green-500",
          strength === 'very-strong' && "text-green-600"
        )}>{strengthText[strength]}</span>
      </p>
      
      {/* Feedback */}
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {feedback.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}