/**
 * Object-Oriented Architecture for AI Road Accident Risk Prediction System
 *
 * This module demonstrates core OOP principles:
 *  - Encapsulation: private/protected fields with public getters/methods
 *  - Inheritance: Admin extends User; concrete analyzers extend abstract base
 *  - Polymorphism: each module overrides generateReport() with its own behavior
 *  - Abstraction: AbstractAnalyzer and AbstractPredictor define contracts
 *  - Objects & Classes: every module operates through class instances
 */

// ============================================================================
// USER & ADMIN (Inheritance + Encapsulation)
// ============================================================================

export class User {
  protected _id: string;
  protected _email: string;
  private _displayName: string;
  private _createdAt: Date;

  constructor(id: string, email: string, displayName: string) {
    this._id = id;
    this._email = email;
    this._displayName = displayName;
    this._createdAt = new Date();
  }

  // Public getters (encapsulation)
  public get id(): string { return this._id; }
  public get email(): string { return this._email; }
  public get displayName(): string { return this._displayName; }
  public get createdAt(): Date { return this._createdAt; }

  public getRole(): string { return "user"; }

  public canUploadDataset(): boolean { return true; }
  public canDeleteAllData(): boolean { return false; }
}

export class Admin extends User {
  private _permissions: string[];

  constructor(id: string, email: string, displayName: string, permissions: string[] = ["all"]) {
    super(id, email, displayName);
    this._permissions = permissions;
  }

  public get permissions(): readonly string[] { return this._permissions; }

  // Override (polymorphism)
  public override getRole(): string { return "admin"; }
  public override canDeleteAllData(): boolean { return true; }

  public hasPermission(perm: string): boolean {
    return this._permissions.includes("all") || this._permissions.includes(perm);
  }
}

// ============================================================================
// ACCIDENT DATA (Encapsulation)
// ============================================================================

export type Severity = "Low" | "Medium" | "High" | "Fatal";

export class AccidentData {
  private _latitude: number;
  private _longitude: number;
  private _severity: Severity;
  private _weather: string;
  private _roadType: string;
  private _speed: number;
  private _vehicleType: string;
  private _timestamp: Date;

  constructor(params: {
    latitude: number;
    longitude: number;
    severity: Severity;
    weather: string;
    roadType: string;
    speed: number;
    vehicleType: string;
    timestamp?: Date;
  }) {
    this._latitude = params.latitude;
    this._longitude = params.longitude;
    this._severity = params.severity;
    this._weather = params.weather;
    this._roadType = params.roadType;
    this._speed = params.speed;
    this._vehicleType = params.vehicleType;
    this._timestamp = params.timestamp ?? new Date();
  }

  public get latitude(): number { return this._latitude; }
  public get longitude(): number { return this._longitude; }
  public get severity(): Severity { return this._severity; }
  public get weather(): string { return this._weather; }
  public get roadType(): string { return this._roadType; }
  public get speed(): number { return this._speed; }
  public get vehicleType(): string { return this._vehicleType; }
  public get timestamp(): Date { return this._timestamp; }

  public isHighRisk(): boolean {
    return this._severity === "High" || this._severity === "Fatal";
  }

  public toJSON(): Record<string, unknown> {
    return {
      latitude: this._latitude,
      longitude: this._longitude,
      severity: this._severity,
      weather: this._weather,
      roadType: this._roadType,
      speed: this._speed,
      vehicleType: this._vehicleType,
      timestamp: this._timestamp.toISOString(),
    };
  }
}

// ============================================================================
// DATA COLLECTOR
// ============================================================================

export class DataCollector {
  private _records: AccidentData[] = [];

  public add(record: AccidentData): void { this._records.push(record); }
  public addMany(records: AccidentData[]): void { this._records.push(...records); }
  public get records(): readonly AccidentData[] { return this._records; }
  public get size(): number { return this._records.length; }

  public clean(): { kept: AccidentData[]; removed: number } {
    const original = this._records.length;
    const kept = this._records.filter(r =>
      !isNaN(r.latitude) && !isNaN(r.longitude) && r.latitude !== 0 && r.longitude !== 0
    );
    return { kept, removed: original - kept.length };
  }

  public fromRawRows(rows: Record<string, any>[]): AccidentData[] {
    const find = (keys: string[]) =>
      Object.keys(rows[0] ?? {}).find(k => keys.some(kk => k.toLowerCase().includes(kk)));
    const latKey = find(["lat"]);
    const lngKey = find(["lon", "lng"]);
    const sevKey = find(["severity"]);
    const wthKey = find(["weather"]);
    const rdKey = find(["road"]);
    const spdKey = find(["speed"]);
    const vehKey = find(["vehicle"]);

    return rows.map(r => new AccidentData({
      latitude: parseFloat(r[latKey ?? ""] ?? NaN),
      longitude: parseFloat(r[lngKey ?? ""] ?? NaN),
      severity: (r[sevKey ?? ""] ?? "Low") as Severity,
      weather: String(r[wthKey ?? ""] ?? "Unknown"),
      roadType: String(r[rdKey ?? ""] ?? "Unknown"),
      speed: parseFloat(r[spdKey ?? ""] ?? 0) || 0,
      vehicleType: String(r[vehKey ?? ""] ?? "Unknown"),
    }));
  }
}

// ============================================================================
// ABSTRACT BASE: REPORTABLE (Abstraction + Polymorphism)
// ============================================================================

export abstract class Reportable {
  public abstract generateReport(): string;
}

// ============================================================================
// ABSTRACT ANALYZER (Abstraction)
// ============================================================================

export abstract class AbstractAnalyzer extends Reportable {
  protected _data: readonly AccidentData[];

  constructor(data: readonly AccidentData[]) {
    super();
    this._data = data;
  }

  public abstract analyze(): Record<string, number>;

  // Shared protected helper available to subclasses
  protected countBy<K extends keyof AccidentData>(key: K): Record<string, number> {
    const counts: Record<string, number> = {};
    this._data.forEach(d => {
      const v = String(d[key]);
      counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }
}

export class DataAnalyzer extends AbstractAnalyzer {
  public override analyze(): Record<string, number> {
    return {
      total: this._data.length,
      highRisk: this._data.filter(d => d.isHighRisk()).length,
      avgSpeed: this._data.reduce((s, d) => s + d.speed, 0) / Math.max(this._data.length, 1),
    };
  }

  // Polymorphism: each module's generateReport() returns a tailored string
  public override generateReport(): string {
    const a = this.analyze();
    return `Data Analysis Report — total=${a.total}, high-risk=${a.highRisk}, avg-speed=${a.avgSpeed.toFixed(1)} km/h`;
  }

  public severityBreakdown(): Record<string, number> {
    return this.countBy("severity");
  }

  public weatherBreakdown(): Record<string, number> {
    return this.countBy("weather");
  }
}

// ============================================================================
// ABSTRACT PREDICTOR (Abstraction)
// ============================================================================

export interface PredictionInput {
  weather: string;
  hour: number;
  roadType: string;
  trafficDensity: "Low" | "Medium" | "High" | "Very High";
  speed: number;
  vehicleType: string;
}

export interface PredictionResult {
  probability: number;
  severity: Severity;
  recommendations: string[];
}

export abstract class AbstractPredictor extends Reportable {
  public abstract predict(input: PredictionInput): PredictionResult;
}

export class PredictionModel extends AbstractPredictor {
  private _lastResult: PredictionResult | null = null;

  public override predict(input: PredictionInput): PredictionResult {
    let risk = 30;
    const weatherRisk: Record<string, number> = { Clear: 0, Rain: 20, Fog: 25, Snow: 30, Storm: 35 };
    risk += weatherRisk[input.weather] ?? 10;
    if (input.hour >= 22 || input.hour <= 5) risk += 20;
    else if ((input.hour >= 7 && input.hour <= 9) || (input.hour >= 17 && input.hour <= 19)) risk += 15;
    const roadRisk: Record<string, number> = { Highway: 15, "Urban Road": 10, "Rural Road": 12, Intersection: 20, Bridge: 18 };
    risk += roadRisk[input.roadType] ?? 10;
    const traffic: Record<string, number> = { Low: 0, Medium: 10, High: 20, "Very High": 30 };
    risk += traffic[input.trafficDensity] ?? 10;
    if (input.speed > 100) risk += 25;
    else if (input.speed > 80) risk += 15;
    else if (input.speed > 60) risk += 8;
    risk = Math.min(100, Math.max(0, risk));

    const severity: Severity =
      risk < 30 ? "Low" : risk < 55 ? "Medium" : risk < 80 ? "High" : "Fatal";

    const recs: string[] = [];
    if (input.speed > 80) recs.push("Reduce speed below 80 km/h");
    if (input.weather !== "Clear") recs.push("Use headlights & maintain safe distance");
    if (recs.length === 0) recs.push("Drive safely and follow traffic rules");

    this._lastResult = { probability: Math.round(risk), severity, recommendations: recs };
    return this._lastResult;
  }

  public override generateReport(): string {
    if (!this._lastResult) return "Prediction Report — no prediction yet";
    return `Prediction Report — risk=${this._lastResult.probability}%, severity=${this._lastResult.severity}`;
  }
}

// ============================================================================
// RISK ZONE IDENTIFIER (DBSCAN clustering)
// ============================================================================

export interface RiskZone {
  centroidLat: number;
  centroidLng: number;
  count: number;
  dominantSeverity: Severity;
}

export class RiskZoneIdentifier extends Reportable {
  private _data: readonly AccidentData[];
  private _zones: RiskZone[] = [];

  constructor(data: readonly AccidentData[]) {
    super();
    this._data = data;
  }

  public identify(epsKm = 1.0, minSamples = 5): RiskZone[] {
    const pts = this._data;
    const n = pts.length;
    const labels = new Int16Array(n).fill(-1);
    let clusterId = 0;

    const dist = (a: AccidentData, b: AccidentData) => {
      const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.latitude - a.latitude), dLng = toRad(b.longitude - a.longitude);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

    const region = (i: number) => {
      const out: number[] = [];
      for (let j = 0; j < n; j++) if (dist(pts[i], pts[j]) <= epsKm) out.push(j);
      return out;
    };

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1) continue;
      const nb = region(i);
      if (nb.length < minSamples) { labels[i] = -2; continue; }
      labels[i] = clusterId;
      const queue = [...nb];
      for (let j = 0; j < queue.length; j++) {
        const q = queue[j];
        if (labels[q] === -2) labels[q] = clusterId;
        if (labels[q] !== -1) continue;
        labels[q] = clusterId;
        const qn = region(q);
        if (qn.length >= minSamples) qn.forEach(x => !queue.includes(x) && queue.push(x));
      }
      clusterId++;
    }

    const groups: Record<number, AccidentData[]> = {};
    labels.forEach((l, idx) => { if (l >= 0) (groups[l] ??= []).push(pts[idx]); });

    this._zones = Object.values(groups).map(g => {
      const lat = g.reduce((s, p) => s + p.latitude, 0) / g.length;
      const lng = g.reduce((s, p) => s + p.longitude, 0) / g.length;
      const freq: Record<string, number> = {};
      g.forEach(p => { freq[p.severity] = (freq[p.severity] || 0) + 1; });
      const dom = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as Severity;
      return { centroidLat: lat, centroidLng: lng, count: g.length, dominantSeverity: dom };
    });

    return this._zones;
  }

  public override generateReport(): string {
    const highRiskZones = this._zones.filter(z => z.dominantSeverity === "High" || z.dominantSeverity === "Fatal").length;
    return `Risk Zone Report — ${this._zones.length} clusters identified, ${highRiskZones} high-risk`;
  }
}

// ============================================================================
// ALERT SYSTEM
// ============================================================================

export type AlertLevel = "info" | "warning" | "danger";

export class Alert {
  constructor(
    public readonly title: string,
    public readonly message: string,
    public readonly level: AlertLevel,
    public readonly createdAt: Date = new Date(),
  ) {}
}

export class AlertSystem extends Reportable {
  private _alerts: Alert[] = [];

  public raise(title: string, message: string, level: AlertLevel): Alert {
    const a = new Alert(title, message, level);
    this._alerts.push(a);
    return a;
  }

  public fromRiskZones(zones: RiskZone[]): Alert[] {
    return zones
      .filter(z => z.dominantSeverity === "High" || z.dominantSeverity === "Fatal")
      .map(z => this.raise(
        `High Risk Zone Detected`,
        `${z.count} accidents clustered at (${z.centroidLat.toFixed(3)}, ${z.centroidLng.toFixed(3)})`,
        z.dominantSeverity === "Fatal" ? "danger" : "warning",
      ));
  }

  public get alerts(): readonly Alert[] { return this._alerts; }

  public override generateReport(): string {
    return `Alert Report — ${this._alerts.length} active alert(s), ${this._alerts.filter(a => a.level === "danger").length} critical`;
  }
}
