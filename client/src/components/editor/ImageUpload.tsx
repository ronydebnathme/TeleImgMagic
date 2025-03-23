import { useState, useRef, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  selectedFile: File | null;
  onRemoveImage: () => void;
}

export default function ImageUpload({ onImageSelected, selectedFile, onRemoveImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelected(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full lg:w-2/3 p-4 border-b lg:border-b-0 lg:border-r border-slate-200">
      <div 
        className="h-96 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Preview Image (shown when image is selected) */}
        {preview ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-full max-w-full object-contain" 
            />
          </div>
        ) : (
          /* Upload prompt (shown when no image is selected) */
          <div className="text-center">
            <i className="ri-upload-cloud-line text-5xl text-slate-400"></i>
            <h3 className="mt-2 text-sm font-medium text-slate-900">Upload an image</h3>
            <p className="mt-1 text-sm text-slate-500">
              Drag and drop or click to select
            </p>
            <div className="mt-4">
              <button 
                type="button" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                onClick={handleButtonClick}
              >
                <i className="ri-upload-line mr-2"></i>
                Upload Image
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Supports JPEG, PNG, GIF (up to 100MB)
            </p>
          </div>
        )}
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*"
        />
      </div>
      
      {selectedFile && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
            <span className="ml-2 text-sm text-slate-500">{formatFileSize(selectedFile.size)}</span>
          </div>
          <button 
            type="button" 
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-slate-700 hover:text-slate-900"
            onClick={() => {
              setPreview(null);
              onRemoveImage();
            }}
          >
            <i className="ri-close-line mr-1"></i>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
