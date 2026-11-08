/**
 * Card Generator Utility for AI-GreenLand Resident Card
 * Generates pixel-perfect, high-resolution (3x Retina) Resident Green Cards
 * with guaranteed Steampunk Gold aesthetic, eliminating html2canvas artifacts,
 * font clipping, and missing CSS filter support.
 */

export interface ResidentCardData {
  fio: string;
  promo: string;
  rank: string;
  type: string;
}

/**
 * Loads an image with crossOrigin = 'anonymous' safely
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback without crossOrigin if local
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (err) => reject(err);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Pixel-level transformer to guarantee warm steampunk gold / deep leather brown palette.
 * Replaces any un-filtered red/maroon pixels with dark leather-brown (#24160c)
 * and blue iceberg pixels with gleaming gold (#f5a510).
 */
function applySteampunkColorCorrection(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 1. Detect red / maroon background areas (original flag bottom)
      // When red strongly dominates green and blue:
      if (r > 90 && r > g * 1.5 && r > b * 1.5) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        // Transform into deep rich steampunk chocolate / leather tone
        data[i] = Math.round(36 + lum * 42);      // R: 36 - 78
        data[i + 1] = Math.round(20 + lum * 24);  // G: 20 - 44
        data[i + 2] = Math.round(10 + lum * 14);  // B: 10 - 24
      }
      // 2. Detect blue / cyan iceberg areas (original coat of arms)
      else if (b > 90 && b > r * 1.15 && b > g * 1.05) {
        const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
        // Transform into vibrant gold
        data[i] = Math.min(255, Math.round(210 + lum * 45));     // R: 210 - 255
        data[i + 1] = Math.min(255, Math.round(145 + lum * 95)); // G: 145 - 240
        data[i + 2] = Math.round(20 + lum * 35);                 // B: 20 - 55
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Canvas pixel color correction note:', err);
  }
}

/**
 * Draws a rounded verification badge (check in circle) with gold gradient
 */
function drawVerificationBadge(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  ctx.save();

  // Circle background
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0c0806';
  ctx.fill();

  // Circle border
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#F59E0B';
  ctx.stroke();

  // Checkmark inside
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.45, centerY - radius * 0.05);
  ctx.lineTo(centerX - radius * 0.1, centerY + radius * 0.35);
  ctx.lineTo(centerX + radius * 0.45, centerY - radius * 0.35);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#FCD34D';
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws copy icon (two overlapping rounded rectangles)
 */
function drawCopyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const s = size * 0.75;
  const offset = size * 0.25;

  // Back rectangle
  ctx.strokeRect(x + offset, y - offset, s, s);
  // Front rectangle
  ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
  ctx.fillRect(x, y, s, s);
  ctx.strokeRect(x, y, s, s);

  ctx.restore();
}

/**
 * Main generator function that draws the Resident ID Green Card
 * at 1152 x 672 pixels (3x scale of 384x224).
 */
export async function generateResidentCardCanvas(data: ResidentCardData): Promise<HTMLCanvasElement> {
  const width = 1152;
  const height = 672;
  const borderRadius = 48;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Clip to card rounded shape
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, borderRadius);
  ctx.clip();

  // Fallback dark background
  ctx.fillStyle = '#140d08';
  ctx.fillRect(0, 0, width, height);

  // 1. Draw Flag Background with Filter
  try {
    const flagImg = await loadImage('/file/37/flaggerb.png');
    ctx.save();
    try {
      ctx.filter = 'sepia(0.95) saturate(3.2) hue-rotate(-22deg) brightness(0.94) contrast(1.22)';
    } catch {}
    ctx.drawImage(flagImg, 0, 0, width, height);
    ctx.restore();
  } catch (err) {
    console.warn('Could not load flaggerb.png, using fallback gradient:', err);
    // Golden Steampunk Gradient fallback
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#cca01d');
    bgGrad.addColorStop(0.5, '#997312');
    bgGrad.addColorStop(0.51, '#2c1a0e');
    bgGrad.addColorStop(1, '#1b0f08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Ensure absolutely no blue or red pixels remain
  applySteampunkColorCorrection(ctx, width, height);

  // 2. Dark Steampunk Vignette & Glass Depth Overlay
  ctx.save();
  const vignetteGrad = ctx.createLinearGradient(0, 0, width, height);
  vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  vignetteGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.08)');
  vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 3. Coat of Arms in Top-Left Corner
  try {
    const gerbImg = await loadImage('/file/36/gerb.png');
    ctx.save();
    // Shadow for coat of arms
    ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Draw small temp canvas with golden filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 120;
    tempCanvas.height = 120;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      try {
        tempCtx.filter = 'grayscale(1) sepia(1) saturate(4.5) hue-rotate(-18deg) brightness(1.12) contrast(1.15)';
      } catch {}
      tempCtx.drawImage(gerbImg, 0, 0, 120, 120);
      applySteampunkColorCorrection(tempCtx, 120, 120);
      ctx.drawImage(tempCanvas, 54, 50, 120, 120);
    } else {
      ctx.drawImage(gerbImg, 54, 50, 120, 120);
    }
    ctx.restore();
  } catch (err) {
    console.warn('Could not load gerb.png:', err);
  }

  // 4. Header Text (Top Right)
  ctx.save();
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Title: "SAV Partner"
  ctx.font = 'bold 54px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('SAV Partner', width - 56, 102);

  // Subtitle: "Official Resident ID"
  ctx.font = '600 40px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('Official Resident ID', width - 56, 154);
  ctx.restore();

  // 5. Resident Details (Bottom Left)
  ctx.save();
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  const leftX = 56;

  // Name: FIO
  ctx.font = 'bold 52px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const displayFio = data.fio || 'Резидент ИИ-Гренландии';
  // Truncate if too long to prevent touching the promo badge
  let truncatedFio = displayFio;
  while (ctx.measureText(truncatedFio).width > 680 && truncatedFio.length > 5) {
    truncatedFio = truncatedFio.slice(0, -2) + '…';
  }
  ctx.fillText(truncatedFio, leftX, 485);

  // Rank + Verification Badge
  ctx.font = 'bold 44px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#FCD34D';
  const displayRank = data.rank || 'Резидент';
  ctx.fillText(displayRank, leftX, 546);

  const rankWidth = ctx.measureText(displayRank).width;
  drawVerificationBadge(ctx, leftX + rankWidth + 24, 532, 16);

  // Type: "Партнер" or "Эксперт" (with safe padding from bottom)
  if (data.type && data.type.toLowerCase() !== displayRank.toLowerCase()) {
    ctx.font = '500 38px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(data.type, leftX, 604);
  }
  ctx.restore();

  // 6. Promo Code Badge (Bottom Right)
  ctx.save();
  const promoText = data.promo || 'PROMO';
  ctx.font = 'bold 44px "Courier New", monospace';
  const promoWidth = ctx.measureText(promoText).width;

  const badgePaddingX = 28;
  const badgeHeight = 76;
  const badgeWidth = promoWidth + badgePaddingX * 2 + 48; // promo text + icon + padding
  const badgeX = width - 56 - badgeWidth;
  const badgeY = 538;

  // Badge Background Capsule
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 22);
  ctx.fillStyle = 'rgba(12, 8, 6, 0.88)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.stroke();

  // Promo Code Text
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'left';
  ctx.fillText(promoText, badgeX + badgePaddingX, badgeY + 52);

  // Copy Icon next to text
  drawCopyIcon(ctx, badgeX + badgeWidth - badgePaddingX - 24, badgeY + 44, 20);
  ctx.restore();

  // 7. Outer Golden Card Border
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(2, 2, width - 4, height - 4, borderRadius);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.stroke();
  ctx.restore();

  return canvas;
}
