import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// apis
import { getSummary } from "@/api/dashboardApi"

const Dashboard = () => {

  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getSummary().then((res) => {
      setSummary(res.data)
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      
      <h1 className="text-3xl text-black font-bold tracking-tight">
        Dashboard
      </h1>

      {summary && (
        <Card className="max-w-md">
          
          <CardHeader>
            <CardTitle>Portfolio Summary Changes</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            <p className="text-muted-foreground">
              Portfolio Value
              <span className="ml-2 font-semibold text-foreground">
                ${summary.portfolio_value}
              </span>
            </p>

            <p className="text-muted-foreground">
              Daily Return
              <span className="ml-2 font-semibold text-green-500">
                {(summary.daily_return * 100).toFixed(2)}%
              </span>
            </p>

          </CardContent>

        </Card>
      )}

    </div>
  )
}

export default Dashboard