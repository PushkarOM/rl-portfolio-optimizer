import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLayout } from "@/context/LayoutContext"

const ChartCard = ({ title, children, description, height = 300 }) => {
  const { isAnimating } = useLayout()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {isAnimating
          ? <Skeleton className="w-full rounded-md" style={{ height }} />
          : children
        }
      </CardContent>
    </Card>
  )
}

export default memo(ChartCard)
