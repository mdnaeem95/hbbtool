import { PerformanceDashboard } from "../../../components/admin/performance-dashboard"

export default function AdminDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/admin/merchants/pending" className="p-6 bg-white rounded-lg border hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Pending Approvals</h3>
          <p className="text-gray-600">Review merchant applications</p>
        </a>
        
        <a href="/admin/merchants" className="p-6 bg-white rounded-lg border hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">All Merchants</h3>
          <p className="text-gray-600">Manage existing merchants</p>
        </a>
        
        <a href="/admin/analytics" className="p-6 bg-white rounded-lg border hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Platform Analytics</h3>
          <p className="text-gray-600">View platform statistics</p>
        </a>
      </div>

      <PerformanceDashboard />

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          Logged in as admin: {/* Add email here */}
        </p>
      </div>
    </div>
  )
}