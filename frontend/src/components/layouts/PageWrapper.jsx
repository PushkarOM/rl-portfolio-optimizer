import { useLocation } from "react-router-dom"

const PageWrapper = ({ children }) => {
  const { pathname } = useLocation()

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}

export default PageWrapper
