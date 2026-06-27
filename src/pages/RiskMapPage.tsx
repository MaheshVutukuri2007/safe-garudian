import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet.heat";
import { MapPin, AlertTriangle, Database, Upload, Loader2 } from "lucide-react";
import { useDataset } from "@/hooks/useDataset";
import { Link } from "react-router-dom";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// --- Types ---
interface Point {
  lat: number;
  lng: number;
  severity: string;
}

interface Cluster {
  centroidLat: number;
  centroidLng: number;
  points: Point[];
  dominantSeverity: string;
  count: number;
}

// --- Haversine distance (km) ---
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// --- DBSCAN ---
const dbscan = (points: Point[], epsKm: number, minSamples: number): Cluster[] => {
  const n = points.length;
  const labels = new Int16Array(n).fill(-1); // -1 unvisited
  let clusterId = 0;

  const regionQuery = (idx: number) => {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (haversineDistance(points[idx].lat, points[idx].lng, points[i].lat, points[i].lng) <= epsKm) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = regionQuery(i);
    if (neighbors.length < minSamples) {
      labels[i] = -2; // noise
      continue;
    }
    labels[i] = clusterId;
    const seed = new Set(neighbors);
    const queue = [...neighbors];
    for (let j = 0; j < queue.length; j++) {
      const q = queue[j];
      if (labels[q] === -2) labels[q] = clusterId;
      if (labels[q] !== -1 && labels[q] !== clusterId) continue;
      if (labels[q] === -1) {
        labels[q] = clusterId;
        const qNeighbors = regionQuery(q);
        if (qNeighbors.length >= minSamples) {
          for (const nb of qNeighbors) {
            if (!seed.has(nb)) {
              seed.add(nb);
              queue.push(nb);
            }
          }
        }
      }
    }
    clusterId++;
  }

  const clusterMap: Record<number, Point[]> = {};
  labels.forEach((label, idx) => {
    if (label >= 0) {
      if (!clusterMap[label]) clusterMap[label] = [];
      clusterMap[label].push(points[idx]);
    }
  });

  return Object.values(clusterMap).map((pts) => {
    const centroidLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const centroidLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    const freq: Record<string, number> = {};
    pts.forEach((p) => {
      freq[p.severity] = (freq[p.severity] || 0) + 1;
    });
    const dominantSeverity = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return { centroidLat, centroidLng, points: pts, dominantSeverity, count: pts.length };
  });
};

// --- Severity → heat intensity ---
const getIntensity = (severity: string): number => {
  switch (severity) {
    case "Low": return 0.3;
    case "Medium": return 0.6;
    case "High": return 0.85;
    case "Fatal": return 1.0;
    default: return 0.5;
  }
};

const getRecommendation = (severity: string) => {
  switch (severity) {
    case "Fatal": return "Install speed cameras, increase patrol frequency";
    case "High": return "Add warning signage & speed breakers";
    case "Medium": return "Improve road lighting & markings";
    default: return "Maintain existing traffic measures";
  }
};

const VIJAYAWADA = { lat: 16.5062, lng: 80.648 };
const MAX_POINTS = 5000;
const DBSCAN_EPS_KM = 1.0;
const DBSCAN_MIN_SAMPLES = 5;

const RiskMapPage = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { dataset, loading } = useDataset();
  const [mapError, setMapError] = useState<string | null>(null);

  // Parse valid points from dataset
  const { heatPoints, allPoints, hasLatLng } = useMemo(() => {
    if (!dataset || !dataset.data.length)
      return { heatPoints: [] as [number, number, number][], allPoints: [] as Point[], hasLatLng: false };

    const cols = dataset.columns.map((c) => c.toLowerCase());
    const latCol = dataset.columns.find((_, i) => /^lat/.test(cols[i]) || cols[i] === "latitude");
    const lngCol = dataset.columns.find(
      (_, i) => /^lon/.test(cols[i]) || /^lng/.test(cols[i]) || cols[i] === "longitude"
    );
    const sevCol = dataset.columns.find((_, i) => cols[i].includes("severity"));

    if (!latCol || !lngCol)
      return { heatPoints: [] as [number, number, number][], allPoints: [] as Point[], hasLatLng: false };

    const rows = dataset.data as Record<string, any>[];
    const points: Point[] = [];
    const heat: [number, number, number][] = [];

    for (const r of rows) {
      if (points.length >= MAX_POINTS) break;
      const lat = parseFloat(r[latCol]);
      const lng = parseFloat(r[lngCol]);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;
      const severity = String(r[sevCol ?? ""] ?? "Low");
      points.push({ lat, lng, severity });
      heat.push([lat, lng, getIntensity(severity)]);
    }

    return { heatPoints: heat, allPoints: points, hasLatLng: true };
  }, [dataset]);

  // Compute clusters
  const clusters = useMemo(() => {
    if (allPoints.length < DBSCAN_MIN_SAMPLES) return [];
    return dbscan(allPoints, DBSCAN_EPS_KM, DBSCAN_MIN_SAMPLES);
  }, [allPoints]);

  // Render map
  useEffect(() => {
    if (loading || !dataset || !hasLatLng) return;
    if (!mapContainerRef.current) return;

    setMapError(null);

    // Clean up previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];
    try {
      const map = L.map(mapContainerRef.current, {
        center: [VIJAYAWADA.lat, VIJAYAWADA.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });

      // Use OpenStreetMap tiles (most reliable, no API key)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Force map to recalculate its size after the container is fully visible
      // Multiple invalidateSize calls to handle animation/layout timing
      const timers = [100, 300, 600, 1000].map((ms) =>
        setTimeout(() => map.invalidateSize(), ms)
      );

      // Add heatmap layer
      if (heatPoints.length > 0) {
        (L as any).heatLayer(heatPoints, {
          radius: 25,
          blur: 20,
          maxZoom: 17,
          max: 1.0,
          gradient: {
            0.3: "blue",
            0.6: "yellow",
            0.8: "orange",
            1.0: "red",
          },
        }).addTo(map);
      }

      // Add cluster markers
      clusters.forEach((cluster) => {
        const isHighRisk =
          cluster.dominantSeverity === "High" || cluster.dominantSeverity === "Fatal";
        const color =
          cluster.dominantSeverity === "Fatal"
            ? "#ef4444"
            : cluster.dominantSeverity === "High"
              ? "#f97316"
              : cluster.dominantSeverity === "Medium"
                ? "#eab308"
                : "#22c55e";

        // Red filled circle for high-risk zones
        L.circle([cluster.centroidLat, cluster.centroidLng], {
          radius: 300,
          color: color,
          fillColor: color,
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);

        if (isHighRisk) {
          // Pulsing marker for high-risk
          const pulseIcon = L.divIcon({
            className: "",
            html: `
              <div style="position:relative;width:40px;height:40px">
                <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:pulse-ring 2s ease-out infinite"></div>
                <div style="position:absolute;inset:8px;border-radius:50%;background:${color};opacity:0.5;animation:pulse-ring 2s ease-out infinite 0.4s"></div>
                <div style="position:absolute;inset:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 12px ${color}"></div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          L.marker([cluster.centroidLat, cluster.centroidLng], { icon: pulseIcon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:system-ui;padding:6px;min-width:200px">
                <div style="font-weight:700;font-size:14px;color:${color};margin-bottom:8px">⚠ HIGH RISK ZONE</div>
                <div style="font-size:12px;color:#555">Accident count: <strong>${cluster.count}</strong></div>
                <div style="font-size:12px;color:#555">Most common severity: <strong style="color:${color}">${cluster.dominantSeverity}</strong></div>
                <div style="font-size:11px;color:#777;margin-top:8px;border-top:1px solid #ddd;padding-top:8px">
                  💡 ${getRecommendation(cluster.dominantSeverity)}
                </div>
              </div>`
            );
        } else {
          L.circleMarker([cluster.centroidLat, cluster.centroidLng], {
            radius: 8,
            fillColor: color,
            fillOpacity: 0.8,
            color: "#fff",
            weight: 2,
          })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:system-ui;padding:6px;min-width:180px">
                <div style="font-weight:700;font-size:13px;color:${color}">Accident Cluster</div>
                <div style="font-size:12px;color:#555;margin-top:4px">Accident count: <strong>${cluster.count}</strong></div>
                <div style="font-size:12px;color:#555">Severity: <strong style="color:${color}">${cluster.dominantSeverity}</strong></div>
                <div style="font-size:11px;color:#777;margin-top:8px;border-top:1px solid #ddd;padding-top:8px">
                  💡 ${getRecommendation(cluster.dominantSeverity)}
                </div>
              </div>`
            );
        }
      });

      // Fit bounds to data
      if (heatPoints.length > 0) {
        const lats = heatPoints.map((p) => p[0]);
        const lngs = heatPoints.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [50, 50], maxZoom: 15 }
        );
      }

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error("Map render error:", err);
      setMapError(err.message || "Failed to render map");
    }

    return () => {
      timers.forEach(clearTimeout);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, dataset, heatPoints, clusters, hasLatLng]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">High-Risk Zone Map</h1>
        <p className="text-sm text-muted-foreground">
          Heatmap & DBSCAN clustering from your uploaded dataset
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading dataset…</p>
        </div>
      )}

      {/* No dataset uploaded */}
      {!loading && !dataset && (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <Database className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            No accident data available. Please upload dataset.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-5">
            Upload a CSV with latitude, longitude, and severity columns to generate the heatmap.
          </p>
          <Link
            to="/dataset"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-primary-foreground neon-glow"
            style={{ background: "linear-gradient(135deg, hsl(185 80% 55%), hsl(260 60% 55%))" }}
          >
            <Upload className="w-4 h-4" /> Upload Dataset
          </Link>
        </div>
      )}

      {/* Dataset exists but no lat/lng columns */}
      {!loading && dataset && !hasLatLng && (
        <div className="glass-card p-8 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No location columns detected</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Your dataset doesn't have <code className="text-primary">latitude</code> /{" "}
            <code className="text-primary">longitude</code> columns. Re-upload with location data.
          </p>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Map error: {mapError}
        </div>
      )}

      {/* Map with legend */}
      {!loading && dataset && hasLatLng && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Fatal", color: "#ef4444" },
                { label: "High", color: "#f97316" },
                { label: "Medium", color: "#eab308" },
                { label: "Low", color: "#22c55e" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {heatPoints.length.toLocaleString()} points · {clusters.length} cluster
              {clusters.length !== 1 ? "s" : ""} detected
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="glass-card overflow-hidden rounded-xl"
          >
            <div
              ref={mapContainerRef}
              style={{ width: "100%", height: "600px", minHeight: "500px" }}
            />
          </motion.div>
        </>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RiskMapPage;
