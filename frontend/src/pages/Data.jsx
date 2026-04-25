import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { createDataset, getDatasets } from "@/api/dataApi"

const Data = () => {

  const [datasets, setDatasets] = useState([])

  const [form, setForm] = useState({
    name: "",
    assets: "",
    market: "stocks",
    frequency: "1d",
    start_date: "",
    end_date: ""
  })

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = () => {
    getDatasets().then(res => setDatasets(res.data))
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = () => {

    const payload = {
      ...form,
      assets: form.assets.split(",").map(a => a.trim())
    }

    createDataset(payload).then(() => {
      fetchDatasets()
      setForm({
        name: "",
        assets: "",
        market: "stocks",
        frequency: "1d",
        start_date: "",
        end_date: ""
      })
    })
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Dataset Builder</h1>

      {/* Create Dataset */}
      <Card>
        <CardHeader>
          <CardTitle>Create Dataset</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4">

          <Input
            name="name"
            placeholder="Dataset Name"
            value={form.name}
            onChange={handleChange}
          />

          <Input
            name="assets"
            placeholder="Assets (AAPL, MSFT, BTC-USD)"
            value={form.assets}
            onChange={handleChange}
          />

         <Select
            value={form.market}
            onValueChange={(value) => setForm({ ...form, market: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Market" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="stocks">Stocks</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={form.frequency}
            onValueChange={(value) => setForm({ ...form, frequency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Frequency" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="1d">Daily</SelectItem>
              <SelectItem value="1h">Hourly</SelectItem>
              <SelectItem value="5m">5 Min</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
          />

          <Input
            type="date"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
          />

        </CardContent>

        <div className="p-4">
          <Button onClick={handleSubmit}>
            Create Dataset
          </Button>
        </div>

      </Card>

      {/* Dataset List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Datasets</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {datasets.map(ds => (
            <div
              key={ds.id}
              className="p-4 border rounded-md flex justify-between"
            >
              <div>
                <p className="font-semibold">{ds.name}</p>
                <p className="text-sm text-gray-500">
                  {ds.assets.join(", ")}
                </p>
                <p className="text-sm">
                  {ds.start_date} → {ds.end_date}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                {ds.market} | {ds.frequency}
              </div>
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  )
}

export default Data
