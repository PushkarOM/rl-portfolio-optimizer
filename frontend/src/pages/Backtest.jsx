import { useEffect, useState } from "react"
import { getBacktestResult } from "@/api/backtestApi"

const Backtest = () => {

  const [result, setResult] = useState(null)

  useEffect(() => {

    getBacktestResult().then((res) => {
      setResult(res.data)
    })

  }, [])

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">
        Backtest
      </h1>

      {result && (

        <div className="space-y-2">

          <p>Total Return: {result.total_return}</p>
          <p>Sharpe Ratio: {result.sharpe_ratio}</p>
          <p>Max Drawdown: {result.max_drawdown}</p>
          <p>Volatility: {result.volatility}</p>

        </div>

      )}

    </div>

  )
}

export default Backtest