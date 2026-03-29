'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, AlertCircle, Loader2 } from 'lucide-react';
import { uploadCardPhotos } from '@/lib/supabase/storage-actions';

interface StepPhotosProps {
  state: {
    photos: string[];
  };
  updateState: (updates: any) => void;
  onNext: () => void;
}

export default function StepPhotos({ state, updateState, onNext }: StepPhotosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');


  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setPreviews((prev) => [...prev, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePreview = (idx: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async () => {
    if (previews.length === 0) {
      setUploadError('No photos selected');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // Convert File objects to base64 strings for server action
      const filesToUpload: { name: string; data: string }[] = [];

      for (const item of previews) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).slice(2);
        const filename = `card-photo-${timestamp}-${randomStr}.jpg`;

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Extract base64 data (remove data:image/jpeg;base64, prefix)
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        filesToUpload.push({ name: filename, data: base64 });
      }

      console.log('Uploading', filesToUpload.length, 'photos via server action');

      // Call server action to upload using service role
      const result = await uploadCardPhotos(
        filesToUpload.map(f => ({
          name: f.name,
          base64: f.data,
        }))
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('All photos uploaded:', result.urls);

      // Update wizard state with uploaded URLs
      updateState({ photos: result.urls });
      setPreviews([]);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Upload error:', error);
      setUploadError(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Card Photos</h2>
        <p className="text-muted-foreground">Upload at least one photo. Drag & drop or click to select.</p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/10' : 'border-border'
        }`}
      >
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium mb-2">Drag photos here or click to browse</p>
        <p className="text-xs text-muted-foreground mb-4">JPG, PNG up to 10MB each</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Select Photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="bg-destructive/20 border border-destructive rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{uploadError}</p>
        </div>
      )}

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Selected: {previews.length} photo(s)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {previews.map((item, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={item.preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
                <button
                  onClick={() => removePreview(idx)}
                  className="absolute top-2 right-2 bg-destructive rounded-full p-1 text-white hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {previews.length > 0 && (
          <Button
            onClick={uploadPhotos}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {previews.length} Photo{previews.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={state.photos.length === 0 || isUploading}
          variant={state.photos.length > 0 ? 'default' : 'outline'}
          className="flex-1"
        >
          Continue
        </Button>
      </div>

      {state.photos.length > 0 && (
        <p className="text-sm text-success flex items-center gap-2">
          ✓ {state.photos.length} photo(s) uploaded
        </p>
      )}
    </div>
  );
}
