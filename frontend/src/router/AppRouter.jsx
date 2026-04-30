import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "@/components/layouts/Layout"
import PageWrapper from "@/components/layouts/PageWrapper"
import Dashboard from "../pages/Dashboard"
import Data from "../pages/Data"
import Models from "../pages/Models"
import Training from "@/pages/Training"
import Backtest from "@/pages/Backtest"
import Experiments from "@/pages/Experiments"
import Results from "@/pages/Results"

function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<Data />} />
            <Route path="/models" element={<Models />} />
            <Route path="/training" element={<Training />} />
            <Route path="/backtest" element={<Backtest />}/>
            <Route path="/experiments" element={<Experiments />}/>
            <Route path="/results" element={<Results />}/>
          </Routes>
        </PageWrapper>
      </Layout>
    </BrowserRouter>
  )
}

export default AppRouter
