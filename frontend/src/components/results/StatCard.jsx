import { memo } from "react"

const StatCard = ({ label, value, sub, positive }) => (
    <div className="rounded-md border px-4 py-3 text-center flex flex-col items-center justify-center gap-1 h-24">
      <p className="text-xs text-muted-foreground leading-tight text-center">{label}</p>
      <p className={`text-lg font-bold font-mono leading-tight ${
        positive === true  ? "text-green-500" :
        positive === false ? "text-red-500"   : ""
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground leading-tight">{sub}</p>}
    </div>
)

export default memo(StatCard)
