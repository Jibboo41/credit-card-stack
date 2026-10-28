import { useEffect, useId, useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { Upload, X } from 'lucide-react';
import { ImageCropperModal } from '../ImageCropperModal';

interface CardImagePickerProps {
  value: string;
  onChange: (url: string, image?: Blob) => void;
  disabled?: boolean;
}

export function CardImagePicker({ value, onChange, disabled }: CardImagePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => { if (source?.startsWith('blob:')) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    setError('');
    setSource(URL.createObjectURL(file));
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled || source) return;
    const imageItem = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'));
    const file = imageItem?.getAsFile() ?? Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      selectImage(file);
    } else {
      const text = event.clipboardData.getData('text').trim();
      if (text.startsWith('data:image/')) {
        event.preventDefault();
        setSource(text);
      }
    }
  };

  return (
    <div className="field full" onPaste={handlePaste}>
      <label className="field-label" htmlFor={id}>Card Image</label>
      <div className="row wrap" style={{ gap: '8px' }}>
        <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Upload size={14} /> Upload Image
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange('')} disabled={disabled}>
            <X size={14} /> Remove Image
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) selectImage(file);
            event.target.value = '';
          }}
          disabled={disabled}
          aria-label="Upload card image"
        />
      </div>
      <input
        id={id}
        type="url"
        className="input"
        value={value.startsWith('blob:') ? '' : value}
        onChange={event => { setError(''); onChange(event.target.value); }}
        placeholder="Paste an image or enter an image URL"
        disabled={disabled}
      />
      <span className="field-hint">Upload a file or paste a copied image here, crop it, then save the card.</span>
      {preview === value && <span className="field-hint text-good">New image ready. Save the card to keep it.</span>}
      {error && <span role="alert" className="form-error">{error}</span>}
      {source && (
        <ImageCropperModal
          imageSrc={source}
          onCancel={() => setSource(null)}
          onCropComplete={image => {
            const url = URL.createObjectURL(image);
            setPreview(url);
            onChange(url, image);
            setSource(null);
          }}
        />
      )}
    </div>
  );
}
