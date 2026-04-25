import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  getSummary,
  getPerformance,
  getAllocation,
  getRecommendation
} from "@/api/dashboardApi"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
const Dashboard = () => {

    const [summary, setSummary] = useState(null)
    const [performance, setPerformance] = useState([])
    const [allocation, setAllocation] = useState([])
    const [recommendation, setRecommendation] = useState(null)

  useEffect(() => {

    getSummary().then(res => setSummary(res.data))

    getPerformance().then(res => {
        const { dates, portfolio, benchmark } = res.data

        const chartData = dates.map((date, i) => ({
        date,
        portfolio: portfolio[i],
        benchmark: benchmark[i]
        }))

        setPerformance(chartData)
    })

    getAllocation().then(res => {
        setAllocation(res.data.assets)
    })

    getRecommendation().then(res => {
        setRecommendation(res.data)
    })

    }, [])

  return (
    <div className="p-6 space-y-6">
      
      <h1 className="text-3xl text-black font-bold tracking-tight">
        Dashboard
      </h1>
      <Card>
        <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
        </CardHeader>

        <CardContent>

            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performance}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />

                <Line
                type="monotone"
                dataKey="portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                />

                <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#22c55e"
                strokeWidth={2}
                />

            </LineChart>
            </ResponsiveContainer>

        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Current Allocation</CardTitle>
            </CardHeader>

            <CardContent>

                <ResponsiveContainer width="100%" height={300}>
                <PieChart>

                    <Pie
                    data={allocation}
                    dataKey="weight"
                    nameKey="symbol"
                    outerRadius={120}
                    label
                    >
                    {allocation.map((entry, index) => (
                        <Cell key={index} />
                    ))}
                    </Pie>

                    <Legend />

                </PieChart>
                </ResponsiveContainer>

            </CardContent>
        </Card>


      {summary && (
        <div className="grid grid-cols-4 gap-4">

            <Card>
            <CardHeader>
                <CardTitle>Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
                ${summary.portfolio_value}
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Daily Return</CardTitle>
            </CardHeader>
            <CardContent className="text-green-500 font-bold">
                {(summary.daily_return * 100).toFixed(2)}%
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Expected Return</CardTitle>
            </CardHeader>
            <CardContent className="font-bold">
                {(summary.expected_return * 100).toFixed(2)}%
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Volatility</CardTitle>
            </CardHeader>
            <CardContent className="font-bold">
                {(summary.volatility * 100).toFixed(2)}%
            </CardContent>
            </Card>

        </div>
        )}

        {recommendation && (

            <Card>

            <CardHeader>
                <CardTitle>RL Model Recommendation</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">

                {Object.entries(recommendation.recommended_allocation).map(
                ([asset, weight]) => (
                    <p key={asset}>
                    {asset}
                    <span className="ml-2 font-semibold">
                        {(weight * 100).toFixed(1)}%
                    </span>
                    </p>
                )
                )}

                <p className="pt-3 text-sm text-muted-foreground">
                Expected Reward:
                <span className="ml-2 font-bold text-green-500">
                    {(recommendation.expected_reward * 100).toFixed(2)}%
                </span>
                </p>

            </CardContent>

            </Card>

            )}

    </div>
  )
}

export default Dashboard