import { useEffect, useState } from "react"

import { startTraining, getTrainingRuns } from "@/api/trainingApi"
import { getExperiments } from "@/api/experimentApi"
import { getModels } from "@/api/modelApi"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const Training = () => {
  const [experiments, setExperiments] = useState([])
  const [models, setModels] = useState([])
  const [runs, setRuns] = useState([])

  const [form, setForm] = useState({
    experiment_id: "",
    model_id: "",
    episodes: 1000
  })

  useEffect(() => {
    fetchExperiments()
    fetchModels()
    fetchRuns()

    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchExperiments = () => {
    getExperiments().then(res => setExperiments(res.data))
  }

  const fetchModels = () => {
    getModels().then(res => setModels(res.data))
  }

  const fetchRuns = () => {
    getTrainingRuns().then(res => setRuns(res.data))
  }

  const handleStart = () => {
    startTraining({
      experiment_id: form.experiment_id,
      model_id: form.model_id,
      parameters: {
        episodes: form.episodes
      }
    }).then(fetchRuns)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-500"
      case "running": return "bg-yellow-500"
      case "failed": return "bg-red-500"
      default: return "bg-gray-400"
    }
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Training Dashboard</h1>

      {/* FORM CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Start Training Run</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Experiment */}
            <Select
              onValueChange={(val) =>
                setForm({ ...form, experiment_id: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Experiment" />
              </SelectTrigger>
              <SelectContent>
                {experiments.map(exp => (
                  <SelectItem key={exp.id} value={String(exp.id)}>
                    {exp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model */}
            <Select
              onValueChange={(val) =>
                setForm({ ...form, model_id: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name} ({m.algorithm})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Episodes */}
            <Input
              type="number"
              placeholder="Episodes"
              value={form.episodes}
              onChange={(e) =>
                setForm({ ...form, episodes: e.target.value })
              }
            />

          </div>

          <Button onClick={handleStart} className="w-full">
            Start Training
          </Button>

        </CardContent>
      </Card>

      {/* RUNS LIST */}
      <div className="space-y-4">

        <h2 className="text-xl font-semibold">Training Runs</h2>

        {runs.map(run => (
          <Card key={run.id}>
            <CardContent className="p-4 flex flex-col md:flex-row justify-between gap-4">

              <div className="space-y-1">
                <p className="font-semibold">Run #{run.id}</p>

                <Badge className={`${getStatusColor(run.status)} text-white`}>
                  {run.status}
                </Badge>

                <p className="text-sm text-muted-foreground">
                  Model: {run.model_config}
                </p>
              </div>

              <div className="flex flex-col gap-2 items-end w-full md:w-1/3">

                {/* Progress Bar */}
                <Progress value={run.progress || 0} />

                {run.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log(run.result_metrics)}
                  >
                    View Results
                  </Button>
                )}

              </div>

            </CardContent>
          </Card>
        ))}

      </div>

    </div>
  )
}

export default Training
