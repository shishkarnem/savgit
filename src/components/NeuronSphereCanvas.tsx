import React, { useEffect, useRef } from 'react';

interface NeuronSphereProps {
  isRecording?: boolean;
  color?: string; // Main node color (e.g. #E7C768)
  lineColor?: string; // Connection lines color
  glowColor?: string; // Neon glow color
  pointCount?: number; // Number of vertices (default 90)
  size?: number; // Canvas size in px
}

export const NeuronSphereCanvas: React.FC<NeuronSphereProps> = ({
  isRecording = false,
  color = '#E7C768',
  lineColor = 'rgba(231, 199, 104, 0.25)',
  glowColor = 'rgba(231, 199, 104, 0.4)',
  pointCount = 90,
  size = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angleX = 0;
    let angleY = 0;

    const points: Array<{ x: number; y: number; z: number; baseR: number; phase: number }> = [];
    const radius = size * 0.44;

    for (let i = 0; i < pointCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / pointCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      points.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        baseR: radius,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const speed = isRecording ? 0.035 : 0.012;
      angleX += speed * 0.7;
      angleY += speed;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const fov = size * 1.8;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const projected = points.map((p) => {
        const pulse = isRecording ? Math.sin(Date.now() * 0.008 + p.phase) * (size * 0.06) : 0;
        const currentR = p.baseR + pulse;
        const scaleFact = currentR / p.baseR;

        const px = p.x * scaleFact;
        const py = p.y * scaleFact;
        const pz = p.z * scaleFact;

        const x1 = px * cosY - pz * sinY;
        const z1 = pz * cosY + px * sinY;

        const y2 = py * cosX - z1 * sinX;
        const z2 = z1 * cosX + py * sinX;

        const scale = fov / (fov + z2 + size * 0.5);
        const x2d = x1 * scale + centerX;
        const y2d = y2 * scale + centerY;
        const alpha = Math.max(0.15, (z2 + radius) / (2 * radius));

        return { x: x2d, y: y2d, z: z2, alpha, scale };
      });

      const maxDistance = isRecording ? size * 0.28 : size * 0.22;
      ctx.lineWidth = 1;

      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.4 * Math.min(projected[i].alpha, projected[j].alpha);
            ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/g, `${lineAlpha})`);
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of projected) {
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        const dotSize = (isRecording ? 2.6 : 1.8) * p.scale;
        ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
        ctx.fill();

        if (isRecording && p.alpha > 0.6) {
          ctx.fillStyle = glowColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotSize * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRecording, color, lineColor, glowColor, pointCount, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pointer-events-none select-none"
    />
  );
};

export default NeuronSphereCanvas;
