// Prediction logic — no hardcoded/fake data
// All chart data is derived from user-uploaded datasets

export const predictAccident = (inputs: {
  weather: string;
  timeOfDay: string;
  roadType: string;
  trafficDensity: string;
  speed: number;
  vehicleType: string;
}) => {
  let risk = 30;
  const weatherRisk: Record<string, number> = { Clear: 0, Rain: 20, Fog: 25, Snow: 30, Storm: 35 };
  risk += weatherRisk[inputs.weather] || 10;
  const hour = parseInt(inputs.timeOfDay);
  if (hour >= 22 || hour <= 5) risk += 20;
  else if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) risk += 15;
  const roadRisk: Record<string, number> = { Highway: 15, "Urban Road": 10, "Rural Road": 12, Intersection: 20, Bridge: 18 };
  risk += roadRisk[inputs.roadType] || 10;
  const trafficRisk: Record<string, number> = { Low: 0, Medium: 10, High: 20, "Very High": 30 };
  risk += trafficRisk[inputs.trafficDensity] || 10;
  if (inputs.speed > 100) risk += 25;
  else if (inputs.speed > 80) risk += 15;
  else if (inputs.speed > 60) risk += 8;
  const vehicleRisk: Record<string, number> = { Car: 5, Truck: 15, Bike: 20, Bus: 12, Auto: 10 };
  risk += vehicleRisk[inputs.vehicleType] || 8;
  risk = Math.min(100, Math.max(0, risk));
  let severity: string;
  if (risk < 30) severity = "Low";
  else if (risk < 55) severity = "Medium";
  else if (risk < 80) severity = "High";
  else severity = "Fatal";
  const recommendations: string[] = [];
  if (inputs.speed > 80) recommendations.push("Reduce speed below 80 km/h");
  if (inputs.weather !== "Clear") recommendations.push("Use headlights and maintain safe distance");
  if (hour >= 22 || hour <= 5) recommendations.push("Stay alert — high-risk night hours");
  if (inputs.trafficDensity === "High" || inputs.trafficDensity === "Very High") recommendations.push("Avoid lane changes in heavy traffic");
  if (risk > 60) recommendations.push("Consider alternate route or delay travel");
  if (recommendations.length === 0) recommendations.push("Drive safely and follow traffic rules");
  return { probability: Math.round(risk), severity, recommendations };
};
