/**
 * Local Floor Lighting Simulation (fallback and instant test mode)
 * Blends the wood floor texture into the floor area of the user's room photo
 * applying lighting modulation, perspective, and vignette so the user can test immediately.
 */
export async function simulateFloorComposite(
  roomDataUrl: string,
  floorTextureUrl: string,
  options: {
    speciesName: string;
    toneHex: string;
    pattern?: string;
    orientation?: 'vertical' | 'horizontal' | 'diagonal';
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const roomImg = new Image();
    const floorImg = new Image();
    let loaded = 0;

    const onAssetLoaded = () => {
      loaded++;
      if (loaded === 2) {
        try {
          const canvas = document.createElement('canvas');
          const width = roomImg.naturalWidth || roomImg.width;
          const height = roomImg.naturalHeight || roomImg.height;
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }

          // 1. Draw base room
          ctx.drawImage(roomImg, 0, 0, width, height);

          // 2. Identify lower floor region (roughly lower 50-60% of room with perspective gradient)
          const floorStartY = height * 0.44;

          // Create temporary floor canvas with repeated/tiled pattern
          const floorCanvas = document.createElement('canvas');
          floorCanvas.width = width;
          floorCanvas.height = height;
          const fCtx = floorCanvas.getContext('2d');

          if (fCtx) {
            // Apply orientation transform to pattern if horizontal or diagonal
            const isHorizontal = options.orientation === 'horizontal';
            
            // Create a small pattern canvas that can be rotated
            const pCanvas = document.createElement('canvas');
            const fw = floorImg.naturalWidth || floorImg.width || 400;
            const fh = floorImg.naturalHeight || floorImg.height || 400;

            if (isHorizontal) {
              pCanvas.width = fh;
              pCanvas.height = fw;
              const pCtx = pCanvas.getContext('2d');
              if (pCtx) {
                pCtx.translate(fh / 2, fw / 2);
                pCtx.rotate(Math.PI / 2);
                pCtx.drawImage(floorImg, -fw / 2, -fh / 2);
              }
            } else {
              pCanvas.width = fw;
              pCanvas.height = fh;
              const pCtx = pCanvas.getContext('2d');
              if (pCtx) {
                pCtx.drawImage(floorImg, 0, 0);
              }
            }

            // Fill with floor pattern
            const pattern = fCtx.createPattern(pCanvas, 'repeat');
            if (pattern) {
              fCtx.fillStyle = pattern;
              fCtx.fillRect(0, floorStartY, width, height - floorStartY);
            } else {
              fCtx.drawImage(floorImg, 0, floorStartY, width, height - floorStartY);
            }

            // Create gradient mask for perspective blending
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, floorStartY, width, height - floorStartY);
            ctx.clip();

            // Blend mode: overlay / soft-light with room luminosity
            ctx.globalAlpha = 0.85;
            ctx.globalCompositeOperation = 'hard-light';
            ctx.drawImage(floorCanvas, 0, 0);

            // Re-apply room details (furniture shadows) using multiply
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.55;
            ctx.drawImage(roomImg, 0, 0);

            ctx.restore();
          }

          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (e) {
          reject(e);
        }
      }
    };

    roomImg.onload = onAssetLoaded;
    floorImg.onload = onAssetLoaded;
    roomImg.onerror = (e) => reject(new Error('Error cargando foto del ambiente'));
    floorImg.onerror = (e) => reject(new Error('Error cargando textura del piso'));

    roomImg.src = roomDataUrl;
    floorImg.src = floorTextureUrl;
  });
}
