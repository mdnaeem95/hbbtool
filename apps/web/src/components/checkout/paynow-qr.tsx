import { Card } from '@kitchencloud/ui'
import Image from 'next/image'
import { QrCode } from 'lucide-react'

interface PaynowQRProps {
  qrCodeUrl: string
  amount: number
  reference: string
  merchantName: string
}

export function PaynowQR({ qrCodeUrl, amount, reference, merchantName }: PaynowQRProps) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/5 p-4 text-center">
        <h3 className="font-semibold text-lg">{merchantName}</h3>
        <p className="text-sm text-muted-foreground">Scan to pay via PayNow</p>
      </div>
      
      <div className="p-6">
        <div className="relative mx-auto w-64 h-64 bg-white rounded-lg shadow-sm p-4">
          {qrCodeUrl ? (
            <Image
              src={qrCodeUrl}
              alt="PayNow QR Code"
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <QrCode className="h-32 w-32 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-2 text-center">
          <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            Reference: <span className="font-mono font-medium">{reference}</span>
          </p>
        </div>
      </div>
    </Card>
  )
}
