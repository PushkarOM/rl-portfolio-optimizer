import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { createModel, getModels } from "@/api/modelApi"

const Models = () => {

  const [models, setModels] = useState([])

  const [form, setForm] = useState({
    name: "",
    algorithm: "ppo",
    parameters: "{}"
  })

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = () => {
    getModels().then(res => setModels(res.data))
  }

  const handleSubmit = () => {

    const payload = {
      ...form,
      parameters: JSON.parse(form.parameters || "{}")
    }

    createModel(payload).then(() => {
      fetchModels()
    })
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Models</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Model</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            placeholder="Model Name"
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <select
            onChange={(e) =>
              setForm({ ...form, algorithm: e.target.value })
            }
          >
            <option value="ppo">PPO</option>
            <option value="dqn">DQN</option>
            <option value="a2c">A2C</option>
            <option value="sac">SAC</option>
          </select>

          <Input
            placeholder='Parameters JSON ({"lr": 0.001})'
            onChange={(e) =>
              setForm({ ...form, parameters: e.target.value })
            }
          />

          <Button onClick={handleSubmit}>
            Create Model
          </Button>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Models</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {models.map(m => (
            <div key={m.id} className="p-4 border rounded-md">
              <p className="font-semibold">{m.name}</p>
              <p className="text-sm">{m.algorithm}</p>
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  )
}

export default Models