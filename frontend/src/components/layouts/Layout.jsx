import { memo, useState } from "react"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "./Sidebar"
import { LayoutContext } from "@/context/LayoutContext"

const MemoChildren = memo(({ children }) => children)

const Layout = ({ children }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleSidebarToggle = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 350)
  }

  return (
    <LayoutContext.Provider value={{ isAnimating }}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="h-12 border-b flex items-center px-4 shrink-0 gap-3 sticky top-0 bg-background z-10">
            <SidebarTrigger onClick={handleSidebarToggle} />
            <span className="text-sm text-muted-foreground">RL Portfolio Optimizer</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            <MemoChildren children={children} />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </LayoutContext.Provider>
  )
}

export default Layout
