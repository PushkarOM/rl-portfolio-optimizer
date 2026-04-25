import { useState } from "react"
import { startTraining } from "@/api/trainingApi"

const Training = () => {

  const [algorithm, setAlgorithm] = useState("PPO")

  const start = () => {

    startTraining({
      algorithm: algorithm,
      episodes: 10000
    }).then(res => {

      console.log(res.data)

    })

  }

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">
        Training
      </h1>

      <select
        value={algorithm}
        onChange={(e) => setAlgorithm(e.target.value)}
      >

        <option>PPO</option>
        <option>DQN</option>
        <option>A2C</option>

      </select>

      <button onClick={start}>
        Start Training
      </button>

    </div>

  )
}

export default Training