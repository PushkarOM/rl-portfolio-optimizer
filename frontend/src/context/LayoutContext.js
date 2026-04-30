import { createContext, useContext } from "react"

export const LayoutContext = createContext({ isAnimating: false })
export const useLayout = () => useContext(LayoutContext)