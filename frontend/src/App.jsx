import AppRouter from "./router/AppRouter"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <TooltipProvider>
      <AppRouter />
    </TooltipProvider>
  )
}

export default App
