// src/pages/User1/Water_Level_Chart_2.jsx
import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db_rt } from "../../firebase/firebase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import "./Water_Level_Chart_2.css";

const MAX_POINTS = 40;

const fmtTime = (ts) => {
  const n = typeof ts === "string" ? parseInt(ts, 10) : ts;
  const t = n > 1e12 ? new Date(n) : new Date(n * 1000);
  return t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const CustomTooltip = ({ active, payload, label, unit, color = "#4dd0e1" }) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;

  return (
    <div className="wl-tooltip">
      <div className="wl-tooltip-time">{label}</div>
      <div className="wl-tooltip-value" style={{ color }}>
        {typeof value === "number" ? value.toFixed(1) : "--"}
        <span className="wl-tooltip-unit">{unit}</span>
      </div>
    </div>
  );
};

const Water_Level_Chart = () => {
  const [waterData, setWaterData] = useState([]);
  const [tempData, setTempData] = useState([]);
  const [turbData, setTurbData] = useState([]);
  const [pHData, setPHData] = useState([]);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentTurb, setCurrentTurb] = useState(0);
  const [currentPH, setCurrentPH] = useState(0);

  useEffect(() => {
    // Water Level
    const wRef = ref(db_rt, "user2/water_level/history");
    const unsubW = onValue(wRef, (snap) => {
      const v = snap.val();
      if (!v) {
        setWaterData([]);
        setCurrentLevel(0);
        return;
      }
      const arr = Object.entries(v)
        .map(([ts, obj]) => {
          const level = obj?.level ?? obj?.value ?? 0;
          return {
            timestamp: ts,
            time: fmtTime(ts),
            waterLevel: Number(level),
          };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      const slice = arr.slice(-MAX_POINTS);
      setWaterData(slice);
      if (slice.length) setCurrentLevel(slice[slice.length - 1].waterLevel);
    });

    // Temperature
    const tRef = ref(db_rt, "user2/temperature/history");
    const unsubT = onValue(tRef, (snap) => {
      const v = snap.val();
      if (!v) {
        setTempData([]);
        setCurrentTemp(0);
        return;
      }
      const arr = Object.entries(v)
        .map(([ts, obj]) => {
          const val = obj?.value ?? obj?.temp ?? 0;
          return { timestamp: ts, time: fmtTime(ts), value: Number(val) };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      const slice = arr.slice(-MAX_POINTS);
      setTempData(slice);
      if (slice.length) setCurrentTemp(slice[slice.length - 1].value);
    });

    // Turbidity
    const tbRef = ref(db_rt, "user2/turbidity/history");
    const unsubTb = onValue(tbRef, (snap) => {
      const v = snap.val();
      if (!v) {
        setTurbData([]);
        setCurrentTurb(0);
        return;
      }
      const arr = Object.entries(v)
        .map(([ts, obj]) => {
          let val;
          if (typeof obj === "number") {
            val = obj;
          } else {
            val = obj?.turbidity ?? obj?.value ?? obj?.ntu ?? 0;
          }
          return { timestamp: ts, time: fmtTime(ts), value: Number(val) };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      const slice = arr.slice(-MAX_POINTS);
      setTurbData(slice);
      if (slice.length) setCurrentTurb(slice[slice.length - 1].value);
    });

    // pH
    const pHRef = ref(db_rt, "user2/ph/history");
    const unsubPH = onValue(pHRef, (snap) => {
      const v = snap.val();
      if (!v) {
        setPHData([]);
        setCurrentPH(0);
        return;
      }
      const arr = Object.entries(v)
        .map(([ts, obj]) => {
          let val;
          if (typeof obj === "number") {
            val = obj;
          } else {
            val = obj?.pH ?? obj?.value ?? obj?.ph ?? 0;
          }
          return { timestamp: ts, time: fmtTime(ts), value: Number(val) };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      const slice = arr.slice(-MAX_POINTS);
      setPHData(slice);
      if (slice.length) setCurrentPH(slice[slice.length - 1].value);
    });

    return () => {
      try {
        unsubW();
        unsubT();
        unsubTb();
        unsubPH();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const fetchCurrentData = async () => {
      // Temperature
      const tempRef = ref(db_rt, "user2/temperature/current");
      onValue(
        tempRef,
        (snap) => {
          if (snap.exists()) setCurrentTemp(snap.val());
        },
        { onlyOnce: true }
      );

      // Turbidity
      const turbRef = ref(db_rt, "user2/turbidity/current");
      onValue(
        turbRef,
        (snap) => {
          if (snap.exists()) setCurrentTurb(snap.val());
        },
        { onlyOnce: true }
      );

      // pH
      const pHRef = ref(db_rt, "user2/pH/current");
      onValue(
        pHRef,
        (snap) => {
          if (snap.exists()) setCurrentPH(snap.val());
        },
        { onlyOnce: true }
      );
    };

    fetchCurrentData();
    const interval = setInterval(fetchCurrentData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Unified x-axis labels
  const xLabels = useMemo(() => {
    if (waterData.length) return waterData.map((d) => d.time);
    if (tempData.length) return tempData.map((d) => d.time);
    if (turbData.length) return turbData.map((d) => d.time);
    if (pHData.length) return pHData.map((d) => d.time);
    return [];
  }, [waterData, tempData, turbData, pHData]);

  // Align data
  const tempAligned = useMemo(() => {
    if (!xLabels.length) return [];
    const m = new Map(tempData.map((d) => [d.time, d.value]));
    return xLabels.map((t) => ({ time: t, value: m.has(t) ? m.get(t) : null }));
  }, [xLabels, tempData]);

  const turbAligned = useMemo(() => {
    if (!xLabels.length) return [];
    const m = new Map(turbData.map((d) => [d.time, d.value]));
    return xLabels.map((t) => ({ time: t, value: m.has(t) ? m.get(t) : null }));
  }, [xLabels, turbData]);

  const pHAligned = useMemo(() => {
    if (!xLabels.length) return [];
    const m = new Map(pHData.map((d) => [d.time, d.value]));
    return xLabels.map((t) => ({ time: t, value: m.has(t) ? m.get(t) : null }));
  }, [xLabels, pHData]);

  // Dynamic color based on water level
  const waterColor =
    currentLevel <= 20
      ? { from: "#ff7b7b", to: "#ff4444", glow: "rgba(255, 68, 68, 0.6)" }
      : { from: "#4dd0e1", to: "#00838f", glow: "rgba(77, 208, 225, 0.6)" };

  // Status functions
  const getWaterStatus = () => {
    if (currentLevel <= 20) return { text: "CRITICAL LOW", color: "#ff4444" };
    if (currentLevel <= 40) return { text: "LOW", color: "#ffb86b" };
    if (currentLevel <= 60) return { text: "NORMAL", color: "#4dd0e1" };
    if (currentLevel <= 80) return { text: "GOOD", color: "#00e676" };
    return { text: "OPTIMAL", color: "#7b2fff" };
  };

  const getTempStatus = () => {
    if (currentTemp >= 35) return "HIGH";
    if (currentTemp >= 25) return "NORMAL";
    if (currentTemp >= 15) return "COOL";
    return "COLD";
  };

  const getTurbStatus = () => {
    if (currentTurb >= 100) return "HIGH";
    if (currentTurb >= 50) return "MEDIUM";
    if (currentTurb >= 10) return "LOW";
    return "CLEAR";
  };

  const getPHStatus = () => {
    if (currentPH >= 8.5) return "ALKALINE";
    if (currentPH >= 7.5) return "SLIGHT ALKALINE";
    if (currentPH >= 6.5) return "NEUTRAL";
    if (currentPH >= 5.5) return "SLIGHT ACIDIC";
    return "ACIDIC";
  };

  const waterStatus = getWaterStatus();

  return (
    <div className="water-charts-root">
      {/* TOP: Water Level Area Chart */}
      <div className="chart-panel top-chart">
        <div className="chart-header">
          <h3>WATER LEVEL</h3>
          <div className="chart-badge">
            <div
              className="chart-badge-value"
              style={{ color: waterStatus.color }}
            >
              {currentLevel.toFixed(1)}%
            </div>
            <div
              className="chart-badge-label"
              style={{ color: waterStatus.color }}
            >
              {waterStatus.text}
            </div>
          </div>
        </div>

        <div className="chart-body">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={waterData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={waterColor.from}
                    stopOpacity={0.95}
                  />
                  <stop
                    offset="50%"
                    stopColor={waterColor.to}
                    stopOpacity={0.6}
                  />
                  <stop offset="100%" stopColor="#001a1f" stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(77, 208, 225, 0.08)"
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="time"
                tick={{
                  fill: "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />

              <YAxis
                domain={[0, 100]}
                tick={{
                  fill: "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                label={{
                  value: "%",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "rgba(255,255,255,0.6)", fontSize: 12 },
                }}
              />

              <Tooltip
                content={<CustomTooltip unit="%" color={waterColor.from} />}
              />

              <ReferenceLine
                y={20}
                stroke="#ff6b6b"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "Critical", fill: "#ff6b6b", fontSize: 10 }}
              />

              <ReferenceLine
                y={80}
                stroke="#7b2fff"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "High", fill: "#7b2fff", fontSize: 10 }}
              />

              <Area
                type="monotone"
                dataKey="waterLevel"
                stroke={waterColor.from}
                fill="url(#gWater)"
                strokeWidth={3}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM: Three Charts */}
      <div className="chart-panel bottom-row">
        {/* Temperature Chart */}
        <div className="chart-card">
          <div className="chart-header small">
            <h4>TEMPERATURE</h4>
            <div className="mini-badge temp-badge">
              <div className="mini-badge-value">{currentTemp.toFixed(1)}°C</div>
              <div className="mini-badge-label">{getTempStatus()}</div>
            </div>
          </div>

          <div className="chart-body small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tempAligned}
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                barSize={18}
              >
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8c42" stopOpacity={1} />
                    <stop
                      offset="100%"
                      stopColor="#ff6b35"
                      stopOpacity={0.85}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(255, 140, 66, 0.06)"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />

                <YAxis
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  label={{
                    value: "°C",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "rgba(255,255,255,0.6)", fontSize: 11 },
                  }}
                />

                <Tooltip
                  content={<CustomTooltip unit="°C" color="#ff8c42" />}
                />

                <Bar
                  dataKey="value"
                  fill="url(#tempGrad)"
                  radius={[0, 0, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Turbidity Chart */}
        <div className="chart-card">
          <div className="chart-header small">
            <h4>TURBIDITY</h4>
            <div className="mini-badge turb-badge">
              <div className="mini-badge-value">
                {currentTurb.toFixed(1)} NTU
              </div>
              <div className="mini-badge-label">{getTurbStatus()}</div>
            </div>
          </div>

          <div className="chart-body small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={turbAligned}
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                barSize={18}
              >
                <defs>
                  <linearGradient id="turbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                    <stop
                      offset="100%"
                      stopColor="#7e22ce"
                      stopOpacity={0.85}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(168, 85, 247, 0.06)"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />

                <YAxis
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  label={{
                    value: "NTU",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "rgba(255,255,255,0.6)", fontSize: 11 },
                  }}
                />

                <Tooltip
                  content={<CustomTooltip unit="NTU" color="#a855f7" />}
                />

                <Bar
                  dataKey="value"
                  fill="url(#turbGrad)"
                  radius={[0, 0, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* pH Chart */}
        <div className="chart-card">
          <div className="chart-header small">
            <h4>pH LEVEL</h4>
            <div className="mini-badge ph-badge">
              <div className="mini-badge-value">{currentPH.toFixed(1)} pH</div>
              <div className="mini-badge-label">{getPHStatus()}</div>
            </div>
          </div>

          <div className="chart-body small">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pHAligned}
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="pHGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#84cc16" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#65a30d" stopOpacity={0.3} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(132, 204, 22, 0.06)"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />

                <YAxis
                  domain={[0, 14]}
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  label={{
                    value: "pH",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "rgba(255,255,255,0.6)", fontSize: 11 },
                  }}
                />

                <Tooltip
                  content={<CustomTooltip unit="pH" color="#84cc16" />}
                />

                <ReferenceLine
                  y={7}
                  stroke="#84cc16"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ value: "Neutral", fill: "#84cc16", fontSize: 10 }}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#84cc16"
                  strokeWidth={3}
                  dot={{ fill: "#84cc16", r: 4 }}
                  activeDot={{ r: 6, fill: "#84cc16" }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Water_Level_Chart;
