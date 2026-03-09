'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
    if (previews.length === 0) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const uploadedUrls: string[] = [];

      for (const item of previews) {
        const timestamp = Date.now();
        const filename = `card-photo-${timestamp}-${Math.random().toString(36).slice(2)}.jpg`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('card-photos')
          .upload(filename, item.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('card-photos')
          .getPublicUrl(filename);

        uploadedUrls.push(publicUrl.publicUrl);
      }

      // Update wizard state with uploaded URLs
      updateState({ photos: uploadedUrls });
      setIsUploading(false);
      onNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setUploadError(message);
      setIsUploading(false);
    }
  };

  const canContinue = previews.length > 0 && state.photos.length === 0;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-red-600 bg-red-50' : 'border-muted hover:border-muted-foreground'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="font-medium mb-1">Drag photos here or click to upload</p>
        <p className="text-sm text-muted-foreground mb-4">Front photo required, back photo optional</p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
          disabled={isUploading}
        >
          <Upload className="w-4 h-4" />
          Select Photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Selected Photos ({previews.length})</p>
          <div className="grid grid-cols-2 gap-4">
            {previews.map((item, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={item.preview}
                  alt="preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removePreview(idx)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-muted-foreground mt-1 truncate">{item.file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Upload Error</p>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
        <p className="font-medium mb-1">Photo Tips</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>Front photo is required</li>
          <li>Back photo is optional but recommended</li>
          <li>Use good lighting for best results</li>
          <li>Include the whole card in frame</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={uploadPhotos}
          disabled={!canContinue || isUploading}
          className="bg-red-600 hover:bg-red-700 gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>Continue to Search</>
          )}
        </Button>
      </div>
    </div>
  );
}
