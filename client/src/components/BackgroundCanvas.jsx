import { useEffect, useRef } from 'react';

export default function BackgroundCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    let W, H, nodes = [];
    let animationId;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create microgrid nodes
    for (let i = 0; i < 28; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * 0.35, vy: (Math.random() - .5) * 0.35,
        r: Math.random() * 3 + 2,
        glow: Math.random() < 0.3
      });
    }

    function drawBg() {
      c.clearRect(0, 0, W, H);

      // Draw edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 220) {
            c.beginPath();
            c.moveTo(nodes[i].x, nodes[i].y);
            c.lineTo(nodes[j].x, nodes[j].y);
            c.strokeStyle = `rgba(0,255,135,${0.15 * (1 - d / 220)})`;
            c.lineWidth = 1.2;
            c.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        c.beginPath();
        c.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        c.fillStyle = n.glow ? 'rgba(0,255,135,0.95)' : 'rgba(0,255,135,0.6)';
        c.fill();
        if (n.glow) {
          c.beginPath();
          c.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
          c.fillStyle = 'rgba(0,255,135,0.15)';
          c.fill();
        }

        // Move
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Bottom radial glow
      const gr = c.createRadialGradient(W / 2, H * .7, 0, W / 2, H * .7, W * .5);
      gr.addColorStop(0, 'rgba(0,255,135,0.04)');
      gr.addColorStop(1, 'transparent');
      c.fillStyle = gr;
      c.fillRect(0, 0, W, H);

      animationId = requestAnimationFrame(drawBg);
    }
    drawBg();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1
      }}
    ></canvas>
  );
}
