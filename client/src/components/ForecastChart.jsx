import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function ForecastChart({ forecast, chartRef }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!forecast?.length || !canvasRef.current) return;

    const labels = forecast.map(h => {
        const dt = new Date(h.hour);
        return `${dt.getHours().toString().padStart(2, '0')}:00`;
    });
    const yhat = forecast.map(h => Number(h.yhat.toFixed(3)));
    const yhatUpper = forecast.map(h => Number(h.yhat_upper.toFixed(3)));
    const yhatLower = forecast.map(h => Number(h.yhat_lower.toFixed(3)));
    const clouds = forecast.map(h => h.cloud_cover);

    const ctx = canvasRef.current.getContext('2d');
    
    if (instanceRef.current) {
        instanceRef.current.destroy();
    }

    instanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Upper Band',
            data: yhatUpper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,255,135,0.08)',
            fill: '+1',
            pointRadius: 0, tension: 0.4, order: 0,
            yAxisID: 'y',
          },
          {
            label: 'Lower Band',
            data: yhatLower,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: false,
            pointRadius: 0, tension: 0.4, order: 1,
            yAxisID: 'y',
          },
          {
            type: 'bar',
            label: 'Predicted (kWh)',
            data: yhat,
            backgroundColor: 'rgba(0,255,135,0.7)',
            hoverBackgroundColor: 'rgba(0,255,135,1)',
            borderRadius: 4,
            order: 2,
            yAxisID: 'y',
          },
          {
            label: 'Cloud Cover (%)',
            data: clouds,
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.1)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0, tension: 0.4, fill: false, order: 3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,21,32,0.95)',
            borderColor: '#0f2035', borderWidth: 1,
            titleColor: '#5e8aaa', bodyColor: '#e2f0ff',
            padding: 10,
            callbacks: {
              title: items => {
                const day = new Date(forecast[items[0].dataIndex].hour).toLocaleDateString([], { month: 'short', day: 'numeric' });
                return `${day}, ${items[0].label}`;
              },
              label: item => {
                if(item.datasetIndex === 0) return null; // skip upper band label in tooltip
                if(item.datasetIndex === 1) return null; // skip lower band
                if(item.datasetIndex === 2) {
                   const h = forecast[item.dataIndex];
                   return [
                     `Predicted: ${item.parsed.y} kWh`,
                     `Confidence: ${h.confidence}%`,
                     `Range: ${h.yhat_lower.toFixed(2)} - ${h.yhat_upper.toFixed(2)} kWh`
                   ];
                }
                return `${item.dataset.label}: ${item.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#5e8aaa', font: { size: 10, family: 'var(--mono)' },
              maxTicksLimit: 12,
            },
            grid: { color: 'rgba(15,32,53,0.4)' },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: { color: '#00ff87', font: { size: 10, family: 'var(--mono)' } },
            grid: { color: 'rgba(15,32,53,0.4)' },
            title: { display: true, text: 'Energy (kWh)', color: '#5e8aaa', font: {size: 10} },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            ticks: { color: '#0ea5e9', font: { size: 10, family: 'var(--mono)' } },
            grid: { drawOnChartArea: false }, // Only want the grid lines for one axis
            title: { display: true, text: 'Clouds (%)', color: '#5e8aaa', font: {size: 10} },
          },
        },
      },
    });

    if (chartRef) chartRef.current = instanceRef.current;

    return () => {
      if (instanceRef.current) instanceRef.current.destroy();
    };
  }, [forecast]);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontFamily: 'var(--display)', fontWeight: 600, color: 'var(--text)' }}>48-Hour Production Chart</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', padding: '8px 20px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--green)', label: 'Predicted kWh' },
          { color: 'var(--blue)', label: 'Cloud Cover', dashed: true },
          { color: 'rgba(0,255,135,0.3)', label: 'Confidence Band', area: true },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text2)' }}>
            <div style={{
              width: '10px', height: l.area ? '10px' : '3px', borderRadius: l.area ? '2px' : '1px', background: l.color,
              border: l.dashed ? '1px dashed var(--blue)' : 'none'
            }} />
            {l.label}
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px 16px', position: 'relative', height: '360px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
