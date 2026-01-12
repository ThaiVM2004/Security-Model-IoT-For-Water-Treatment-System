// src/pages/User1/Water_Level_Chart.jsx
import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db_rt } from "../../firebase/firebase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import "./Water_Level_Chart.css";

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
        {typeof value === 'number' ? value.toFixed(1) : '--'}
        <span className="wl-tooltip-unit">{unit}</span>
      </div>
    </div>
  );
};

const Water_Level_Chart = () => {
  const [waterData, setWaterData] = useState([]);
  const [tempData, setTempData] = useState([]);
  const [turbData, setTurbData] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentTurb, setCurrentTurb] = useState(0);

  useEffect(() => {
    // Water Level
    const wRef = ref(db_rt, "user1/water_level/history");
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
          return { timestamp: ts, time: fmtTime(ts), waterLevel: Number(level) };
        })
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      const slice = arr.slice(-MAX_POINTS);
      setWaterData(slice);
      if (slice.length) setCurrentLevel(slice[slice.length - 1].waterLevel);
    });

    // Temperature
    const tRef = ref(db_rt, "user1/temperature/history");
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
    const tbRef = ref(db_rt, "user1/turbidity/history");
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
          if (typeof obj === 'number') {
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

    return () => {
      try {
        unsubW();
        unsubT();
        unsubTb();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
  const fetchCurrentData = async () => {

    // Đọc nhiệt độ hiện tại
    const tempRef = ref(db_rt, "user1/temperature/current");
    onValue(tempRef, (snap) => {
      if (snap.exists()) setCurrentTemp(snap.val());
    }, { onlyOnce: true });

    // Đọc độ đục hiện tại
    const turbRef = ref(db_rt, "user1/turbidity/current");
    onValue(turbRef, (snap) => {
      if (snap.exists()) setCurrentTurb(snap.val());
    }, { onlyOnce: true });
  };

  // Đọc ngay lần đầu
  fetchCurrentData();

  // Đọc lại mỗi 1 phút
  const interval = setInterval(fetchCurrentData, 60000);

  // Cleanup
  return () => clearInterval(interval);
}, []);

  // Unified x-axis labels
  const xLabels = useMemo(() => {
    if (waterData.length) return waterData.map((d) => d.time);
    if (tempData.length) return tempData.map((d) => d.time);
    if (turbData.length) return turbData.map((d) => d.time);
    return [];
  }, [waterData, tempData, turbData]);

  // Align data for bottom charts
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

  // Dynamic color based on water level
  const waterColor = currentLevel <= 20 
    ? { from: "#ff7b7b", to: "#ff4444", glow: "rgba(255, 68, 68, 0.6)" }
    : { from: "#4dd0e1", to: "#00838f", glow: "rgba(77, 208, 225, 0.6)" };

  // Status text
  const getWaterStatus = () => {
    if (currentLevel <= 20) return { text: "CRITICAL LOW", color: "#ff4444" };
    if (currentLevel <= 40) return { text: "LOW", color: "#ffb86b" };
    if (currentLevel <= 60) return { text: "NORMAL", color: "#4dd0e1" };
    if (currentLevel <= 80) return { text: "GOOD", color: "#00e676" };
    return { text: "OPTIMAL", color: "#7b2fff" };
  };

  const waterStatus = getWaterStatus();

  // Temperature status
  const getTempStatus = () => {
    if (currentTemp >= 35) return "HIGH";
    if (currentTemp >= 25) return "NORMAL";
    if (currentTemp >= 15) return "COOL";
    return "COLD";
  };

  // Turbidity status
  const getTurbStatus = () => {
    if (currentTurb >= 100) return "HIGH";
    if (currentTurb >= 50) return "MEDIUM";
    if (currentTurb >= 10) return "LOW";
    return "CLEAR";
  };

  return (
    <div className="water-charts-root-1">
      {/* TOP: Water Level Area Chart */}
      <div className="chart-panel top-chart">
        <div className="chart-header">
          <h3>WATER LEVEL</h3>
          <div className="chart-badge">
            <div className="chart-badge-value" style={{ color: waterStatus.color }}>
              {currentLevel.toFixed(1)}%
            </div>
            <div className="chart-badge-label" style={{ color: waterStatus.color }}>
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
                  <stop offset="0%" stopColor={waterColor.from} stopOpacity={0.95} />
                  <stop offset="50%" stopColor={waterColor.to} stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#001a1f" stopOpacity={0.2} />
                </linearGradient>
                <filter id="waterGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid 
                stroke="rgba(77, 208, 225, 0.08)" 
                strokeDasharray="3 3" 
              />
              
              <XAxis 
                dataKey="time" 
                tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                label={{ 
                  value: '%', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'rgba(255,255,255,0.6)', fontSize: 12 }
                }}
              />
              
              <Tooltip content={<CustomTooltip unit="%" color={waterColor.from} />} />
              
              <ReferenceLine 
                y={20} 
                stroke="#ff6b6b" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ value: 'Critical', fill: '#ff6b6b', fontSize: 10 }}
              />
              
              <ReferenceLine 
                y={80} 
                stroke="#7b2fff" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ value: 'High', fill: '#7b2fff', fontSize: 10 }}
              />

              <Area 
                type="monotone" 
                dataKey="waterLevel" 
                stroke={waterColor.from} 
                fill="url(#gWater)" 
                strokeWidth={3}
                filter="url(#waterGlow)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM: Two Charts Side-by-Side */}
      <div className="chart-panel bottom-row-1">
        {/* Temperature Chart */}
        <div className="chart-card">
          <div className="chart-header small">
            <h4>TEMPERATURE</h4>
            <div className="mini-badge">
              <div className="mini-badge-value">
                {currentTemp.toFixed(1)}°C
              </div>
              <div className="mini-badge-label">
                {getTempStatus()}
              </div>
            </div>
          </div>
          
          <div className="chart-body small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={tempAligned} 
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffb86b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ff8c42" stopOpacity={0.9} />
                  </linearGradient>
                  <filter id="tempGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid 
                  stroke="rgba(255, 184, 107, 0.06)" 
                  strokeDasharray="3 3" 
                />
                
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                
                <YAxis 
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  label={{ 
                    value: '°C', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'rgba(255,255,255,0.6)', fontSize: 11 }
                  }}
                />
                
                <Tooltip content={<CustomTooltip unit="°C" color="#ffb86b" />} />
                
                <Bar 
                  dataKey="value" 
                  fill="url(#tempGrad)" 
                  radius={[8, 8, 0, 0]}
                  filter="url(#tempGlow)"
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
            <div className="mini-badge">
              <div className="mini-badge-value">
                {currentTurb.toFixed(1)} NTU
              </div>
              <div className="mini-badge-label">
                {getTurbStatus()}
              </div>
            </div>
          </div>
          
          <div className="chart-body small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={turbAligned} 
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="turbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4dd0e1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#00838f" stopOpacity={0.9} />
                  </linearGradient>
                  <filter id="turbGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid 
                  stroke="rgba(77, 208, 225, 0.06)" 
                  strokeDasharray="3 3" 
                />
                
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                
                <YAxis 
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  label={{ 
                    value: 'NTU', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'rgba(255,255,255,0.6)', fontSize: 11 }
                  }}
                />
                
                <Tooltip content={<CustomTooltip unit="NTU" color="#4dd0e1" />} />
                
                <Bar 
                  dataKey="value" 
                  fill="url(#turbGrad)" 
                  radius={[8, 8, 0, 0]}
                  filter="url(#turbGlow)"
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Water_Level_Chart;