import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Modal } from './ui/Modal';

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void | Promise<void>;
  onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg');
  });
}

export function ImageCropperModal({ imageSrc, onCropComplete, onCancel }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      setError('');
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      setError('Could not crop this image. Try uploading a PNG, JPEG, or WebP image.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="Crop Card Image"
      onClose={onCancel}
      dismissible={!isProcessing}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isProcessing}>Cancel</button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? 'Processing…' : 'Crop & Apply'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div style={{ position: 'relative', width: '100%', height: 'min(300px, 45dvh)', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1.586}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexDirection: 'column' }}>
          <div className="row">
            <label className="field-label" htmlFor="card-image-zoom">Zoom</label>
            <input 
              id="card-image-zoom"
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
          
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
      </div>
    </Modal>
  );
}
