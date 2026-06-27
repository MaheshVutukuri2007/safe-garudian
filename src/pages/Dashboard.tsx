import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, MapPin, Clock, Activity, Upload, Database } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDataset } from "@/hooks/useDataset";
import { Link } from "react-router-dom";

const severityColors: Record<string, string> = {
  Low: "hsl(142, 71%, 45%)",
  Medium: "hsl(38, 92%, 50%)",
  High: "hsl(25, 95%, 53%)",
  Fatal: "hsl(0, 72%, 51%)",
};

const tooltipStyle = {
  background: "hsl(222 40% 10%)",
  border: "1px solid hsl(222 20% 18%)",
  borderRadius: "8px",
  color: "hsl(210 40% 95%)",
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
      <Database className="w-10 h-10 text-muted-foreground/40" />
    </div>
    <h2 className="text-lg font-semibold text-foreground mb-2">No dataset uploaded yet</h2>
    <p className="text-sm text-muted-foreground max-w-sm mb-6">
      Upload a CSV accident dataset to see your dashboard statistics, charts, and insights.
    </p>
    <Link
      to="/dataset"
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-primary-foreground neon-glow transition-all duration-300 hover:neon-glow-strong"
      style={{ background: "linear-gradient(135deg, hsl(185 80% 55%), hsl(260 60% 55%))" }}
    >
      <Upload className="w-4 h-4" /> Upload Dataset
    </Link>
  </div>
);

const Dashboard = () => {
  const { dataset, loading } = useDataset();

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
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time accident risk overview</p>
        </div>
        <div className="glass-card">
          <EmptyState />
        </div>
      </div>
    );
  }

  // Derive stats from real data
  const rows = dataset.data as Record<string, any>[];
  const totalAccidents = rows.length;

  // Count severity if column exists
  const severityCol = dataset.columns.find(c => c.toLowerCase().includes("severity") || c.toLowerCase().includes("sever"));
  const severityCounts: Record<string, number> = {};
  if (severityCol) {
    rows.forEach(r => {
      const v = String(r[severityCol] ?? "Unknown");
      severityCounts[v] = (severityCounts[v] || 0) + 1;
    });
  }
  const severityData = Object.entries(severityCounts).map(([severity, count]) => ({
    severity,
    count,
    color: severityColors[severity] || "hsl(185 80% 55%)",
  }));

  // Hourly distribution
  const hourCol = dataset.columns.find(c => c.toLowerCase().includes("hour") || c.toLowerCase().includes("time"));
  const hourCounts: Record<string, number> = {};
  if (hourCol) {
    rows.forEach(r => {
      const raw = String(r[hourCol] ?? "");
      const h = raw.length === 2 && !isNaN(Number(raw)) ? raw : raw.split(":")[0];
      if (h && !isNaN(Number(h))) {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });
  }
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    accidents: hourCounts[String(i)] || 0,
  }));

  const hasHourlyData = Object.keys(hourCounts).length > 0;
  const hasSeverityData = severityData.length > 0;

  const stats = [
    { icon: AlertTriangle, label: "Total Records", value: totalAccidents.toLocaleString(), color: "text-destructive" },
    { icon: Database, label: "Columns", value: dataset.column_count, color: "text-primary" },
    { icon: MapPin, label: "Dataset", value: dataset.filename.length > 14 ? dataset.filename.slice(0, 14) + "…" : dataset.filename, color: "text-warning" },
    { icon: Activity, label: "Severity Types", value: hasSeverityData ? severityData.length : "—", color: "text-success" },
    { icon: Clock, label: "Uploaded", value: new Date(dataset.created_at).toLocaleDateString(), color: "text-primary" },
    { icon: TrendingUp, label: "Status", value: "Active", color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of <span className="text-primary">{dataset.filename}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
            <div className="text-xl font-bold text-foreground truncate">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Accidents by Hour</h3>
          {hasHourlyData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} interval={3} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accidents" fill="hsl(185 80% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No time/hour column detected in dataset
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h3>
          {hasSeverityData ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={severityData} dataKey="count" nameKey="severity" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {severityData.map((s) => (
                  <div key={s.severity} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.severity}: {s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No severity column detected in dataset
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
