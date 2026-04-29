// src/components/NextStepButton.jsx
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const NextStepButton = ({ to, label, disabled, reason }) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={() => navigate(to)}
        disabled={disabled}
        className="gap-2"
      >
        {label}
        <ArrowRight className="w-4 h-4" />
      </Button>

      {disabled && reason && (
        <p className="text-xs text-muted-foreground">{reason}</p>
      )}
    </div>
  )
}

export default NextStepButton
