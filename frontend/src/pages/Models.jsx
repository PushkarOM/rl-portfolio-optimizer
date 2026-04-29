import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { createModel, getModels, deleteModel } from "@/api/modelApi"
import NextStepButton from "@/components/NextPageButton"

// Predefined parameters per algorithm with defaults
const ALGORITHM_PARAMS = {
  ppo: [
    { key: "learning_rate",  label: "Learning Rate",  default: 0.0003,  type: "number", step: 0.0001 },
    { key: "n_steps",        label: "N Steps",        default: 2048,    type: "number", step: 1 },
    { key: "batch_size",     label: "Batch Size",     default: 64,      type: "number", step: 1 },
    { key: "n_epochs",       label: "N Epochs",       default: 10,      type: "number", step: 1 },
    { key: "gamma",          label: "Gamma",          default: 0.99,    type: "number", step: 0.01 },
    { key: "gae_lambda",     label: "GAE Lambda",     default: 0.95,    type: "number", step: 0.01 },
    { key: "clip_range",     label: "Clip Range",     default: 0.2,     type: "number", step: 0.01 },
    { key: "ent_coef",       label: "Entropy Coef",   default: 0.01,    type: "number", step: 0.001 },
    { key: "max_grad_norm",  label: "Max Grad Norm",  default: 0.5,     type: "number", step: 0.1 },
  ],
  dqn: [
    { key: "learning_rate",            label: "Learning Rate",            default: 0.0001, type: "number", step: 0.0001 },
    { key: "batch_size",               label: "Batch Size",               default: 32,     type: "number", step: 1 },
    { key: "gamma",                    label: "Gamma",                    default: 0.99,   type: "number", step: 0.01 },
    { key: "exploration_fraction",     label: "Exploration Fraction",     default: 0.1,    type: "number", step: 0.01 },
    { key: "exploration_final_eps",    label: "Exploration Final Eps",    default: 0.05,   type: "number", step: 0.01 },
    { key: "target_update_interval",   label: "Target Update Interval",   default: 1000,   type: "number", step: 1 },
    { key: "learning_starts",          label: "Learning Starts",          default: 1000,   type: "number", step: 1 },
  ],
  a2c: [
    { key: "learning_rate",  label: "Learning Rate",  default: 0.0007, type: "number", step: 0.0001 },
    { key: "n_steps",        label: "N Steps",        default: 5,      type: "number", step: 1 },
    { key: "gamma",          label: "Gamma",          default: 0.99,   type: "number", step: 0.01 },
    { key: "gae_lambda",     label: "GAE Lambda",     default: 1.0,    type: "number", step: 0.01 },
    { key: "ent_coef",       label: "Entropy Coef",   default: 0.0,    type: "number", step: 0.001 },
    { key: "vf_coef",        label: "Value Func Coef",default: 0.5,    type: "number", step: 0.01 },
    { key: "max_grad_norm",  label: "Max Grad Norm",  default: 0.5,    type: "number", step: 0.1 },
  ],
  sac: [
    { key: "learning_rate",  label: "Learning Rate",  default: 0.0003, type: "number", step: 0.0001 },
    { key: "batch_size",     label: "Batch Size",     default: 256,    type: "number", step: 1 },
    { key: "gamma",          label: "Gamma",          default: 0.99,   type: "number", step: 0.01 },
    { key: "tau",            label: "Tau",            default: 0.005,  type: "number", step: 0.001 },
    { key: "ent_coef",       label: "Entropy Coef",   default: "auto", type: "text" },
    { key: "learning_starts",label: "Learning Starts",default: 100,    type: "number", step: 1 },
    { key: "train_freq",     label: "Train Freq",     default: 1,      type: "number", step: 1 },
  ],
}

const ALGORITHM_LABELS = {
  ppo: "PPO — Proximal Policy Optimization",
  dqn: "DQN — Deep Q-Network",
  a2c: "A2C — Advantage Actor Critic",
  sac: "SAC — Soft Actor Critic",
}

// Build default params object for a given algorithm
const buildDefaultParams = (algo) => {
  return Object.fromEntries(
    ALGORITHM_PARAMS[algo].map(p => [p.key, p.default])
  )
}

const Models = () => {
  const [models, setModels]               = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [advancedOpen, setAdvancedOpen]   = useState(false)
  const [expandedId, setExpandedId]       = useState(null)
  const [search, setSearch]               = useState("")
  const [showAll, setShowAll]             = useState(false)

  // Delete state
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [deletingId, setDeletingId]       = useState(null)
  const [deletingName, setDeletingName]   = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [form, setForm] = useState({
    name: "",
    description: "",
    algorithm: "ppo",
    parameters: buildDefaultParams("ppo"),
    extra: ""   // raw JSON for advanced params
  })

  useEffect(() => { fetchModels() }, [])

  const fetchModels = () => {
    getModels().then(res => setModels(res.data))
  }

  const handleAlgorithmChange = (algo) => {
    setForm(prev => ({
      ...prev,
      algorithm: algo,
      parameters: buildDefaultParams(algo),
      extra: ""
    }))
  }

  const handleParamChange = (key, value) => {
    setForm(prev => ({
      ...prev,
      parameters: { ...prev.parameters, [key]: value }
    }))
  }

  const handleSubmit = async () => {
    if (!form.name) {
      setError("Model name is required.")
      return
    }

    setLoading(true)
    setError(null)

    // Merge predefined params with any extra JSON params
    let finalParams = { ...form.parameters }
    if (form.extra.trim()) {
      try {
        const extra = JSON.parse(form.extra)
        finalParams = { ...finalParams, ...extra }
      } catch {
        setError("Invalid JSON in advanced parameters.")
        setLoading(false)
        return
      }
    }

    try {
      await createModel({
        name: form.name,
        description: form.description,
        algorithm: form.algorithm,
        parameters: finalParams,
      })
      setForm({
        name: "",
        description: "",
        algorithm: "ppo",
        parameters: buildDefaultParams("ppo"),
        extra: ""
      })
      setAdvancedOpen(false)
      fetchModels()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create model.")
    } finally {
      setLoading(false)
    }
  }

  const openDeleteConfirm = (m) => {
    setDeletingId(m.id)
    setDeletingName(m.name)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await deleteModel(deletingId)
      setModels(prev => prev.filter(m => m.id !== deletingId))
    } catch {
      alert("Failed to delete model.")
    } finally {
      setDeleteLoading(false)
      setConfirmOpen(false)
      setDeletingId(null)
      setDeletingName("")
    }
  }

  const currentParams = ALGORITHM_PARAMS[form.algorithm]

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Models</h1>

      <NextStepButton
        to="/experiments"
        label="Next: Create Experiment"
        disabled={models.length === 0}
        reason="Create at least one model first"
      />

      {/* CREATE FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Create Model</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Name */}
          <Input
            placeholder="Model Name (e.g. PPO_baseline)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          {/* Description */}
          <Textarea
            placeholder="Description (optional) — e.g. High entropy PPO for exploration"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2}
          />

          {/* Algorithm */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Algorithm</label>
            <Select
              value={form.algorithm}
              onValueChange={handleAlgorithmChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ALGORITHM_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Predefined params grid */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Hyperparameters</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentParams.map(param => (
                <div key={param.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{param.label}</label>
                  <Input
                    type={param.type}
                    step={param.step}
                    value={form.parameters[param.key] ?? param.default}
                    onChange={e => handleParamChange(
                      param.key,
                      param.type === "number"
                        ? parseFloat(e.target.value)
                        : e.target.value
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced / extra JSON */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Parameters
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              <label className="text-xs text-muted-foreground">
                Extra parameters as JSON — merged with above
              </label>
              <Textarea
                placeholder='{"custom_param": 0.01}'
                value={form.extra}
                onChange={e => setForm({ ...form, extra: e.target.value })}
                rows={3}
                className="font-mono text-xs"
              />
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Model"}
          </Button>

        </CardContent>
      </Card>

      {/* SAVED MODELS */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <CardTitle>Saved Models</CardTitle>
            <Input
              placeholder="Search by name or algorithm..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowAll(false) }}
              className="md:w-64"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {(() => {
            const filtered = models.filter(m => {
              const q = search.toLowerCase()
              return (
                m.name.toLowerCase().includes(q) ||
                m.algorithm.toLowerCase().includes(q)
              )
            })

            const visible = showAll ? filtered : filtered.slice(0, 5)

            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  {search ? `No models matching "${search}".` : "No models yet."}
                </p>
              )
            }

            return (
              <>
                {visible.map(m => (
                  <div key={m.id} className="border rounded-md">

                    {/* Model header row */}
                    <div className="p-4 flex flex-col md:flex-row justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{m.name}</p>
                          <Badge variant="outline" className="text-xs uppercase">
                            {m.algorithm}
                          </Badge>
                        </div>

                        {m.description && (
                          <p className="text-sm text-muted-foreground">{m.description}</p>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Created {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                        >
                          {expandedId === m.id ? "Hide Params" : "View Params"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteConfirm(m)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Expanded params */}
                    {expandedId === m.id && m.parameters && (
                      <div className="px-4 pb-4 border-t pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(m.parameters).map(([key, val]) => (
                            <div
                              key={key}
                              className="rounded-md border px-3 py-2"
                            >
                              <p className="text-xs text-muted-foreground">{key}</p>
                              <p className="text-sm font-mono font-medium">{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                      : `Show ${filtered.length - 5} more model${filtered.length - 5 > 1 ? "s" : ""}`
                    }
                  </Button>
                )}
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* DELETE CONFIRM */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deletingName}</strong>? This cannot be undone.
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

export default Models