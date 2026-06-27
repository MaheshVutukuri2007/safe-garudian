import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, BarChart3, Table, AlertCircle, Trash2, Loader2, Database, Plus, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDataset } from "@/hooks/useDataset";
import { toast } from "sonner";

const computeSummary = (rows: Record<string, any>[], columns: string[]) => {
  const summary: Record<string, any> = {};
  let missing = 0;
  columns.forEach((col) => {
    const values = rows.map((r) => r[col]);
    const nullCount = values.filter((v) => v === null || v === undefined || v === "").length;
    missing += nullCount;
    summary[col] = { nullCount, unique: new Set(values).size };
  });
  return { missing, perColumn: summary };
};

const computeFeatureImportance = (columns: string[]) => {
  const keywords: Record<string, number> = {
    speed: 0.28, weather: 0.22, time: 0.18, hour: 0.17,
    road: 0.15, traffic: 0.12, vehicle: 0.05, type: 0.08,
    severity: 0.2, accident: 0.15, location: 0.1, age: 0.07,
  };
  return columns.map((col) => {
    const lower = col.toLowerCase();
    const score = Object.entries(keywords).find(([k]) => lower.includes(k));
    return { feature: col, importance: score ? score[1] : 0.04 };
  }).sort((a, b) => b.importance - a.importance).slice(0, 8);
};

const DatasetPage = () => {
  const { user } = useAuth();
  const { dataset, loading, refetch } = useDataset();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({
    latitude: "", longitude: "", severity: "Medium", weather: "Clear",
    roadType: "Highway", speed: "", time: "", vehicleType: "Car",
  });
  const [cleaningMissing, setCleaningMissing] = useState(false);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "preview" | "cleaning">("upload");

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      toast.error("Only CSV files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
      if (!result.data.length || !result.meta.fields?.length) {
        toast.error("CSV file is empty or malformed.");
        setUploading(false);
        return;
      }
      const rows = result.data as Record<string, any>[];
      const columns = result.meta.fields ?? [];
      const summary = computeSummary(rows, columns);

      await supabase.from("datasets").delete().eq("user_id", user!.id);
      const { error } = await supabase.from("datasets").insert({
        user_id: user!.id, filename: file.name, row_count: rows.length,
        column_count: columns.length, columns, data: rows, summary,
      });
      if (error) throw error;
      toast.success(`Dataset uploaded: ${rows.length} rows, ${columns.length} columns`);
      setActiveTab("preview");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDelete = async () => {
    if (!dataset) return;
    setDeleting(true);
    const { error } = await supabase.from("datasets").delete().eq("id", dataset.id);
    if (error) toast.error("Failed to delete dataset.");
    else { toast.success("Dataset removed."); await refetch(); }
    setDeleting(false);
  };

  const handleManualEntry = async () => {
    if (!dataset) {
      toast.error("Upload a dataset first, then add manual entries.");
      return;
    }
    const newRow: Record<string, any> = {};
    Object.entries(manualForm).forEach(([k, v]) => {
      const col = dataset.columns.find(c => c.toLowerCase().includes(k.toLowerCase()));
      if (col) newRow[col] = v;
      else newRow[k] = v;
    });

    const updatedData = [...(dataset.data as Record<string, any>[]), newRow];
    const summary = computeSummary(updatedData, dataset.columns);
    const { error } = await supabase.from("datasets").update({
      data: updatedData, row_count: updatedData.length, summary,
    }).eq("id", dataset.id);

    if (error) toast.error("Failed to add record.");
    else {
      toast.success("Record added to dataset.");
      setShowManualEntry(false);
      await refetch();
    }
  };

  const handleCleanMissing = async () => {
    if (!dataset) return;
    setCleaningMissing(true);
    const rows = dataset.data as Record<string, any>[];
    const cleaned = rows.filter(r => {
      return dataset.columns.every(col => r[col] !== null && r[col] !== undefined && r[col] !== "");
    });
    const removed = rows.length - cleaned.length;
    const summary = computeSummary(cleaned, dataset.columns);
    const { error } = await supabase.from("datasets").update({
      data: cleaned, row_count: cleaned.length, summary,
    }).eq("id", dataset.id);
    if (error) toast.error("Cleaning failed.");
    else {
      toast.success(`Removed ${removed} rows with missing values. ${cleaned.length} rows remaining.`);
      await refetch();
    }
    setCleaningMissing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rows = (dataset?.data ?? []) as Record<string, any>[];
  const featureImportance = dataset ? computeFeatureImportance(dataset.columns) : [];

  const tabItems = [
    { id: "upload" as const, label: "Upload" },
    { id: "preview" as const, label: "Data Preview" },
    { id: "cleaning" as const, label: "Data Cleaning" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dataset & EDA</h1>
          <p className="text-sm text-muted-foreground">Upload, manage, and explore your accident data</p>
        </div>
        {dataset && (
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-all"
          >
            {showManualEntry ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showManualEntry ? "Cancel" : "Add Record"}
          </button>
        )}
      </div>

      {/* Manual entry form */}
      {showManualEntry && dataset && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Manual Accident Record Entry</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(manualForm).map(([key, val]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground capitalize mb-1 block">{key.replace(/([A-Z])/g, " $1")}</label>
                {key === "severity" ? (
                  <select value={val} onChange={e => setManualForm({ ...manualForm, [key]: e.target.value })}
                    className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {["Low", "Medium", "High", "Fatal"].map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : key === "weather" ? (
                  <select value={val} onChange={e => setManualForm({ ...manualForm, [key]: e.target.value })}
                    className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {["Clear", "Rain", "Fog", "Snow", "Storm"].map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : key === "vehicleType" ? (
                  <select value={val} onChange={e => setManualForm({ ...manualForm, [key]: e.target.value })}
                    className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {["Car", "Truck", "Bike", "Bus", "Auto"].map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : key === "roadType" ? (
                  <select value={val} onChange={e => setManualForm({ ...manualForm, [key]: e.target.value })}
                    className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {["Highway", "Urban Road", "Rural Road", "Intersection", "Bridge"].map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="text" value={val} onChange={e => setManualForm({ ...manualForm, [key]: e.target.value })}
                    placeholder={key === "latitude" ? "16.5062" : key === "longitude" ? "80.6480" : key === "speed" ? "60" : key === "time" ? "14:00" : ""}
                    className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleManualEntry}
            className="mt-4 px-6 py-2 rounded-lg text-sm font-semibold text-primary-foreground neon-glow"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
            Add to Dataset
          </button>
        </motion.div>
      )}

      {/* Tabs */}
      {dataset && (
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit">
          {tabItems.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* UPLOAD TAB / no dataset */}
      {(!dataset || activeTab === "upload") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8">
          {!dataset ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                dragOver ? "border-primary/60 bg-primary/5" : "border-primary/20 hover:border-primary/40"
              }`}>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <p className="text-foreground font-medium">Processing your CSV…</p>
                </div>
              ) : (
                <>
                  <Database className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                  <p className="text-foreground font-medium mb-1">Drop your accident dataset here</p>
                  <p className="text-xs text-muted-foreground mb-1">CSV files only • Max 5MB</p>
                  <p className="text-xs text-muted-foreground mb-4">Required: columns like time, weather, road type, severity, speed</p>
                  <button className="mt-2 px-6 py-2 rounded-lg text-sm font-medium text-primary-foreground neon-glow"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                    Browse File
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20 justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{dataset.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataset.row_count.toLocaleString()} records • {dataset.column_count} columns
                    </p>
                  </div>
                </div>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remove & Re-upload
                </button>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { handleDelete().then(() => handleDrop(e)); }}
                onClick={() => { handleDelete(); }}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-primary/20 hover:border-primary/40 transition-all">
                <Upload className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Click to replace with a new dataset</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* PREVIEW TAB */}
      {dataset && activeTab === "preview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Records", value: dataset.row_count.toLocaleString() },
              { label: "Features", value: dataset.column_count },
              { label: "Missing Values", value: (dataset.summary as any)?.missing ?? 0 },
              { label: "Uploaded", value: new Date(dataset.created_at).toLocaleDateString() },
            ].map((s) => (
              <div key={s.label} className="glass-card-subtle p-4 text-center">
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Feature Relevance
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={featureImportance} layout="vertical">
                <XAxis type="number" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} />
                <YAxis dataKey="feature" type="category" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ background: "hsl(222 40% 10%)", border: "1px solid hsl(222 20% 18%)", borderRadius: "8px", color: "hsl(210 40% 95%)" }} />
                <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Table className="w-4 h-4 text-primary" /> Data Preview (first 10 rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {dataset.columns.slice(0, 10).map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                      {dataset.columns.slice(0, 10).map((col, j) => (
                        <td key={j} className="px-3 py-2 text-foreground whitespace-nowrap">{String(row[col] ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dataset.column_count > 10 && (
              <p className="text-xs text-muted-foreground mt-2">Showing first 10 of {dataset.column_count} columns.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* CLEANING TAB */}
      {dataset && activeTab === "cleaning" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Data Quality Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="glass-card-subtle p-4 text-center">
                <div className="text-xl font-bold text-foreground">{dataset.row_count}</div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="glass-card-subtle p-4 text-center">
                <div className="text-xl font-bold text-warning">{(dataset.summary as any)?.missing ?? 0}</div>
                <div className="text-xs text-muted-foreground">Missing Values</div>
              </div>
              <div className="glass-card-subtle p-4 text-center">
                <div className="text-xl font-bold text-success">{dataset.column_count}</div>
                <div className="text-xs text-muted-foreground">Features</div>
              </div>
            </div>

            {/* Per-column missing values */}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Column-level Analysis</h4>
            <div className="overflow-x-auto rounded-lg border border-border max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Column</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Missing</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Unique</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.columns.map(col => {
                    const info = (dataset.summary as any)?.perColumn?.[col];
                    const nullCount = info?.nullCount ?? 0;
                    const quality = dataset.row_count > 0 ? ((dataset.row_count - nullCount) / dataset.row_count * 100).toFixed(0) : "100";
                    return (
                      <tr key={col} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground font-medium">{col}</td>
                        <td className="px-3 py-2 text-muted-foreground">{nullCount}</td>
                        <td className="px-3 py-2 text-muted-foreground">{info?.unique ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${quality}%` }} />
                            </div>
                            <span className="text-muted-foreground">{quality}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleaning actions */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Data Cleaning Actions</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={handleCleanMissing}
                disabled={cleaningMissing || (dataset.summary as any)?.missing === 0}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 text-left"
              >
                {cleaningMissing ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" /> : <Trash2 className="w-5 h-5 text-primary shrink-0" />}
                <div>
                  <div className="text-sm font-medium text-foreground">Remove Missing Values</div>
                  <div className="text-xs text-muted-foreground">Drop all rows with null/empty fields</div>
                </div>
              </button>
              <button
                onClick={async () => {
                  if (!dataset) return;
                  setRemovingDuplicates(true);
                  const rows = dataset.data as Record<string, any>[];
                  const seen = new Set<string>();
                  const unique = rows.filter(r => {
                    const key = JSON.stringify(dataset.columns.map(col => r[col]));
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  const removed = rows.length - unique.length;
                  if (removed === 0) {
                    toast.info("No duplicate rows found.");
                    setRemovingDuplicates(false);
                    return;
                  }
                  const summary = computeSummary(unique, dataset.columns);
                  const { error } = await supabase.from("datasets").update({
                    data: unique, row_count: unique.length, summary,
                  }).eq("id", dataset.id);
                  if (error) toast.error("Removing duplicates failed.");
                  else {
                    toast.success(`Removed ${removed} duplicate rows. ${unique.length} rows remaining.`);
                    await refetch();
                  }
                  setRemovingDuplicates(false);
                }}
                disabled={removingDuplicates}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 text-left"
              >
                {removingDuplicates ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" /> : <AlertCircle className="w-5 h-5 text-primary shrink-0" />}
                <div>
                  <div className="text-sm font-medium text-foreground">Remove Duplicates</div>
                  <div className="text-xs text-muted-foreground">Drop all duplicate rows based on all columns</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DatasetPage;
