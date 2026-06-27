import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Map, BarChart3, Shield, ArrowRight, AlertTriangle, Zap, Eye } from "lucide-react";

const features = [
  { icon: Brain, title: "AI Prediction", desc: "OOP concept based accident probability scoring with severity classification" },
  { icon: Map, title: "Risk Heatmap", desc: "Interactive map showing high-risk zones and danger clusters" },
  { icon: BarChart3, title: "Smart Analytics", desc: "Time, weather, and vehicle-based accident pattern analysis" },
  { icon: Shield, title: "Prevention AI", desc: "Intelligent safety suggestions and real-time alert systems" },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm">
            <Zap className="w-4 h-4" />
            AI-Powered Road Safety Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Predict. Prevent.</span>
            <br />
            <span className="gradient-text">Protect Lives.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Advanced OOP concept based system that predicts road accident risks,
            identifies high-danger zones, and provides actionable safety insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-primary-foreground transition-all duration-300 neon-glow hover:neon-glow-strong"
              style={{ background: "linear-gradient(135deg, hsl(185 80% 55%), hsl(260 60% 55%))" }}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all duration-300"
            >
              <Eye className="w-4 h-4" />
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Floating indicator */}
        <motion.div
          className="absolute bottom-10 flex flex-col items-center text-muted-foreground"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-xs mb-2">Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-primary" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Core <span className="gradient-text">Capabilities</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comprehensive accident risk intelligence powered by OOP concept based algorithms
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:neon-glow transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "98.5%", label: "Prediction Accuracy" },
            { value: "1,200+", label: "Risk Zones Mapped" },
            { value: "50K+", label: "Accidents Analyzed" },
            { value: "24/7", label: "Real-time Monitoring" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass-card p-10 text-center"
        >
          <AlertTriangle className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Start Analyzing Road Safety Now
          </h2>
          <p className="text-muted-foreground mb-6">
            Upload your dataset or use our prediction engine to identify risks in your area.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-primary-foreground neon-glow"
            style={{ background: "linear-gradient(135deg, hsl(185 80% 55%), hsl(260 60% 55%))" }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
