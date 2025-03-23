import { useState } from 'react';
import ImageUpload from '@/components/editor/ImageUpload';
import EditingTools, { ImageProcessingOptions } from '@/components/editor/EditingTools';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { ProgressDisplay } from '@/components/ui/progress-display';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

export default function Editor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { connection, isLoadingConnection } = useTelegramAuth();
  const { processImage, isProcessing, uploadProgress, processingProgress } = useImageProcessor();
  const { toast } = useToast();

  const handleImageSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
  };

  const handleProcessImage = (options: ImageProcessingOptions) => {
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive"
      });
      return;
    }

    if (!connection?.connected) {
      toast({
        title: "Not connected to Telegram",
        description: "Please connect to Telegram API first",
        variant: "destructive"
      });
      return;
    }

    processImage(selectedFile, options);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-800">Image Editor</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="flex flex-col lg:flex-row">
            <ImageUpload
              onImageSelected={handleImageSelected}
              selectedFile={selectedFile}
              onRemoveImage={handleRemoveImage}
            />
            
            <EditingTools
              selectedFile={selectedFile}
              onProcessImage={handleProcessImage}
              processing={isProcessing}
            />
          </div>

          {/* Progress bar when uploading/processing */}
          {isProcessing && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <div className="space-y-4">
                <ProgressDisplay
                  current={uploadProgress}
                  total={100}
                  label="Uploading"
                />
                {uploadProgress === 100 && (
                  <ProgressDisplay
                    current={processingProgress}
                    total={100}
                    label="Processing"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
