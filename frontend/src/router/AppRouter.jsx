import { BrowserRouter, Routes, Route } from "react-router-dom"
import Dashboard from "../pages/Dashboard"
import Data from "../pages/Data"
import Models from "../pages/Models"
import Training from "@/pages/Training"
import Backtest from "@/pages/Backtest"
import Experiments from "@/pages/Experiments"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/data" element={<Data />} />
        <Route path="/model" element={<Models />} />
        <Route path="/training" element={<Training />} />
        <Route path="/backtest" element={<Backtest />}/>
        <Route path="/experiments" element={<Experiments />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
