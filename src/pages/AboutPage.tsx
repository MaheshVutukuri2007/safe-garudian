import { motion } from "framer-motion";
import {
  Brain, Database, Map, BarChart3, Shield, Code, Lock, GitBranch,
  Layers, Boxes, Cpu,
} from "lucide-react";

const techStack = [
  { icon: Code, name: "React + Vite", desc: "Frontend framework" },
  { icon: Database, name: "OOP Engine", desc: "OOP-based prediction model" },
  { icon: Map, name: "Leaflet.js", desc: "Interactive maps" },
  { icon: BarChart3, name: "Recharts", desc: "Data visualization" },
];

const oopClasses = [
  { name: "User", role: "Base class — holds account info, role checks", parent: null },
  { name: "Admin", role: "Inherits from User — full permissions, can delete data", parent: "User" },
  { name: "AccidentData", role: "Encapsulates a single accident record", parent: null },
  { name: "DataCollector", role: "Aggregates records, cleans missing data", parent: null },
  { name: "Reportable", role: "Abstract base — defines generateReport() contract", parent: null },
  { name: "AbstractAnalyzer", role: "Abstract base for analyzers — extends Reportable", parent: "Reportable" },
  { name: "DataAnalyzer", role: "Concrete analyzer — severity & weather breakdowns", parent: "AbstractAnalyzer" },
  { name: "AbstractPredictor", role: "Abstract base for predictors — extends Reportable", parent: "Reportable" },
  { name: "PredictionModel", role: "Predicts risk % and severity from input features", parent: "AbstractPredictor" },
  { name: "RiskZoneIdentifier", role: "DBSCAN clustering — identifies high-risk zones", parent: "Reportable" },
  { name: "AlertSystem", role: "Raises alerts from risk zones — extends Reportable", parent: "Reportable" },
];

const oopConcepts = [
  {
    icon: Lock,
    name: "Encapsulation",
    desc: "All classes use private (_) and protected fields with public getters. Internal state (e.g. User._displayName, AccidentData._severity) cannot be mutated directly.",
  },
  {
    icon: GitBranch,
    name: "Inheritance",
    desc: "Admin extends User. DataAnalyzer extends AbstractAnalyzer extends Reportable. PredictionModel extends AbstractPredictor extends Reportable.",
  },
  {
    icon: Layers,
    name: "Polymorphism",
    desc: "Every module overrides generateReport() with its own tailored output — DataAnalyzer, PredictionModel, RiskZoneIdentifier, and AlertSystem each produce a different report format.",
  },
  {
    icon: Boxes,
    name: "Abstraction",
    desc: "Abstract base classes Reportable, AbstractAnalyzer, and AbstractPredictor define contracts. Subclasses must implement analyze(), predict(), and generateReport().",
  },
  {
    icon: Cpu,
    name: "Objects & Classes",
    desc: "Every module operates through class instances: const collector = new DataCollector(); const predictor = new PredictionModel(); etc.",
  },
];

const AboutPage = () => {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-2">About This Project</h1>
        <p className="text-sm text-muted-foreground">
          AI Road Accident Risk Prediction & High-Risk Zone Identification System
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center neon-glow">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">AI RiskGuard</h2>
            <p className="text-xs text-muted-foreground">OOP Concept Based Analytics Platform</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This system combines OOP concept based algorithms with real-time data analytics
          to predict road accident probabilities and identify high-risk zones. It helps traffic authorities,
          city planners, and drivers make informed decisions to reduce accident rates and save lives.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Key Features</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Accident probability prediction (0-100%)",
            "Severity classification: Low / Medium / High / Fatal",
            "High-risk zone clustering using OOP concepts",
            "Interactive heatmap visualization",
            "Time & weather-based analysis",
            "AI-powered safety recommendations",
            "Dataset upload and EDA",
            "Real-time risk alerts",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Technology Stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {techStack.map((t) => (
            <div key={t.name} className="glass-card-subtle p-4 text-center">
              <t.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-xs font-medium text-foreground">{t.name}</div>
              <div className="text-[10px] text-muted-foreground">{t.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* OOP ARCHITECTURE SECTION */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">OOP Architecture</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The system's internal logic is structured around object-oriented programming principles.
          Source: <code className="text-primary">src/lib/oop/index.ts</code>
        </p>

        {/* OOP Concepts */}
        <div className="grid sm:grid-cols-2 gap-3">
          {oopConcepts.map((c) => (
            <div key={c.name} className="glass-card-subtle p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Classes Table */}
        <div className="glass-card-subtle p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Classes Implemented</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">Class</th>
                  <th className="text-left py-2 pr-3 font-medium">Inherits From</th>
                  <th className="text-left py-2 font-medium">Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {oopClasses.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-primary">{c.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {c.parent ? <code className="text-foreground">{c.parent}</code> : <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="py-2 text-muted-foreground">{c.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inheritance Diagram (ASCII) */}
        <div className="glass-card-subtle p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Inheritance Hierarchy</h4>
          <pre className="text-[10px] sm:text-xs text-muted-foreground font-mono overflow-x-auto leading-relaxed">
{`User
 └── Admin

Reportable  (abstract)
 ├── AbstractAnalyzer  (abstract)
 │    └── DataAnalyzer
 ├── AbstractPredictor  (abstract)
 │    └── PredictionModel
 ├── RiskZoneIdentifier
 └── AlertSystem

AccidentData   (standalone, encapsulated entity)
DataCollector  (standalone, aggregates AccidentData)`}
          </pre>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">Built with ❤️ for safer roads</p>
        <p className="text-xs text-muted-foreground">AI Road Accident Risk Prediction System © 2026</p>
      </motion.div>
    </div>
  );
};

export default AboutPage;
