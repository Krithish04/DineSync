import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Reusable Image Upload component.
 * Allows drag-and-drop upload, manual file browsing, base64 conversion,
 * and pasting an image URL directly as a fallback.
 * 
 * @param {{
 *   value: string;
 *   onChange: (val: string) => void;
 *   label?: string;
 *   description?: string;
 *   className?: string;
 * }} props
 */
export default function ImageUpload({ value, onChange, label = 'Image', description, className }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError('');
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      onChange(base64String);
    };
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlField(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center justify-between">
        {label && <Label className="text-sm font-medium text-foreground">{label}</Label>}
        {!value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:text-primary/80"
            onClick={() => setShowUrlField(!showUrlField)}
          >
            {showUrlField ? 'Use file upload' : 'Paste image URL'}
          </Button>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {value ? (
        // Preview Screen
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/20 p-2">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
            <img src={value} alt="Preview" className="h-full w-full object-contain" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 rounded-full shadow-lg"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground truncate px-4">
            {value.startsWith('data:') ? 'Base64 Encoded Image Data' : value}
          </div>
        </div>
      ) : showUrlField ? (
        // URL input screen
        <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Paste Image URL</span>
          </div>
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 text-xs"
              required
            />
            <Button type="submit" size="sm">
              Apply
            </Button>
          </form>
        </div>
      ) : (
        // Drag and drop / file selector screen
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border bg-card hover:border-primary/50 hover:bg-muted/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            Drag &amp; drop file here, or <span className="text-primary hover:underline">browse</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Supports PNG, JPG, JPEG, WEBP (Max 5MB)
          </p>
        </div>
      )}
    </div>
  );
}
