import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lightbulb, CheckCircle, Siren, CloudRain, Clock, Gauge,
  Bell, BellOff, Phone, AlertTriangle, Send, Loader2, MapPin, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDataset } from "@/hooks/useDataset";
import { toast } from "sonner";

const tips = [
  {
    icon: Gauge, title: "Speed Management",
    items: [
      "Keep below 60 km/h in urban areas",
      "Reduce speed by 20% in rain or fog",
      "Follow speed limit signs strictly at all times",
    ],
  },
  {
    icon: Clock, title: "Time Awareness",
    items: [
      "Avoid driving between 11 PM – 5 AM when possible",
      "Peak hours (8–10 AM, 5–8 PM) need extra caution",
      "Rest every 2 hours on long highway trips",
    ],
  },
  {
    icon: CloudRain, title: "Weather Preparedness",
    items: [
      "Turn on headlights in low visibility conditions",
      "Increase following distance in rain or snow",
      "Check weather forecast before long-distance trips",
    ],
  },
  {
    icon: Shield, title: "Vehicle Safety",
    items: [
      "Regular brake and tire pressure checks",
      "Ensure all indicator and headlights are working",
      "Carry an emergency kit at all times",
    ],
  },
];

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  location: string | null;
  is_read: boolean;
  created_at: string;
}

const PreventionPage = () => {
  const { user } = useAuth();
  const { dataset } = useDataset();
  const [activeTab, setActiveTab] = useState<"alerts" | "tips" | "emergency">("alerts");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ location: "", description: "", severity: "High" });
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoadingAlerts(true);
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setAlerts((data ?? []) as Alert[]);
    setLoadingAlerts(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  // Generate risk alerts from dataset
  const generateAlerts = async () => {
    if (!user || !dataset) {
      toast.error("Upload a dataset first to generate risk alerts.");
      return;
    }
    setSubmitting(true);

    const rows = dataset.data as Record<string, any>[];
    const sevCol = dataset.columns.find(c => /severity/i.test(c));
    const locCol = dataset.columns.find(c => /location|place|area|zone/i.test(c));

    // Count high-severity areas
    const highRiskAreas: Record<string, number> = {};
    rows.forEach(r => {
      const sev = String(r[sevCol ?? ""] ?? "").toLowerCase();
      if (sev === "high" || sev === "fatal") {
        const loc = String(r[locCol ?? ""] ?? "Unknown area");
        highRiskAreas[loc] = (highRiskAreas[loc] || 0) + 1;
      }
    });

    // Delete old generated alerts
    await supabase.from("alerts").delete().eq("user_id", user.id).eq("type", "risk");

    // Create new alerts
    const newAlerts = Object.entries(highRiskAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([loc, count]) => ({
        user_id: user.id,
        type: "risk",
        title: `High Risk Zone: ${loc}`,
        message: `${count} high-severity accidents detected in this area. Exercise extreme caution.`,
        severity: count > 5 ? "Fatal" : "High",
        location: loc,
      }));

    if (newAlerts.length === 0) {
      // Generate a generic alert
      newAlerts.push({
        user_id: user.id,
        type: "risk",
        title: "Dataset Analysis Complete",
        message: `Analyzed ${rows.length} records. No high-severity clusters found. Continue monitoring.`,
        severity: "Low",
        location: null,
      });
    }

    const { error } = await supabase.from("alerts").insert(newAlerts);
    if (error) toast.error("Failed to generate alerts.");
    else {
      toast.success(`Generated ${newAlerts.length} risk alerts from dataset.`);
      await fetchAlerts();
    }
    setSubmitting(false);
  };

  const submitEmergency = async () => {
    if (!user) return;
    if (!emergencyForm.location.trim() || !emergencyForm.description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      type: "emergency",
      title: `Emergency Report: ${emergencyForm.location}`,
      message: emergencyForm.description,
      severity: emergencyForm.severity,
      location: emergencyForm.location,
    });
    if (error) toast.error("Failed to submit report.");
    else {
      toast.success("Emergency report submitted!");
      setEmergencyForm({ location: "", description: "", severity: "High" });
      await fetchAlerts();
    }
    setSubmitting(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("alerts").delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success("Alert removed.");
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const tabItems = [
    { id: "alerts" as const, label: `Alerts${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: Bell },
    { id: "tips" as const, label: "Safety Tips", icon: Lightbulb },
    { id: "emergency" as const, label: "Emergency", icon: Phone },
  ];

  const sevStyle: Record<string, string> = {
    Low: "border-l-green-500 bg-green-500/5",
    Medium: "border-l-yellow-500 bg-yellow-500/5",
    High: "border-l-orange-500 bg-orange-500/5",
    Fatal: "border-l-red-500 bg-red-500/5",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prevention & Alerts</h1>
        <p className="text-sm text-muted-foreground">AI-powered safety recommendations & emergency system</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit">
        {tabItems.map(t => (
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

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</p>
            <button
              onClick={generateAlerts}
              disabled={submitting || !dataset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground neon-glow disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Siren className="w-4 h-4" />}
              Generate Risk Alerts
            </button>
          </div>

          {loadingAlerts ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : alerts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BellOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No alerts yet. Upload a dataset and generate risk alerts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-card p-4 border-l-4 ${sevStyle[alert.severity] || "border-l-primary"} ${alert.is_read ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {alert.type === "emergency" ? (
                          <Phone className="w-4 h-4 text-destructive shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                        )}
                        <h4 className="text-sm font-semibold text-foreground truncate">{alert.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          alert.severity === "Fatal" ? "severity-fatal" :
                          alert.severity === "High" ? "severity-high" :
                          alert.severity === "Medium" ? "severity-medium" : "severity-low"
                        }`}>{alert.severity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{alert.message}</p>
                      {alert.location && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {alert.location}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!alert.is_read && (
                        <button onClick={() => markRead(alert.id)} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Mark read">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteAlert(alert.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* SAFETY TIPS TAB */}
      {activeTab === "tips" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-5 flex items-start gap-3 border-l-4 border-l-primary">
            <Siren className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">AI Safety Intelligence</p>
              <p className="text-xs text-muted-foreground">
                These recommendations are generated based on common accident patterns and prevention research.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {tips.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <tip.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{tip.title}</h3>
                </div>
                <ul className="space-y-2">
                  {tip.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* EMERGENCY TAB */}
      {activeTab === "emergency" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass-card p-6 border-l-4 border-l-destructive">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Emergency Report</h3>
                <p className="text-xs text-muted-foreground">Report an accident or dangerous road condition</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Location / Area</label>
                <input
                  type="text"
                  value={emergencyForm.location}
                  onChange={e => setEmergencyForm({ ...emergencyForm, location: e.target.value })}
                  placeholder="e.g. MG Road Junction, Vijayawada"
                  className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-destructive"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Description</label>
                <textarea
                  value={emergencyForm.description}
                  onChange={e => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                  placeholder="Describe the accident or hazard..."
                  rows={3}
                  className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Severity</label>
                <select
                  value={emergencyForm.severity}
                  onChange={e => setEmergencyForm({ ...emergencyForm, severity: e.target.value })}
                  className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                >
                  {["Low", "Medium", "High", "Fatal"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button
                onClick={submitEmergency}
                disabled={submitting}
                className="w-full py-3 rounded-lg font-semibold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Emergency Report
              </button>
            </div>
          </div>

          {/* Emergency contacts */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Emergency Contacts</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { name: "Police", number: "100", color: "text-primary" },
                { name: "Ambulance", number: "108", color: "text-destructive" },
                { name: "Fire Brigade", number: "101", color: "text-warning" },
              ].map(c => (
                <div key={c.name} className="glass-card-subtle p-4 text-center">
                  <Phone className={`w-6 h-6 ${c.color} mx-auto mb-2`} />
                  <div className="text-sm font-semibold text-foreground">{c.name}</div>
                  <div className="text-lg font-bold text-foreground mt-1">{c.number}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PreventionPage;
