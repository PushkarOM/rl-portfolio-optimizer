import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard, Database, BrainCircuit,
  FlaskConical, Dumbbell, BarChart2, TrendingUp,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/",            icon: LayoutDashboard  },
  { label: "Data",        path: "/data",         icon: Database         },
  { label: "Models",      path: "/models",       icon: BrainCircuit     },
  { label: "Experiments", path: "/experiments",  icon: FlaskConical     },
  { label: "Training",    path: "/training",     icon: Dumbbell         },
  { label: "Results",     path: "/results",      icon: BarChart2        },
  { label: "Backtest",    path: "/backtest",     icon: TrendingUp, disabled: true },
]

const AppSidebar = () => {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">

      {/* Header */}
     <SidebarHeader>
        <div className="flex items-center justify-center gap-2 px-2 py-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base group-data-[collapsible=icon]:hidden">
            RL Trader
          </span>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ label, path, icon: Icon, disabled }) => {
              const isActive =
                location.pathname === path ||
                (path !== "/" && location.pathname.startsWith(path))

              if (disabled) {
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      disabled
                      tooltip={`${label} — Coming Soon`}
                      className="opacity-40 cursor-not-allowed"
                    >
                      <Icon />
                      <span>{label}</span>
                      <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded group-data-[collapsible=icon]:hidden">
                        Soon
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              return (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                  >
                    <NavLink to={path}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <div className="px-2 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          RL Portfolio Optimizer
        </div>
      </SidebarFooter>

    </Sidebar>
  )
}

export default AppSidebar