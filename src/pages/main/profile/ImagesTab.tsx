import { Card } from "@/components/ui"

export function ImagesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img
              src={`/abstract-.jpg?height=400&width=400&query=abstract-${i}`}
              alt={`Gallery image ${i}`}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </div>
        </Card>
      ))}
    </div>
  )
}