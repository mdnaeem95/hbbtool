export const orderSMSTemplates = {
  orderPlaced: (data: {
    orderNumber: string
    merchantName: string
    trackingUrl: string
  }) => {
    return `🎉 Order #${data.orderNumber} confirmed! ${data.merchantName} has received your order. Track it here: ${data.trackingUrl}`
  },

  orderConfirmed: (data: {
    orderNumber: string
    estimatedTime?: string
  }) => {
    return `✅ Order #${data.orderNumber} is confirmed and being prepared. ${data.estimatedTime ? `Estimated ready time: ${data.estimatedTime}` : ''}`
  },

  orderPreparing: (data: {
    orderNumber: string
  }) => {
    return `👨‍🍳 Order #${data.orderNumber} is being prepared with love!`
  },

  orderReady: (data: {
    orderNumber: string
    isDelivery: boolean
  }) => {
    if (data.isDelivery) {
      return `📦 Order #${data.orderNumber} is ready and will be out for delivery soon!`
    }
    return `✨ Order #${data.orderNumber} is ready for pickup! Please collect it at your earliest convenience.`
  },

  orderOutForDelivery: (data: {
    orderNumber: string
    driverName?: string
    driverPhone?: string
  }) => {
    let message = `🚚 Order #${data.orderNumber} is out for delivery!`
    if (data.driverName) {
      message += ` Driver: ${data.driverName}`
    }
    if (data.driverPhone) {
      message += ` (${data.driverPhone})`
    }
    return message
  },

  orderDelivered: (data: {
    orderNumber: string
  }) => {
    return `✅ Order #${data.orderNumber} has been delivered. Enjoy your meal! 🍽️`
  },

  orderCompleted: (data: {
    orderNumber: string
  }) => {
    return `✅ Order #${data.orderNumber} completed. Thank you for your order! 🙏`
  },

  orderCancelled: (data: {
    orderNumber: string
    reason?: string
  }) => {
    return `❌ Order #${data.orderNumber} has been cancelled. ${data.reason ? `Reason: ${data.reason}` : ''}`
  }
}