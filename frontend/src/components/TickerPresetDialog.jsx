import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TICKER_PRESETS } from "@/constants/tickerPresets";

export default function TickerPresetDialog({ open, onOpenChange, onConfirm }) {
  const presetNames = Object.keys(TICKER_PRESETS);
  const [activePreset, setActivePreset] = useState(presetNames[0]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");

  const tickers = TICKER_PRESETS[activePreset].filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (t) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm([...selected]);
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">Load Ticker Preset</DialogTitle>
        </DialogHeader>

        {/* Preset tabs */}
        <div className="flex gap-2 flex-wrap">
          {presetNames.map(name => (
            <Button
              key={name}
              variant={activePreset === name ? "default" : "outline"}
              size="sm"
              onClick={() => { setActivePreset(name); setSearch(""); }}
            >
              {name}
            </Button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search tickers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Ticker badges */}
        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto py-1">
          {tickers.map(t => (
            <Badge
              key={t}
              variant={selected.has(t) ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggle(t)}
            >
              {t}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {selected.size} ticker{selected.size !== 1 ? "s" : ""} selected
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Add Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
