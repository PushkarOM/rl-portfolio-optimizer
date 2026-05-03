import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GLOSSARY = {
  // Models page
  learning_rate:    "How fast the model updates its weights. Too high → unstable; too low → slow learning.",
  n_steps:          "Steps collected per update cycle. Larger = more stable gradients but slower updates.",
  batch_size:       "Samples processed per gradient step. Larger batches = smoother but more memory.",
  gamma:            "Discount factor — how much future rewards matter. 0 = myopic, 1 = far-sighted.",
  gae_lambda:       "GAE λ balances bias vs variance in advantage estimation. ~0.95 is typical.",
  clip_range:       "PPO clips policy updates to this range to prevent destructive large steps.",
  ent_coef:         "Entropy coefficient — encourages exploration by penalising overconfident policies.",
  max_grad_norm:    "Gradient clipping threshold — prevents exploding gradients during backprop.",
  // Results page
  "Sharpe Ratio":   "Risk-adjusted return: (mean return − risk-free rate) / std deviation. Higher is better.",
  "Max Drawdown":   "Largest peak-to-trough drop in portfolio value. Lower (less negative) is better.",
  Volatility:       "Annualised standard deviation of daily returns — a measure of risk.",
  "Win Rate":       "Fraction of trading days where the portfolio value increased.",
  Drawdown:         "Running decline from the most recent portfolio peak.",
  "Rolling Sharpe": "Sharpe Ratio calculated over a rolling window — shows how risk-adjusted returns evolve.",
};

export default function GlossaryTip({ term, children }) {
  const tip = GLOSSARY[term] ?? GLOSSARY[children] ?? null;
  if (!tip) return children ?? term;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-default">
            {children ?? term}
            <Info size={14} className="text-muted-foreground shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
