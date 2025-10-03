import { Card } from "@/components/ui"

export function PostsTab() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Sample Post Title {i}</h3>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              This is a sample post description. In a real application, this would contain the actual post
              content and metadata.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>2 days ago</span>
              <span>•</span>
              <span>5 min read</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}