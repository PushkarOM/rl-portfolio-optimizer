import { memo } from "react"

const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "", decimals = 4 }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="text-muted-foreground">Step {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {prefix}{Number(p.value).toFixed(decimals)}{suffix}
        </p>
      ))}
    </div>
  )
}

export default memo(CustomTooltip)