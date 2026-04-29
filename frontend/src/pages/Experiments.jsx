import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"

import { createExperiment, getExperiments } from "@/api/experimentApi"
import { getDatasets } from "@/api/dataApi"

const Experiments = () => {

  const [datasets, setDatasets] = useState([])
  const [experiments, setExperiments] = useState([])

  const [form, setForm] = useState({
    name: "",
    dataset: "",
    description: ""
  })

  useEffect(() => {
    fetchDatasets()
    fetchExperiments()
  }, [])

  const fetchDatasets = () => {
    getDatasets().then(res => setDatasets(res.data))
  }

  const fetchExperiments = () => {
    getExperiments().then(res => setExperiments(res.data))
  }

  const handleSubmit = () => {

    createExperiment(form).then(() => {
      fetchExperiments()

      setForm({
        name: "",
        dataset: "",
        description: ""
      })
    })
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Experiments</h1>

      {/* Create Experiment */}
      <Card>
        <CardHeader>
          <CardTitle>Create Experiment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            placeholder="Experiment Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Select
            value={form.dataset}
            onValueChange={(value) =>
              setForm({ ...form, dataset: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Dataset" />
            </SelectTrigger>

            <SelectContent>
              {datasets.map(ds => (
                <SelectItem key={ds.id} value={String(ds.id)}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <Button onClick={handleSubmit}>
            Create Experiment
          </Button>

        </CardContent>
      </Card>

      {/* Experiment List */}
      <Card>
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {experiments.map(exp => (
            <div
              key={exp.id}
              className="p-4 border rounded-md flex justify-between"
            >
              <div>
                <p className="font-semibold">{exp.name}</p>
                <p className="text-sm text-gray-500">
                  Dataset ID: {exp.dataset}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                {new Date(exp.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  )
}

export default Experiments