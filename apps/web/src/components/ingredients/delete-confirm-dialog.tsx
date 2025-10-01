import { AlertTriangle } from "lucide-react"

interface DeleteConfirmDialogProps {
  ingredientName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function DeleteConfirmDialog({
  ingredientName,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Ingredient</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            Are you sure you want to delete <strong>{ingredientName}</strong>? This will
            remove it from your inventory and any recipes that use it will need to be
            updated.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}