'use client'

import { useState } from 'react'
import { api } from '../../../../lib/trpc/client'
import { formatDistanceToNow } from 'date-fns'

export default function PendingMerchantsPage() {
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)

  const { data, isLoading, refetch } = api.admin.getPendingMerchants.useQuery()

  const approveMutation = api.admin.approveMerchant.useMutation({
    onSuccess: () => {
      refetch()
      setShowApprovalDialog(false)
      setSelectedMerchant(null)
      setApprovalNotes('')
    }
  })

  const rejectMutation = api.admin.rejectMerchant.useMutation({
    onSuccess: () => {
      refetch()
      setShowRejectionDialog(false)
      setSelectedMerchant(null)
      setRejectionReason('')
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Pending Merchant Approvals</h1>
      
      {data?.merchants.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending merchant applications</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {data?.merchants.map((merchant) => (
            <div key={merchant.id} className="bg-white p-6 rounded-lg border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{merchant.businessName}</h3>
                  <p className="text-gray-500 text-sm">
                    Applied {formatDistanceToNow(new Date(merchant.createdAt))} ago
                  </p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  Pending Review
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{merchant.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{merchant.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium">{merchant.businessType || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Website:</span>
                  <p className="font-medium">{merchant.websiteUrl || 'None'}</p>
                </div>
              </div>

              {merchant.description && (
                <div className="p-3 bg-gray-50 rounded mb-4">
                  <p className="text-sm">{merchant.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMerchant(merchant)
                    setShowApprovalDialog(true)
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedMerchant(merchant)
                    setShowRejectionDialog(true)
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Approve Merchant</h2>
            <p className="text-gray-600 mb-4">
              Approve <strong>{selectedMerchant.businessName}</strong>?
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes (Optional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              rows={3}
              placeholder="Any notes about this approval..."
            />

            <div className="p-3 bg-blue-50 rounded-lg mb-4 text-sm">
              <p className="font-medium mb-1">This will:</p>
              <ul className="text-gray-600">
                <li>• Create their account</li>
                <li>• Send welcome email</li>
                <li>• Allow dashboard access</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  approveMutation.mutate({
                    merchantId: selectedMerchant.id,
                    notes: approvalNotes
                  })
                }}
                disabled={approveMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Dialog */}
      {showRejectionDialog && selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Reject Merchant</h2>
            <p className="text-gray-600 mb-4">
              Reject <strong>{selectedMerchant.businessName}</strong>?
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              rows={4}
              placeholder="Please provide a reason..."
              required
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectionDialog(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectionReason) {
                    rejectMutation.mutate({
                      merchantId: selectedMerchant.id,
                      reason: rejectionReason
                    })
                  }
                }}
                disabled={!rejectionReason || rejectMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}