import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { useDataset } from "@/hooks/useDataset";
import { Database, Upload, Filter, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const tooltipStyle = {
  background: "hsl(222 40% 10%)",
  border: "1px solid hsl(222 20% 18%)",
  borderRadius: "8px",
  color: "hsl(210 40% 95%)",
};
const tickStyle = { fill: "hsl(215 20% 55%)", fontSize: 11 };
const CHART_COLORS = [
  "hsl(185 80% 55%)", "hsl(260 60% 55%)", "hsl(38 92% 50%)",
  "hsl(142 71% 45%)", "hsl(0 72% 51%)", "hsl(200 70% 50%)",
  "hsl(320 70% 55%)", "hsl(45 90% 55%)",
];

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">{message}</div>
);

const AnalyticsPage = () => {
  const { dataset, loading } = useDataset();
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "distribution">("overview");

  const rows = useMemo(() => {
    if (!dataset) return [];
    const all = dataset.data as Record<string, any>[];
    if (severityFilter === "All") return all;
    const sevCol = dataset.columns.find(c => /severity/i.test(c));
    if (!sevCol) return all;
    return all.filter(r => String(r[sevCol] ?? "") === severityFilter);
  }, [dataset, severityFilter]);

  const columns = dataset?.columns ?? [];

  // Column finders
  const findCol = (pattern: RegExp) => columns.find(c => pattern.test(c.toLowerCase()));
  const weatherCol = findCol(/weather/);
  const vehicleCol = findCol(/vehicle|type/);
  const roadCol = findCol(/road/);
  const hourCol = findCol(/hour|time/);
  const severityCol = findCol(/severity/);
  const monthCol = findCol(/month/);
  const yearCol = findCol(/year/);
  const dayCol = findCol(/day|weekday/);
  const speedCol = findCol(/speed/);
  const ageCol = findCol(/age/);

  // Count by column
  const countBy = (col: string | undefined, limit = 10) => {
    if (!col) return null;
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const v = String(r[col] ?? "Unknown");
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
  };

  // Severity options
  const severityOptions = useMemo(() => {
    if (!dataset || !severityCol) return ["All"];
    const set = new Set<string>();
    (dataset.data as Record<string, any>[]).forEach(r => {
      const v = String(r[severityCol] ?? "");
      if (v) set.add(v);
    });
    return ["All", ...Array.from(set).sort()];
  }, [dataset, severityCol]);

  // Chart data
  const weatherData = countBy(weatherCol);
  const vehicleData = countBy(vehicleCol);
  const roadData = countBy(roadCol);
  const severityData = countBy(severityCol);
  const monthData = countBy(monthCol, 12);
  const dayData = countBy(dayCol, 7);

  // Hourly
  const hourCounts: Record<string, number> = {};
  if (hourCol) {
    rows.forEach(r => {
      const raw = String(r[hourCol] ?? "");
      const h = raw.split(":")[0];
      if (!isNaN(Number(h))) hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
  }
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, accidents: hourCounts[String(i)] || 0 }));
  const hasHourly = Object.keys(hourCounts).length > 0;

  // Speed distribution
  const speedBuckets = useMemo(() => {
    if (!speedCol) return null;
    const buckets: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
    rows.forEach(r => {
      const s = parseFloat(r[speedCol!]);
      if (isNaN(s)) return;
      if (s <= 30) buckets["0-30"]++;
      else if (s <= 60) buckets["31-60"]++;
      else if (s <= 90) buckets["61-90"]++;
      else if (s <= 120) buckets["91-120"]++;
      else buckets["120+"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [rows, speedCol]);

  // Radar data for multi-factor
  const radarData = useMemo(() => {
    const factors: { factor: string; value: number }[] = [];
    if (weatherData) factors.push({ factor: "Weather Variety", value: weatherData.length });
    if (vehicleData) factors.push({ factor: "Vehicle Types", value: vehicleData.length });
    if (roadData) factors.push({ factor: "Road Types", value: roadData.length });
    if (severityData) factors.push({ factor: "Severity Levels", value: severityData.length });
    if (hasHourly) factors.push({ factor: "Peak Hours", value: Object.values(hourCounts).filter(v => v > (rows.length / 24)).length });
    if (dayData) factors.push({ factor: "Day Variation", value: dayData.length });
    return factors.length >= 3 ? factors : null;
  }, [weatherData, vehicleData, roadData, severityData, hasHourly, dayData, hourCounts, rows.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Deep-dive into accident patterns and trends</p>
        </div>
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <Database className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <h2 className="text-base font-semibold text-foreground mb-2">No dataset uploaded yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-5">
            Upload a CSV accident dataset to visualize patterns by weather, vehicle type, road type, and more.
          </p>
          <Link
            to="/dataset"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-primary-foreground neon-glow"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary))" }}
          >
            <Upload className="w-4 h-4" /> Upload Dataset
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "trends" as const, label: "Trends", icon: TrendingUp },
    { id: "distribution" as const, label: "Distribution", icon: Filter },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Patterns from <span className="text-primary">{dataset.filename}</span> ({rows.length.toLocaleString()} records{severityFilter !== "All" ? `, filtered: ${severityFilter}` : ""})
          </p>
        </div>
        {severityCol && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="rounded-lg bg-muted/50 border border-border px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {severityOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: rows.length.toLocaleString() },
          { label: "Features", value: columns.length },
          { label: "Weather Types", value: weatherData?.length ?? "—" },
          { label: "Vehicle Types", value: vehicleData?.length ?? "—" },
        ].map(s => (
          <div key={s.label} className="glass-card-subtle p-4 text-center">
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Accidents by Weather</h3>
            {weatherData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weatherData}>
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {weatherData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No weather column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Vehicle Type Analysis</h3>
            {vehicleData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vehicleData} layout="vertical">
                  <XAxis type="number" tick={tickStyle} />
                  <YAxis dataKey="name" type="category" tick={tickStyle} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {vehicleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No vehicle column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h3>
            {severityData ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie data={severityData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {severityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {severityData.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{s.name}: {s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart message="No severity column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Road Type Distribution</h3>
            {roadData ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={roadData}>
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" fill="hsl(var(--secondary) / 0.3)" stroke="hsl(var(--secondary))" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No road type column detected" />}
          </motion.div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Hourly Trend</h3>
            {hasHourly ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={tickStyle} interval={3} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="accidents" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No hour/time column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Accidents</h3>
            {monthData ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthData}>
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No month column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Day of Week Analysis</h3>
            {dayData ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dayData}>
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {dayData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No day/weekday column detected" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Speed Distribution</h3>
            {speedBuckets ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={speedBuckets}>
                  <XAxis dataKey="range" tick={tickStyle} />
                  <YAxis tick={tickStyle} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No speed column detected" />}
          </motion.div>
        </div>
      )}

      {activeTab === "distribution" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Multi-Factor Radar</h3>
            {radarData ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(222 20% 18%)" />
                  <PolarAngleAxis dataKey="factor" tick={tickStyle} />
                  <PolarRadiusAxis tick={tickStyle} />
                  <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="Not enough data dimensions for radar chart" />}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Weather × Severity Breakdown</h3>
            {weatherCol && severityCol ? (() => {
              const cross: Record<string, Record<string, number>> = {};
              rows.forEach(r => {
                const w = String(r[weatherCol] ?? "Unknown");
                const s = String(r[severityCol] ?? "Unknown");
                if (!cross[w]) cross[w] = {};
                cross[w][s] = (cross[w][s] || 0) + 1;
              });
              const allSev = Array.from(new Set(rows.map(r => String(r[severityCol] ?? "Unknown"))));
              const chartData = Object.entries(cross).map(([weather, sevs]) => ({
                weather,
                ...sevs,
              }));
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="weather" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {allSev.map((s, i) => (
                      <Bar key={s} dataKey={s} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              );
            })() : <EmptyChart message="Need weather & severity columns for cross-analysis" />}
          </motion.div>

          {/* Data summary table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Column Summary</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Column</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Unique Values</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Missing</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Top Value</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.slice(0, 15).map(col => {
                    const vals = rows.map(r => r[col]);
                    const nulls = vals.filter(v => v === null || v === undefined || v === "").length;
                    const freq: Record<string, number> = {};
                    vals.forEach(v => {
                      const s = String(v ?? "");
                      if (s) freq[s] = (freq[s] || 0) + 1;
                    });
                    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={col} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground font-medium">{col}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Set(vals).size}</td>
                        <td className="px-3 py-2 text-muted-foreground">{nulls}</td>
                        <td className="px-3 py-2 text-muted-foreground">{top ? `${top[0]} (${top[1]})` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
