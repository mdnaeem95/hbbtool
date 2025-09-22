import { Card, CardContent, Skeleton } from "@homejiak/ui";

export function QuickStatsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}