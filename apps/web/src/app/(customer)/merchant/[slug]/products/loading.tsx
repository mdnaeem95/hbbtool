import { Spinner } from "@homejiak/ui";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner className="h-10 w-10 text-orange-500 mx-auto" />
        <p className="mt-4 text-gray-600">Loading menu...</p>
      </div>
    </div>
  )
}