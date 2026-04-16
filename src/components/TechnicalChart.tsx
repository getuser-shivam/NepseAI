import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { HistoricalData } from "../types";

interface TechnicalChartProps {
  data: HistoricalData[];
  symbol: string;
  timeRange: "1M" | "3M" | "1Y";
}

export const TechnicalChart: React.FC<TechnicalChartProps> = ({ data, symbol, timeRange }) => {
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let daysToKeep = 30;
    
    if (timeRange === "1M") daysToKeep = 30;
    else if (timeRange === "3M") daysToKeep = 90;
    else if (timeRange === "1Y") daysToKeep = 365;

    const cutoffDate = new Date(now.setDate(now.getDate() - daysToKeep));
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  }, [data, timeRange]);

  return (
    <div className="space-y-8">
      {/* Price & Volume Chart */}
      <div className="h-80 w-full bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Price & Volume History: {symbol}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#52525b', fontSize: 10 }} 
              minTickGap={30}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#52525b', fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={false}
              domain={[0, 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="bb.upper" 
              stroke="transparent" 
              fill="#3b82f6" 
              fillOpacity={0.05} 
              name="BB Upper"
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="bb.lower" 
              stroke="transparent" 
              fill="#3b82f6" 
              fillOpacity={0.05} 
              name="BB Lower"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="bb.sma" 
              stroke="#3b82f6" 
              strokeWidth={1} 
              strokeDasharray="5 5" 
              dot={false} 
              name="BB SMA"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="ema" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              dot={false} 
              name="EMA (20)" 
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="price" 
              stroke="#003893" 
              strokeWidth={2}
              fillOpacity={0.1} 
              fill="#003893" 
              name="Price (NPR)"
            />
            <Bar 
              yAxisId="right"
              dataKey="volume" 
              fill="#27272a" 
              opacity={0.5}
              name="Volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RSI Chart */}
        <div className="h-64 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Relative Strength Index (RSI)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: 'Overbought', fill: '#f43f5e', fontSize: 8 }} />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Oversold', fill: '#10b981', fontSize: 8 }} />
              <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="RSI" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* MACD Chart */}
        <div className="h-64 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">MACD Indicator</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
              <XAxis dataKey="date" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="macd.histogram" fill="#3f3f46" name="Histogram" />
              <Line type="monotone" dataKey="macd.value" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" />
              <Line type="monotone" dataKey="macd.signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
