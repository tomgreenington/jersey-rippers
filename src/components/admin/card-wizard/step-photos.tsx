'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface WizardPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface StepPhotosState {
  photos: string[];
  photoFiles: WizardPhoto[];
}

interface StepPhotosProps {
  state: StepPhotosState;
  updateState: (updates: Partial<StepPhotosState>) => void;
  onNext: () => void;
}

const MAX_PHOTOS = 6;
const MAX_UPLOAD_BYTES = 1_200_000;
const MAX_IMAGE_EDGE = 1800;

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not prepare image for upload'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

async function prepareImageFile(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare image preview');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.86;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > MAX_UPLOAD_BYTES && quality > 0.56) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'card-photo';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export default function StepPhotos({ state, updateState, onNext }: StepPhotosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handleFiles = async (files: FileList) => {
    const newFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (newFiles.length === 0) {
      setPhotoError('Select JPG, PNG, or another image file.');
      return;
    }

    if (state.photoFiles.length + newFiles.length > MAX_PHOTOS) {
      setPhotoError(`Upload up to ${MAX_PHOTOS} photos for one listing.`);
      return;
    }

    setPhotoError('');

    try {
      const nextPhotos = await Promise.all(
        newFiles.map(async (file) => {
          const preparedFile = await prepareImageFile(file);

          return {
            id: crypto.randomUUID(),
            file: preparedFile,
            previewUrl: URL.createObjectURL(preparedFile),
          };
        })
      );

      updateState({
        photoFiles: [...state.photoFiles, ...nextPhotos],
        photos: [],
      });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Could not prepare image upload'
      );
    }
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

  const removePhoto = (id: string) => {
    const removed = state.photoFiles.find((photo) => photo.id === id);
    if (removed?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    updateState({
      photoFiles: state.photoFiles.filter((photo) => photo.id !== id),
    });
  };

  const hasPhotos = state.photoFiles.length > 0 || state.photos.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Card Photos</h2>
        <p className="text-muted-foreground">
          Select at least one photo. Photos upload only when you save or publish.
        </p>
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
        <p className="text-xs text-muted-foreground mb-4">
          JPG or PNG. Large phone photos are optimized before upload.
        </p>
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
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Error Message */}
      {photoError && (
        <div className="bg-destructive/20 border border-destructive rounded-lg p-4 flex gap-3">
          <p className="text-sm text-destructive">{photoError}</p>
        </div>
      )}

      {/* Preview Grid */}
      {state.photoFiles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">
            Selected: {state.photoFiles.length} photo(s)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {state.photoFiles.map((item, idx) => (
              <div key={item.id} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(item.id)}
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
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!hasPhotos}
          variant={hasPhotos ? 'default' : 'outline'}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
