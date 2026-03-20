import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { forecastLabels, sineWave } from '../data';

function rand(min, max) { return +(min + (Math.random() * (max - min))).toFixed(2); }

const production = Array.from({ length: 48 }, (_, i) => sineWave(i, 4.5, 0.2));
const consumption = Array.from({ length: 48 }, (_, i) => +(2.5 + rand(-0.3, 0.6)).toFixed(2));
const yhatUpper = production.map(v => +(v * 1.15).toFixed(2));
const yhatLower = production.map(v => +(v * 0.85).toFixed(2));

export default function ForecastChart({ chartRef }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    instanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: forecastLabels,
        datasets: [
          {
            label: 'Confidence Band',
            data: yhatUpper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,230,118,0.08)',
            fill: '+1',
            pointRadius: 0, tension: 0.4, order: 0,
          },
          {
            label: 'Lower Band',
            data: yhatLower,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,230,118,0.08)',
            fill: false,
            pointRadius: 0, tension: 0.4, order: 1,
          },
          {
            label: 'Forecasted Production',
            data: production,
            borderColor: '#00e676',
            backgroundColor: 'rgba(0,230,118,0.05)',
            borderWidth: 2,
            pointRadius: 0, tension: 0.4, fill: false, order: 2,
          },
          {
            label: 'Consumption',
            data: consumption,
            borderColor: '#40c4ff',
            backgroundColor: 'rgba(64,196,255,0.05)',
            borderWidth: 2,
            pointRadius: 0, tension: 0.4, fill: false, order: 3,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,25,35,0.95)',
            borderColor: '#1e2d3d', borderWidth: 1,
            titleColor: '#7a95b0', bodyColor: '#e8f0f8',
            padding: 10,
            callbacks: {
              title: items => `Hour ${items[0].label}`,
              label: item => `${item.dataset.label}: ${item.parsed.y} kWh`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#3d5a73', font: { size: 9, family: 'JetBrains Mono' },
              maxTicksLimit: 12,
              callback: (v, i) => i % 6 === 0 ? forecastLabels[i] : '',
            },
            grid: { color: 'rgba(30,45,61,0.4)' },
          },
          y: {
            ticks: { color: '#3d5a73', font: { size: 9, family: 'JetBrains Mono' }, callback: v => v + ' kWh' },
            grid: { color: 'rgba(30,45,61,0.4)' },
          },
        },
      },
    });

    if (chartRef) chartRef.current = instanceRef.current;

    return () => instanceRef.current?.destroy();
  }, []);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>48-Hour Energy Forecast</span>
        <span style={{
          fontSize: '10px', padding: '3px 8px', borderRadius: '20px',
          fontFamily: 'var(--mono)', fontWeight: 500,
          background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)',
        }}>AI PREDICTION</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', padding: '8px 20px' }}>
        {[
          { color: 'var(--green)', label: 'Forecasted' },
          { color: 'var(--blue)', label: 'Consumption' },
          { color: 'rgba(0,230,118,0.3)', label: 'Confidence', dashed: true },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text2)' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: l.color,
              border: l.dashed ? '1px dashed var(--green)' : 'none'
            }} />
            {l.label}
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px 16px', position: 'relative', height: '220px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
