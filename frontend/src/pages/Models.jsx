import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getModels } from "@/api/modelApi"

const Models = () => {

  const [models, setModels] = useState([])

  useEffect(() => {
    getModels().then((res) => {
      setModels(res.data)
    })
  }, [])

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold tracking-tight">
        Models
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {models.map((model) => (

          <Card key={model.id}>

            <CardHeader>
              <CardTitle>{model.name}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">

              <p>Algorithm: {model.algorithm}</p>

              <p>Assets: {model.assets.join(", ")}</p>

              <p>Sharpe Ratio: {model.sharpe_ratio}</p>

              <p>{model.is_pretrained ? "Pretrained" : "Custom"}</p>

            </CardContent>

          </Card>

        ))}

      </div>

    </div>
  )
}

export default Models