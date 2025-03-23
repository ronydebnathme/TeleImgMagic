import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

// Define the schema for image edit configuration
const imageEditConfigSchema = z.object({
  // Basic image adjustments
  brightnessMin: z.number().min(-100).max(0),
  brightnessMax: z.number().min(0).max(100),
  contrastMin: z.number().min(-100).max(0),
  contrastMax: z.number().min(0).max(100),
  saturationMin: z.number().min(-100).max(0),
  saturationMax: z.number().min(0).max(100),
  blurMin: z.number().min(0).max(10),
  blurMax: z.number().min(0).max(10),
  noiseMin: z.number().min(0).max(20),
  noiseMax: z.number().min(0).max(20),
  
  // Image size configuration
  targetWidthMin: z.number().min(800).max(3000),
  targetWidthMax: z.number().min(800).max(3000),
  targetHeightMin: z.number().min(600).max(2000),
  targetHeightMax: z.number().min(600).max(2000),
  enableFixedAspectRatio: z.boolean(),
  fixedAspectRatio: z.string(),
  
  // Advanced filters
  enableVignette: z.boolean(),
  vignetteIntensityMin: z.number().min(0).max(50),
  vignetteIntensityMax: z.number().min(0).max(50),
  
  enableSharpen: z.boolean(),
  sharpenIntensityMin: z.number().min(0).max(5),
  sharpenIntensityMax: z.number().min(0).max(5),
  
  enableColorBalance: z.boolean(),
  colorBalanceRMin: z.number().min(-20).max(0),
  colorBalanceRMax: z.number().min(0).max(20),
  colorBalanceGMin: z.number().min(-20).max(0),
  colorBalanceGMax: z.number().min(0).max(20),
  colorBalanceBMin: z.number().min(-20).max(0),
  colorBalanceBMax: z.number().min(0).max(20),
  
  enableGrain: z.boolean(),
  grainIntensityMin: z.number().min(0).max(30),
  grainIntensityMax: z.number().min(0).max(30),
  
  enableFilters: z.boolean(),
  allowedFilters: z.array(z.string()),
  
  // Image transformations
  enableRotation: z.boolean(),
  rotationMin: z.number().min(-180).max(0),
  rotationMax: z.number().min(0).max(180),
  enableCrop: z.boolean(),
  cropAspectRatio: z.string(),
  
  // Metadata options
  enableRandomMetadata: z.boolean(),
  useConsistentMetadataPerFolder: z.boolean(),
  
  // Basic metadata fields
  randomizeDevice: z.boolean(),
  randomizeCamera: z.boolean(),
  randomizeDateTime: z.boolean(),
  randomizeFocalLength: z.boolean(),
  randomizeGPS: z.boolean(),
  randomizeExposure: z.boolean(),
  
  // Additional metadata fields
  randomizeAperture: z.boolean(),
  randomizeIso: z.boolean(),
  randomizeMeteringMode: z.boolean(),
  randomizeSubjectDistance: z.boolean()
});

type ImageEditConfig = z.infer<typeof imageEditConfigSchema>;

export default function ImageSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Fetch current configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/image-edit-config'],
    queryFn: () => apiRequest<ImageEditConfig>('/api/image-edit-config')
  });
  
  // Define form with validation
  const form = useForm<ImageEditConfig>({
    resolver: zodResolver(imageEditConfigSchema),
    defaultValues: {
      // Basic image adjustments
      brightnessMin: -30,
      brightnessMax: 30,
      contrastMin: -30,
      contrastMax: 30,
      saturationMin: -30,
      saturationMax: 30,
      blurMin: 0,
      blurMax: 5,
      noiseMin: 0,
      noiseMax: 10,
      
      // Image size configuration
      targetWidthMin: 1200,
      targetWidthMax: 2400,
      targetHeightMin: 800,
      targetHeightMax: 1600,
      enableFixedAspectRatio: false,
      fixedAspectRatio: "4:3",
      
      // Advanced filters
      enableVignette: false,
      vignetteIntensityMin: 10,
      vignetteIntensityMax: 30,
      
      enableSharpen: false,
      sharpenIntensityMin: 1,
      sharpenIntensityMax: 3,
      
      enableColorBalance: false,
      colorBalanceRMin: -10,
      colorBalanceRMax: 10,
      colorBalanceGMin: -10,
      colorBalanceGMax: 10,
      colorBalanceBMin: -10,
      colorBalanceBMax: 10,
      
      enableGrain: false,
      grainIntensityMin: 5,
      grainIntensityMax: 15,
      
      enableFilters: false,
      allowedFilters: ['vintage', 'warmth', 'clarity', 'coolness', 'vibrance'],
      
      // Image transformations
      enableRotation: true,
      rotationMin: -15,
      rotationMax: 15,
      enableCrop: false,
      cropAspectRatio: "original",
      
      // Metadata options
      enableRandomMetadata: true,
      useConsistentMetadataPerFolder: true,
      
      // Basic metadata
      randomizeDevice: true,
      randomizeCamera: true,
      randomizeDateTime: true,
      randomizeFocalLength: true,
      randomizeGPS: false,
      randomizeExposure: true,
      
      // Additional metadata
      randomizeAperture: true,
      randomizeIso: true,
      randomizeMeteringMode: true,
      randomizeSubjectDistance: true
    }
  });
  
  // Update form values when data is loaded
  React.useEffect(() => {
    if (config) {
      form.reset(config);
    }
  }, [config, form]);
  
  // Mutation to update configuration
  const updateConfigMutation = useMutation({
    mutationFn: (data: ImageEditConfig) => {
      return apiRequest('/api/image-edit-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-edit-config'] });
      toast({
        title: "Configuration saved",
        description: "Image editing settings have been updated successfully",
      });
      setLoading(false);
    },
    onError: (error) => {
      console.error('Failed to update config:', error);
      toast({
        title: "Failed to save",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  });
  
  const onSubmit = (data: ImageEditConfig) => {
    setLoading(true);
    updateConfigMutation.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <h1 className="text-2xl font-bold">Image Processing Settings</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">Image Processing Settings</h1>
      <p className="text-muted-foreground">
        Configure how images are modified and what metadata is applied during processing.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Modification Settings</CardTitle>
              <CardDescription>
                Set ranges for various image modifications that will be randomly applied
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Brightness Range</h3>
                <div className="flex flex-col space-y-2">
                  <Label>Min Brightness (-100 to 0)</Label>
                  <Input
                    type="number"
                    min="-100"
                    max="0"
                    {...form.register('brightnessMin', { valueAsNumber: true })}
                  />
                  {form.formState.errors.brightnessMin && (
                    <p className="text-sm text-red-500">{form.formState.errors.brightnessMin.message}</p>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Max Brightness (0 to 100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('brightnessMax', { valueAsNumber: true })}
                  />
                  {form.formState.errors.brightnessMax && (
                    <p className="text-sm text-red-500">{form.formState.errors.brightnessMax.message}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contrast Range</h3>
                <div className="flex flex-col space-y-2">
                  <Label>Min Contrast (-100 to 0)</Label>
                  <Input
                    type="number"
                    min="-100"
                    max="0"
                    {...form.register('contrastMin', { valueAsNumber: true })}
                  />
                  {form.formState.errors.contrastMin && (
                    <p className="text-sm text-red-500">{form.formState.errors.contrastMin.message}</p>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Max Contrast (0 to 100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('contrastMax', { valueAsNumber: true })}
                  />
                  {form.formState.errors.contrastMax && (
                    <p className="text-sm text-red-500">{form.formState.errors.contrastMax.message}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Blur Range</h3>
                <div className="flex flex-col space-y-2">
                  <Label>Min Blur (0 to 10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    {...form.register('blurMin', { valueAsNumber: true })}
                  />
                  {form.formState.errors.blurMin && (
                    <p className="text-sm text-red-500">{form.formState.errors.blurMin.message}</p>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Max Blur (0 to 10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    {...form.register('blurMax', { valueAsNumber: true })}
                  />
                  {form.formState.errors.blurMax && (
                    <p className="text-sm text-red-500">{form.formState.errors.blurMax.message}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Noise Range</h3>
                <div className="flex flex-col space-y-2">
                  <Label>Min Noise (0 to 20)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    {...form.register('noiseMin', { valueAsNumber: true })}
                  />
                  {form.formState.errors.noiseMin && (
                    <p className="text-sm text-red-500">{form.formState.errors.noiseMin.message}</p>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Max Noise (0 to 20)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    {...form.register('noiseMax', { valueAsNumber: true })}
                  />
                  {form.formState.errors.noiseMax && (
                    <p className="text-sm text-red-500">{form.formState.errors.noiseMax.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Image Size Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Image Size Configuration</CardTitle>
              <CardDescription>
                Configure target sizes for output images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Target Width Range</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col space-y-2">
                    <Label>Min Width (800 to 3000)</Label>
                    <Input
                      type="number"
                      min="800"
                      max="3000"
                      {...form.register('targetWidthMin', { valueAsNumber: true })}
                    />
                    {form.formState.errors.targetWidthMin && (
                      <p className="text-sm text-red-500">{form.formState.errors.targetWidthMin.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label>Max Width (800 to 3000)</Label>
                    <Input
                      type="number"
                      min="800"
                      max="3000"
                      {...form.register('targetWidthMax', { valueAsNumber: true })}
                    />
                    {form.formState.errors.targetWidthMax && (
                      <p className="text-sm text-red-500">{form.formState.errors.targetWidthMax.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Target Height Range</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col space-y-2">
                    <Label>Min Height (600 to 2000)</Label>
                    <Input
                      type="number"
                      min="600"
                      max="2000"
                      {...form.register('targetHeightMin', { valueAsNumber: true })}
                    />
                    {form.formState.errors.targetHeightMin && (
                      <p className="text-sm text-red-500">{form.formState.errors.targetHeightMin.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label>Max Height (600 to 2000)</Label>
                    <Input
                      type="number"
                      min="600"
                      max="2000"
                      {...form.register('targetHeightMax', { valueAsNumber: true })}
                    />
                    {form.formState.errors.targetHeightMax && (
                      <p className="text-sm text-red-500">{form.formState.errors.targetHeightMax.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableFixedAspectRatio"
                  checked={form.watch('enableFixedAspectRatio')}
                  onCheckedChange={(checked) => form.setValue('enableFixedAspectRatio', checked)}
                />
                <Label htmlFor="enableFixedAspectRatio">Force Fixed Aspect Ratio</Label>
              </div>
              
              {form.watch('enableFixedAspectRatio') && (
                <div className="pl-6">
                  <div className="flex flex-col space-y-2">
                    <Label>Fixed Aspect Ratio</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...form.register('fixedAspectRatio')}
                    >
                      <option value="4:3">Standard (4:3)</option>
                      <option value="16:9">Widescreen (16:9)</option>
                      <option value="3:2">Classic Film (3:2)</option>
                      <option value="1:1">Square (1:1)</option>
                      <option value="2:3">Portrait (2:3)</option>
                      <option value="3:4">Portrait (3:4)</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Advanced Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Filters</CardTitle>
              <CardDescription>
                Configure advanced image filters and effects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vignette Settings */}
              <div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableVignette"
                    checked={form.watch('enableVignette')}
                    onCheckedChange={(checked) => form.setValue('enableVignette', checked)}
                  />
                  <Label htmlFor="enableVignette">Enable Vignette Effect</Label>
                </div>
                
                {form.watch('enableVignette') && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 mt-2">
                    <div className="flex flex-col space-y-2">
                      <Label>Min Intensity (0 to 50)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        {...form.register('vignetteIntensityMin', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label>Max Intensity (0 to 50)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        {...form.register('vignetteIntensityMax', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Sharpen Settings */}
              <div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableSharpen"
                    checked={form.watch('enableSharpen')}
                    onCheckedChange={(checked) => form.setValue('enableSharpen', checked)}
                  />
                  <Label htmlFor="enableSharpen">Enable Sharpening</Label>
                </div>
                
                {form.watch('enableSharpen') && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 mt-2">
                    <div className="flex flex-col space-y-2">
                      <Label>Min Intensity (0 to 5)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        {...form.register('sharpenIntensityMin', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label>Max Intensity (0 to 5)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        {...form.register('sharpenIntensityMax', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Color Balance Settings */}
              <div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableColorBalance"
                    checked={form.watch('enableColorBalance')}
                    onCheckedChange={(checked) => form.setValue('enableColorBalance', checked)}
                  />
                  <Label htmlFor="enableColorBalance">Enable Color Balance Adjustment</Label>
                </div>
                
                {form.watch('enableColorBalance') && (
                  <div className="pl-6 mt-2">
                    <h4 className="font-medium mb-2">Red Channel</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                      <div className="flex flex-col space-y-2">
                        <Label>Min Adjustment (-20 to 0)</Label>
                        <Input
                          type="number"
                          min="-20"
                          max="0"
                          {...form.register('colorBalanceRMin', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Label>Max Adjustment (0 to 20)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          {...form.register('colorBalanceRMax', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    
                    <h4 className="font-medium mb-2">Green Channel</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                      <div className="flex flex-col space-y-2">
                        <Label>Min Adjustment (-20 to 0)</Label>
                        <Input
                          type="number"
                          min="-20"
                          max="0"
                          {...form.register('colorBalanceGMin', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Label>Max Adjustment (0 to 20)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          {...form.register('colorBalanceGMax', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    
                    <h4 className="font-medium mb-2">Blue Channel</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex flex-col space-y-2">
                        <Label>Min Adjustment (-20 to 0)</Label>
                        <Input
                          type="number"
                          min="-20"
                          max="0"
                          {...form.register('colorBalanceBMin', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Label>Max Adjustment (0 to 20)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          {...form.register('colorBalanceBMax', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Film Grain Settings */}
              <div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableGrain"
                    checked={form.watch('enableGrain')}
                    onCheckedChange={(checked) => form.setValue('enableGrain', checked)}
                  />
                  <Label htmlFor="enableGrain">Enable Film Grain Effect</Label>
                </div>
                
                {form.watch('enableGrain') && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 mt-2">
                    <div className="flex flex-col space-y-2">
                      <Label>Min Intensity (0 to 30)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        {...form.register('grainIntensityMin', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label>Max Intensity (0 to 30)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        {...form.register('grainIntensityMax', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Preset Filters */}
              <div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableFilters"
                    checked={form.watch('enableFilters')}
                    onCheckedChange={(checked) => form.setValue('enableFilters', checked)}
                  />
                  <Label htmlFor="enableFilters">Enable Preset Filters</Label>
                </div>
                
                {form.watch('enableFilters') && (
                  <div className="pl-6 mt-2">
                    <Label className="mb-2 block">Allowed Filters</Label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {['vintage', 'warmth', 'clarity', 'coolness', 'vibrance'].map((filter) => (
                        <div key={filter} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`filter-${filter}`}
                            checked={form.watch('allowedFilters').includes(filter)}
                            onCheckedChange={(checked) => {
                              const currentFilters = form.watch('allowedFilters');
                              if (checked) {
                                if (!currentFilters.includes(filter)) {
                                  form.setValue('allowedFilters', [...currentFilters, filter]);
                                }
                              } else {
                                form.setValue('allowedFilters', currentFilters.filter(f => f !== filter));
                              }
                            }}
                          />
                          <Label htmlFor={`filter-${filter}`} className="capitalize">{filter}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Transformations Card */}
          <Card>
            <CardHeader>
              <CardTitle>Image Transformations</CardTitle>
              <CardDescription>
                Configure rotation and cropping options for processed images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableRotation"
                  checked={form.watch('enableRotation')}
                  onCheckedChange={(checked) => form.setValue('enableRotation', checked)}
                />
                <Label htmlFor="enableRotation">Enable random rotation</Label>
              </div>
              
              {form.watch('enableRotation') && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6">
                  <div className="flex flex-col space-y-2">
                    <Label>Min Rotation (-180 to 0)</Label>
                    <Input
                      type="number"
                      min="-180"
                      max="0"
                      {...form.register('rotationMin', { valueAsNumber: true })}
                    />
                    {form.formState.errors.rotationMin && (
                      <p className="text-sm text-red-500">{form.formState.errors.rotationMin.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label>Max Rotation (0 to 180)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      {...form.register('rotationMax', { valueAsNumber: true })}
                    />
                    {form.formState.errors.rotationMax && (
                      <p className="text-sm text-red-500">{form.formState.errors.rotationMax.message}</p>
                    )}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableCrop"
                  checked={form.watch('enableCrop')}
                  onCheckedChange={(checked) => form.setValue('enableCrop', checked)}
                />
                <Label htmlFor="enableCrop">Enable cropping</Label>
              </div>
              
              {form.watch('enableCrop') && (
                <div className="pl-6">
                  <div className="flex flex-col space-y-2">
                    <Label>Crop Aspect Ratio</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...form.register('cropAspectRatio')}
                    >
                      <option value="original">Original (No Change)</option>
                      <option value="1:1">Square (1:1)</option>
                      <option value="4:3">Standard (4:3)</option>
                      <option value="16:9">Widescreen (16:9)</option>
                      <option value="3:2">Classic Film (3:2)</option>
                      <option value="2:3">Portrait (2:3)</option>
                      <option value="3:4">Portrait (3:4)</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Metadata Settings</CardTitle>
              <CardDescription>
                Configure how metadata is injected into processed images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableRandomMetadata"
                  checked={form.watch('enableRandomMetadata')}
                  onCheckedChange={(checked) => form.setValue('enableRandomMetadata', checked)}
                />
                <Label htmlFor="enableRandomMetadata">Enable random metadata injection</Label>
              </div>
              
              {form.watch('enableRandomMetadata') && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="useConsistentMetadataPerFolder"
                      checked={form.watch('useConsistentMetadataPerFolder')}
                      onCheckedChange={(checked) => form.setValue('useConsistentMetadataPerFolder', checked)}
                    />
                    <Label htmlFor="useConsistentMetadataPerFolder">Use consistent metadata within each folder</Label>
                  </div>
                  
                  <Separator />
                  
                  <h3 className="text-lg font-medium">Basic Metadata</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeDevice"
                        checked={form.watch('randomizeDevice')}
                        onCheckedChange={(checked) => form.setValue('randomizeDevice', checked)}
                      />
                      <Label htmlFor="randomizeDevice">Randomize device model</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeCamera"
                        checked={form.watch('randomizeCamera')}
                        onCheckedChange={(checked) => form.setValue('randomizeCamera', checked)}
                      />
                      <Label htmlFor="randomizeCamera">Randomize camera model</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeDateTime"
                        checked={form.watch('randomizeDateTime')}
                        onCheckedChange={(checked) => form.setValue('randomizeDateTime', checked)}
                      />
                      <Label htmlFor="randomizeDateTime">Randomize date and time</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeFocalLength"
                        checked={form.watch('randomizeFocalLength')}
                        onCheckedChange={(checked) => form.setValue('randomizeFocalLength', checked)}
                      />
                      <Label htmlFor="randomizeFocalLength">Randomize focal length</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeGPS"
                        checked={form.watch('randomizeGPS')}
                        onCheckedChange={(checked) => form.setValue('randomizeGPS', checked)}
                      />
                      <Label htmlFor="randomizeGPS">Randomize GPS location</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeExposure"
                        checked={form.watch('randomizeExposure')}
                        onCheckedChange={(checked) => form.setValue('randomizeExposure', checked)}
                      />
                      <Label htmlFor="randomizeExposure">Randomize exposure time</Label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <h3 className="text-lg font-medium">Advanced Metadata</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeAperture"
                        checked={form.watch('randomizeAperture')}
                        onCheckedChange={(checked) => form.setValue('randomizeAperture', checked)}
                      />
                      <Label htmlFor="randomizeAperture">Randomize aperture (f-stop)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeIso"
                        checked={form.watch('randomizeIso')}
                        onCheckedChange={(checked) => form.setValue('randomizeIso', checked)}
                      />
                      <Label htmlFor="randomizeIso">Randomize ISO speed</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeMeteringMode"
                        checked={form.watch('randomizeMeteringMode')}
                        onCheckedChange={(checked) => form.setValue('randomizeMeteringMode', checked)}
                      />
                      <Label htmlFor="randomizeMeteringMode">Randomize metering mode</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="randomizeSubjectDistance"
                        checked={form.watch('randomizeSubjectDistance')}
                        onCheckedChange={(checked) => form.setValue('randomizeSubjectDistance', checked)}
                      />
                      <Label htmlFor="randomizeSubjectDistance">Randomize subject distance</Label>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}