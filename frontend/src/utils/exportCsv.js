export function exportResultsCSV(run) {
  const { reward_curve = [], portfolio_curve = [], baseline_curve = [] } = run.result_metrics;

  const maxLen = Math.max(reward_curve.length, portfolio_curve.length, baseline_curve.length);

  const rows = [["step", "reward", "portfolio_value", "baseline_value"]];
  for (let i = 0; i < maxLen; i++) {
    rows.push([
      i,
      reward_curve[i]    ?? "",
      portfolio_curve[i] ?? "",
      baseline_curve[i]  ?? "",
    ]);
  }

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `run_${run.id}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBacktestCSV(result) {
  const pc = result.portfolio_curve ?? []
  const bc = result.baseline_curve  ?? []
  const rc = result.reward_curve    ?? []
  const dates = result.dates        ?? []
  const maxLen = Math.max(pc.length, bc.length)

  const rows = [["day", "date", "portfolio_value", "baseline_value", "reward"]]
  for (let i = 0; i < maxLen; i++) {
    rows.push([i, dates[i] ?? "", pc[i] ?? "", bc[i] ?? "", rc[i] ?? ""])
  }

  const csv  = rows.map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `backtest_run_${result.run_id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
