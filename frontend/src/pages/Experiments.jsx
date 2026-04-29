import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createExperiment, getExperiments, deleteExperiment } from "@/api/experimentApi"
import { getDatasets } from "@/api/dataApi"
import { getModels } from "@/api/modelApi"
import NextStepButton from "@/components/NextPageButton"

const ALGO_STYLES = {
  ppo: "bg-green-500",
  dqn: "bg-yellow-500",
  a2c: "bg-pink-500",
  sac: "bg-cyan-500",
}

const MARKET_LABEL = { stocks: "Stocks", crypto: "Crypto", forex: "Forex" }
const FREQ_LABEL   = { "1d": "Daily", "1h": "Hourly", "5m": "5 Min" }

const Experiments = () => {
  const [datasets, setDatasets]         = useState([])
  const [models, setModels]             = useState([])
  const [experiments, setExperiments]   = useState([])

  const [form, setForm] = useState({
    name: "",
    dataset: "",
    model_config: "",
    description: "",
  })

  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState("")
  const [showAll, setShowAll]             = useState(false)

  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [deletingExp, setDeletingExp]     = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Preview dialog
  const [previewExp, setPreviewExp]       = useState(null)
  const [previewOpen, setPreviewOpen]     = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = () => {
    getDatasets().then(res => setDatasets(res.data.filter(d => d.status === "ready")))
    getModels().then(res => setModels(res.data))
    getExperiments().then(res => setExperiments(res.data))
  }

  const handleSubmit = async () => {
    if (!form.name.trim())  { setError("Experiment name is required."); return }
    if (!form.dataset)      { setError("Please select a dataset."); return }
    if (!form.model_config) { setError("Please select a model config."); return }

    setLoading(true)
    setError(null)
    try {
      await createExperiment({
        name: form.name.trim(),
        dataset: form.dataset,
        model_config: form.model_config,
        description: form.description.trim(),
      })
      setForm({ name: "", dataset: "", model_config: "", description: "" })
      getExperiments().then(res => setExperiments(res.data))
    } catch (err) {
      const data = err?.response?.data
      setError(data ? Object.values(data).flat().join(" ") : "Failed to create experiment.")
    } finally {
      setLoading(false)
    }
  }

  const openDeleteConfirm = (exp) => { setDeletingExp(exp); setConfirmOpen(true) }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await deleteExperiment(deletingExp.id)
      setExperiments(prev => prev.filter(e => e.id !== deletingExp.id))
    } finally {
      setDeleteLoading(false)
      setConfirmOpen(false)
      setDeletingExp(null)
    }
  }

  const openPreview = (exp) => { setPreviewExp(exp); setPreviewOpen(true) }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Experiments</h1>

      <NextStepButton
        to="/training"
        label="Next: Start Training"
        disabled={experiments.length === 0}
        reason="Create at least one experiment first"
      />

      {/*  CREATE FORM  */}
      <Card>
        <CardHeader>
          <CardTitle>Create Experiment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex flex-col gap-1 items-start">
            <label className="text-sm text-muted-foreground">Experiment Name</label>
            <Input
              placeholder="e.g. SPY-PPO-v1"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 items-start">
              <label className="text-sm text-muted-foreground">Dataset</label>
              <Select
                value={form.dataset}
                onValueChange={v => setForm({ ...form, dataset: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a ready dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.length === 0
                    ? <SelectItem value="__none" disabled>No ready datasets</SelectItem>
                    : datasets.map(ds => (
                        <SelectItem key={ds.id} value={String(ds.id)}>
                          {ds.name} — {MARKET_LABEL[ds.market]} · {FREQ_LABEL[ds.frequency] ?? ds.frequency}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 items-start">
              <label className="text-sm text-muted-foreground">Model Config</label>
              <Select
                value={form.model_config}
                onValueChange={v => setForm({ ...form, model_config: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model config" />
                </SelectTrigger>
                <SelectContent>
                  {models.length === 0
                    ? <SelectItem value="__none" disabled>No models available</SelectItem>
                    : models.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} — {m.algorithm.toUpperCase()}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-start">
            <label className="text-sm text-muted-foreground">Description (optional)</label>
            <Textarea
              placeholder="What is this experiment testing?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-left">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Experiment"}
          </Button>

        </CardContent>
      </Card>

      {/*  EXPERIMENTS LIST  */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <CardTitle className="text-left">Saved Experiments</CardTitle>
            <Input
              placeholder="Search by name, dataset, model..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowAll(false) }}
              className="md:w-64"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {(() => {
            const filtered = experiments.filter(exp => {
              const q = search.toLowerCase()
              return (
                exp.name.toLowerCase().includes(q) ||
                exp.dataset_name?.toLowerCase().includes(q) ||
                exp.model_name?.toLowerCase().includes(q)
              )
            })

            const visible = showAll ? filtered : filtered.slice(0, 5)

            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-left">
                  {search ? `No experiments matching "${search}".` : "No experiments yet."}
                </p>
              )
            }

            return (
              <>
                {visible.map(exp => (
                  <div
                    key={exp.id}
                    className="p-4 border rounded-md flex flex-col md:flex-row justify-between gap-3"
                  >
                    {/* Left */}
                    <div className="flex flex-col gap-1.5 text-left">

                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{exp.name}</p>
                        {exp.model_algorithm && (
                          <Badge className={`${ALGO_STYLES[exp.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                            {exp.model_algorithm}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Dataset:{" "}
                        <span className="text-foreground font-medium">{exp.dataset_name ?? "—"}</span>
                        {exp.dataset_market && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {MARKET_LABEL[exp.dataset_market]} · {FREQ_LABEL[exp.dataset_frequency] ?? exp.dataset_frequency}
                          </span>
                        )}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Model:{" "}
                        <span className="text-foreground font-medium">{exp.model_name ?? "—"}</span>
                      </p>

                      {Array.isArray(exp.dataset_assets) && exp.dataset_assets.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {exp.dataset_assets.slice(0, 5).map(ticker => (
                            <Badge key={ticker} variant="outline" className="text-xs font-mono">
                              {ticker}
                            </Badge>
                          ))}
                          {exp.dataset_assets.length > 5 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{exp.dataset_assets.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end md:justify-between shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openPreview(exp)}>
                          View
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(exp)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                  </div>
                ))}

                {filtered.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAll(prev => !prev)}
                  >
                    {showAll
                      ? "Show less"
                      : `Show ${filtered.length - 5} more experiment${filtered.length - 5 > 1 ? "s" : ""}`
                    }
                  </Button>
                )}
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/*  PREVIEW DIALOG ─ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              {previewExp?.name}
              {previewExp?.model_algorithm && (
                <Badge className={`${ALGO_STYLES[previewExp.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                  {previewExp.model_algorithm}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewExp && (
            <div className="space-y-4 text-sm">

              {/* Description */}
              {previewExp.description ? (
                <p className="text-muted-foreground">{previewExp.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}

              <hr className="border-border" />

              {/* Dataset section */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Dataset</p>
                <p className="font-medium">{previewExp.dataset_name}</p>
                <div className="flex gap-2">
                  {previewExp.dataset_market && (
                    <Badge variant="outline" className="text-xs">
                      {MARKET_LABEL[previewExp.dataset_market]}
                    </Badge>
                  )}
                  {previewExp.dataset_frequency && (
                    <Badge variant="outline" className="text-xs">
                      {FREQ_LABEL[previewExp.dataset_frequency] ?? previewExp.dataset_frequency}
                    </Badge>
                  )}
                </div>
                {Array.isArray(previewExp.dataset_assets) && previewExp.dataset_assets.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {previewExp.dataset_assets.map(ticker => (
                      <Badge key={ticker} variant="outline" className="text-xs font-mono">
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Model section */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Model Config</p>
                <p className="font-medium">{previewExp.model_name}</p>
                {previewExp.model_algorithm && (
                  <Badge className={`${ALGO_STYLES[previewExp.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                    {previewExp.model_algorithm}
                  </Badge>
                )}
              </div>

              <hr className="border-border" />

              {/* Meta */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>ID: #{previewExp.id}</span>
                <span>Created: {new Date(previewExp.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric"
                })}</span>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*  DELETE CONFIRM ─ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Experiment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deletingExp?.name}</strong>?
            Any training runs linked to this experiment will also be removed. This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default Experiments