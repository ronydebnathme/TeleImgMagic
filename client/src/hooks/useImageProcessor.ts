import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageProcessingOptions } from '@/components/editor/EditingTools';

interface ProcessImageParams {
  file: File;
  options: ImageProcessingOptions;
}

export function useImageProcessor() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processImageMutation = useMutation({
    mutationFn: async ({ file, options }: ProcessImageParams) => {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('options', JSON.stringify(options));

      // Track upload progress with XHR
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        // Set up completed handler
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(xhr.statusText));
          }
        };

        // Set up error handler
        xhr.onerror = () => {
          reject(new Error('Network error'));
        };

        // Open the request
        xhr.open('POST', '/api/images/process', true);
        
        // Send the form data
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Image processed successfully",
        description: "The image has been processed and sent to Telegram",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/images/recent'] });
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Reset progress
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  });

  // Set up SSE for processing progress
  const setupProgressListener = (jobId: string) => {
    const eventSource = new EventSource(`/api/images/progress/${jobId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProcessingProgress(data.progress);
        
        if (data.progress >= 100) {
          eventSource.close();
        }
      } catch (e) {
        console.error('Error parsing progress data', e);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
    };
    
    return eventSource;
  };

  return {
    processImage: (file: File, options: ImageProcessingOptions) => 
      processImageMutation.mutate({ file, options }),
    isProcessing: processImageMutation.isPending,
    uploadProgress,
    processingProgress,
    setupProgressListener
  };
}
