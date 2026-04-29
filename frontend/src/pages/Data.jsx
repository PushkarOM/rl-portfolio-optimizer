import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createDataset, getDatasets, deleteDataset, previewDataset } from "@/api/dataApi"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

import { X } from "lucide-react"

import NextStepButton from "@/components/NextPageButton"


const STATUS_STYLES = {
  pending:    "bg-gray-400",
  processing: "bg-yellow-500",
  ready:      "bg-green-500",
  failed:     "bg-red-500",
}

const Data = () => {
  const [datasets, setDatasets]             = useState([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [previewData, setPreviewData]       = useState(null)
  const [previewOpen, setPreviewOpen]       = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)

  // Delete confirm modal state
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [deletingId, setDeletingId]     = useState(null)
  const [deletingName, setDeletingName] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Tag input state
  const [tickerInput, setTickerInput] = useState("")

  const [form, setForm] = useState({
    name: "",
    assets: [],        // now an array of strings
    market: "stocks",
    frequency: "1d",
    start_date: "",
    end_date: ""
  })

  useEffect(() => {
    fetchDatasets()
    const interval = setInterval(fetchDatasets, 4000)
    return () => clearInterval(interval)
  }, [])

  const fetchDatasets = () => {
    getDatasets().then(res => setDatasets(res.data))
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // --- Ticker tag input handlers ---
  const handleTickerKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTicker()
    }
    // Backspace on empty input removes last tag
    if (e.key === "Backspace" && tickerInput === "" && form.assets.length > 0) {
      setForm(prev => ({
        ...prev,
        assets: prev.assets.slice(0, -1)
      }))
    }
  }

  const addTicker = () => {
    const ticker = tickerInput.trim().toUpperCase()
    if (!ticker) return
    if (form.assets.includes(ticker)) {
      setTickerInput("")
      return
    }
    setForm(prev => ({ ...prev, assets: [...prev.assets, ticker] }))
    setTickerInput("")
  }

  const removeTicker = (ticker) => {
    setForm(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a !== ticker)
    }))
  }

  // --- Submit ---
  const handleSubmit = async () => {
    if (!form.name || form.assets.length === 0 || !form.start_date || !form.end_date) {
      setError("Please fill in all fields and add at least one ticker.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createDataset(form)
      setForm({
        name: "",
        assets: [],
        market: "stocks",
        frequency: "1d",
        start_date: "",
        end_date: ""
      })
      setTickerInput("")
      fetchDatasets()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create dataset.")
    } finally {
      setLoading(false)
    }
  }

  // --- Delete flow ---
  const openDeleteConfirm = (ds) => {
    setDeletingId(ds.id)
    setDeletingName(ds.name)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await deleteDataset(deletingId)
      setDatasets(prev => prev.filter(ds => ds.id !== deletingId))
    } catch {
      alert("Failed to delete dataset.")
    } finally {
      setDeleteLoading(false)
      setConfirmOpen(false)
      setDeletingId(null)
      setDeletingName("")
    }
  }

  // --- Preview ---
  const handlePreview = async (id) => {
    setPreviewOpen(true)
    setPreviewData(null)
    setPreviewLoading(true)
    try {
      const res = await previewDataset(id)
      setPreviewData(res.data)
    } catch {
      setPreviewData({ error: "Failed to load preview." })
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Dataset Builder</h1>
      {/* NEXT STEP */}
      <NextStepButton
        to="/models"
        label="Next: Configure Model"
        disabled={!datasets.some(ds => ds.status === "ready")}
        reason="Create and process at least one dataset first"
      />

      {/* CREATE FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Create Dataset</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Row 1 — Name */}
          <Input
            name="name"
            placeholder="Dataset Name (e.g. FAANG_2020)"
            value={form.name}
            onChange={handleChange}
          />

          {/* Row 2 — Ticker tag input */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Tickers — type and press Enter or comma to add
            </label>
            <div className="flex flex-wrap gap-2 border rounded-md px-3 py-2 min-h-[42px] focus-within:ring-1 focus-within:ring-ring">
              {form.assets.map(ticker => (
                <Badge
                  key={ticker}
                  className="bg-primary text-primary-foreground flex items-center gap-1 px-2 py-0.5"
                >
                  {ticker}
                  <button
                    onClick={() => removeTicker(ticker)}
                    className="ml-1 hover:text-red-300 text-xs leading-none"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <input
                className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
                placeholder={form.assets.length === 0 ? "AAPL, MSFT, BTC-USD..." : ""}
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                onKeyDown={handleTickerKeyDown}
                onBlur={addTicker}
              />
            </div>
          </div>

          {/* Row 3 — Market + Frequency full width */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Market</label>
              <Select
                value={form.market}
                onValueChange={(val) => setForm({ ...form, market: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Frequency</label>
              <Select
                value={form.frequency}
                onValueChange={(val) => setForm({ ...form, frequency: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Daily</SelectItem>
                  <SelectItem value="1h">Hourly</SelectItem>
                  <SelectItem value="5m">5 Min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4 — Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Start Date</label>
              <Input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">End Date</label>
              <Input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Create Dataset"}
          </Button>

        </CardContent>
      </Card>

      {/* DATASET LIST */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <CardTitle>Saved Datasets</CardTitle>
            <Input
              placeholder="Search by name or ticker..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setShowAll(false) // reset to first 5 on new search
              }}
              className="md:w-64"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">

          {(() => {
            // 1. Filter by search
            const filtered = datasets.filter(ds => {
              const q = search.toLowerCase()
              const nameMatch = ds.name.toLowerCase().includes(q)
              const tickerMatch = Array.isArray(ds.assets)
                ? ds.assets.some(a => a.toLowerCase().includes(q))
                : ds.assets?.toLowerCase().includes(q)
              return nameMatch || tickerMatch
            })

            // 2. Slice to 5 unless showAll
            const visible = showAll ? filtered : filtered.slice(0, 5)

            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  {search ? `No datasets matching "${search}".` : "No datasets yet."}
                </p>
              )
            }

            return (
              <>
                {visible.map(ds => (
                  <div
                    key={ds.id}
                    className="p-4 border rounded-md flex flex-col md:flex-row justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{ds.name}</p>
                        <Badge className={`${STATUS_STYLES[ds.status]} text-white text-xs`}>
                          {ds.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {Array.isArray(ds.assets) ? ds.assets.join(", ") : ds.assets}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {ds.start_date} → {ds.end_date}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {ds.market} | {ds.frequency}
                      </p>

                      {ds.status === "failed" && ds.error_message && (
                        <p className="text-xs text-red-500">{ds.error_message}</p>
                      )}

                      {ds.status === "processing" && (
                        <p className="text-xs text-yellow-600 animate-pulse">
                          Downloading and processing data...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {ds.status === "ready" && (
                        <Button variant="outline" size="sm" onClick={() => handlePreview(ds.id)}>
                          Preview
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteConfirm(ds)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Show more / show less */}
                {filtered.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAll(prev => !prev)}
                  >
                    {showAll
                      ? "Show less"
                      : `Show ${filtered.length - 5} more dataset${filtered.length - 5 > 1 ? "s" : ""}`
                    }
                  </Button>
                )}
              </>
            )
          })()}

        </CardContent>
      </Card>

      {/* DELETE CONFIRM MODAL */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[85vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deletingName}</strong>?
            This will also remove the processed data file and cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* PREVIEW SHEET */}
    <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
      <SheetContent side="bottom" className="h-[90vh] overflow-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">Dataset Preview</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
        </SheetHeader>

        {previewLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading preview...
            </p>
          </div>
        )}

        {previewData?.error && (
          <p className="text-sm text-red-500">{previewData.error}</p>
        )}

        {previewData && !previewData.error && (
          <div className="flex flex-col gap-4 mt-4">

            {/* Stats row */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-md border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-lg font-bold">{previewData.total_rows.toLocaleString()}</p>
              </div>
              <div className="flex-1 rounded-md border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Tickers</p>
                <p className="text-lg font-bold">{previewData.tickers?.length}</p>
              </div>
              <div className="flex-2 rounded-md border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Symbols</p>
                <div className="flex gap-1 justify-center flex-wrap mt-1">
                  {previewData.tickers?.map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex-1 rounded-md border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Columns</p>
                <p className="text-lg font-bold">{previewData.columns?.length}</p>
              </div>
              <div className="flex-1 rounded-md border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Showing</p>
                <p className="text-lg font-bold">20 rows</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.columns.map(col => (
                      <TableHead
                        key={col}
                        className="whitespace-nowrap text-xs uppercase tracking-wide"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell
                          key={j}
                          className={`whitespace-nowrap text-xs
                            ${j === 0 ? "font-medium" : "font-mono"}
                            ${cell === null ? "text-muted-foreground/50" : ""}
                          `}
                        >
                          {cell === null
                            ? "—"
                            : j === 0
                              ? cell
                              : typeof cell === "number"
                                ? cell.toFixed(6)
                                : cell
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground text-right">
              Showing first 20 rows of {previewData.total_rows.toLocaleString()} total
            </p>

          </div>
        )}
      </SheetContent>
    </Sheet>
    </div>
  )
}

export default Data
