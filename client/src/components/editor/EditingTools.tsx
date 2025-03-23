import { useState } from 'react';
import ToolTab, { TabType } from './ToolTab';
import { useToast } from '@/hooks/use-toast';

interface ImageDimensions {
  width: number | '';
  height: number | '';
}

interface EditingToolsProps {
  selectedFile: File | null;
  onProcessImage: (options: ImageProcessingOptions) => void;
  processing: boolean;
}

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
  };
  crop?: {
    aspect: string;
  };
  rotate?: {
    degrees: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  };
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpen: number;
    noise: number;
  };
  filters?: {
    name: string;
    intensity: number;
  };
  metadata?: {
    removeExif: boolean;
    addRandomMetadata: boolean;
  };
}

export default function EditingTools({ selectedFile, onProcessImage, processing }: EditingToolsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: '', height: '' });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [cropAspect, setCropAspect] = useState('original');
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [noise, setNoise] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [removeExif, setRemoveExif] = useState(false);
  const [addRandomMetadata, setAddRandomMetadata] = useState(false);
  const { toast } = useToast();

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value === '' ? '' : parseInt(e.target.value);
    setDimensions(prev => ({ ...prev, width: newWidth }));
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = e.target.value === '' ? '' : parseInt(e.target.value);
    setDimensions(prev => ({ ...prev, height: newHeight }));
  };

  const handleResetClick = () => {
    setDimensions({ width: '', height: '' });
    setMaintainAspectRatio(true);
    setCropAspect('original');
    setRotationDegrees(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setBlur(0);
    setSharpen(0);
    setNoise(0);
    setSelectedFilter('');
    setRemoveExif(false);
    setAddRandomMetadata(false);
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive"
      });
      return;
    }

    const options: ImageProcessingOptions = {
      adjustments: {
        brightness: brightness,
        contrast: contrast,
        saturation: saturation,
        blur: blur,
        sharpen: sharpen,
        noise: noise
      }
    };

    // Add resize options if dimensions were specified
    if (dimensions.width || dimensions.height) {
      options.resize = {
        maintainAspectRatio: maintainAspectRatio
      };
      
      if (dimensions.width) {
        options.resize.width = dimensions.width as number;
      }
      
      if (dimensions.height) {
        options.resize.height = dimensions.height as number;
      }
    }

    // Add crop options if not 'original'
    if (cropAspect !== 'original') {
      options.crop = {
        aspect: cropAspect
      };
    }
    
    // Add rotation options if applicable
    if (rotationDegrees !== 0 || flipHorizontal || flipVertical) {
      options.rotate = {
        degrees: rotationDegrees,
        flipHorizontal: flipHorizontal,
        flipVertical: flipVertical
      };
    }

    // Add filter if selected
    if (selectedFilter) {
      options.filters = {
        name: selectedFilter,
        intensity: 100
      };
    }
    
    // Add metadata options if applicable
    if (removeExif || addRandomMetadata) {
      options.metadata = {
        removeExif: removeExif,
        addRandomMetadata: addRandomMetadata
      };
    }

    onProcessImage(options);
  };

  return (
    <div className="w-full lg:w-1/3 p-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-medium text-slate-900">Editing Tools</h2>
      </div>
      
      <ToolTab activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Tool options based on active tab */}
      <div className="py-4 space-y-6">
        {activeTab === 'basic' && (
          <>
            {/* Resize */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Resize</label>
              <div className="mt-1 flex space-x-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500">Width</label>
                  <input 
                    type="number" 
                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm text-sm" 
                    placeholder="Width" 
                    value={dimensions.width}
                    onChange={handleWidthChange}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500">Height</label>
                  <input 
                    type="number" 
                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm text-sm" 
                    placeholder="Height" 
                    value={dimensions.height}
                    onChange={handleHeightChange}
                  />
                </div>
                <div className="flex items-end mb-1">
                  <button 
                    type="button" 
                    className={`inline-flex items-center p-1 border border-slate-300 rounded-md ${
                      maintainAspectRatio ? 'bg-primary-50 text-primary-600' : 'text-slate-500'
                    }`}
                    onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                  >
                    <i className="ri-link text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Crop */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Crop</label>
              <div className="mt-1 grid grid-cols-4 gap-2">
                <button 
                  className={`border ${cropAspect === 'original' ? 'border-primary-500 bg-primary-50' : 'border-slate-300'} rounded p-1 hover:bg-slate-50`}
                  onClick={() => setCropAspect('original')}
                >
                  <span className="block h-8 bg-slate-200 rounded"></span>
                  <span className="text-xs mt-1 block text-slate-500">Original</span>
                </button>
                <button 
                  className={`border ${cropAspect === '1:1' ? 'border-primary-500 bg-primary-50' : 'border-slate-300'} rounded p-1 hover:bg-slate-50`}
                  onClick={() => setCropAspect('1:1')}
                >
                  <span className="block h-8 bg-slate-200 rounded" style={{ aspectRatio: "1/1" }}></span>
                  <span className="text-xs mt-1 block text-slate-500">1:1</span>
                </button>
                <button 
                  className={`border ${cropAspect === '4:3' ? 'border-primary-500 bg-primary-50' : 'border-slate-300'} rounded p-1 hover:bg-slate-50`}
                  onClick={() => setCropAspect('4:3')}
                >
                  <span className="block h-8 bg-slate-200 rounded" style={{ aspectRatio: "4/3" }}></span>
                  <span className="text-xs mt-1 block text-slate-500">4:3</span>
                </button>
                <button 
                  className={`border ${cropAspect === '16:9' ? 'border-primary-500 bg-primary-50' : 'border-slate-300'} rounded p-1 hover:bg-slate-50`}
                  onClick={() => setCropAspect('16:9')}
                >
                  <span className="block h-8 bg-slate-200 rounded" style={{ aspectRatio: "16/9" }}></span>
                  <span className="text-xs mt-1 block text-slate-500">16:9</span>
                </button>
              </div>
            </div>
            
            {/* Brightness & Contrast */}
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">Brightness</label>
                <span className="text-xs text-slate-500">{brightness}%</span>
              </div>
              <input 
                type="range" 
                className="w-full h-2 mt-2" 
                min="0" 
                max="100" 
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">Contrast</label>
                <span className="text-xs text-slate-500">{contrast}%</span>
              </div>
              <input 
                type="range" 
                className="w-full h-2 mt-2" 
                min="0" 
                max="100" 
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
              />
            </div>
          </>
        )}

        {activeTab === 'filters' && (
          <div className="grid grid-cols-3 gap-3">
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'none' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('none')}
            >
              <div className="h-12 bg-slate-200 rounded mb-1"></div>
              <span className="text-xs">None</span>
            </button>
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'grayscale' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('grayscale')}
            >
              <div className="h-12 bg-slate-400 rounded mb-1"></div>
              <span className="text-xs">Grayscale</span>
            </button>
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'sepia' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('sepia')}
            >
              <div className="h-12 bg-amber-200 rounded mb-1"></div>
              <span className="text-xs">Sepia</span>
            </button>
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'vintage' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('vintage')}
            >
              <div className="h-12 bg-yellow-100 rounded mb-1"></div>
              <span className="text-xs">Vintage</span>
            </button>
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'clarity' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('clarity')}
            >
              <div className="h-12 bg-blue-100 rounded mb-1"></div>
              <span className="text-xs">Clarity</span>
            </button>
            <button 
              className={`p-2 text-center border rounded ${selectedFilter === 'dramatic' ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              onClick={() => setSelectedFilter('dramatic')}
            >
              <div className="h-12 bg-slate-700 rounded mb-1"></div>
              <span className="text-xs">Dramatic</span>
            </button>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* Rotation controls */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Rotation</label>
              <div className="mt-2 flex items-center space-x-4">
                <button
                  type="button"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"
                  onClick={() => setRotationDegrees(prev => (prev - 90) % 360)}
                >
                  <i className="ri-rotate-left-line text-lg"></i>
                </button>
                <div className="flex-1 text-center">
                  <div className="text-sm font-medium">{rotationDegrees}°</div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={rotationDegrees}
                    onChange={(e) => setRotationDegrees(parseInt(e.target.value))}
                    className="w-full mt-1"
                  />
                </div>
                <button
                  type="button"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"
                  onClick={() => setRotationDegrees(prev => (prev + 90) % 360)}
                >
                  <i className="ri-rotate-right-line text-lg"></i>
                </button>
              </div>
            </div>
            
            {/* Flip controls */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Flip</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 border rounded-md ${
                    flipHorizontal ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-300'
                  }`}
                  onClick={() => setFlipHorizontal(!flipHorizontal)}
                >
                  <i className="ri-arrow-left-right-line mr-2"></i>
                  Horizontal
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 border rounded-md ${
                    flipVertical ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-300'
                  }`}
                  onClick={() => setFlipVertical(!flipVertical)}
                >
                  <i className="ri-arrow-up-down-line mr-2"></i>
                  Vertical
                </button>
              </div>
            </div>
            
            {/* Additional adjustments */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Advanced Adjustments</label>
              
              <div className="space-y-4">
                {/* Saturation */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-600">Saturation</label>
                    <span className="text-xs text-slate-500">{saturation}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 mt-1" 
                    min="0" 
                    max="100" 
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                  />
                </div>
                
                {/* Blur */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-600">Blur</label>
                    <span className="text-xs text-slate-500">{blur}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 mt-1" 
                    min="0" 
                    max="100" 
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                  />
                </div>
                
                {/* Sharpen */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-600">Sharpen</label>
                    <span className="text-xs text-slate-500">{sharpen}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 mt-1" 
                    min="0" 
                    max="100" 
                    value={sharpen}
                    onChange={(e) => setSharpen(parseInt(e.target.value))}
                  />
                </div>
                
                {/* Noise */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-600">Noise</label>
                    <span className="text-xs text-slate-500">{noise}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="w-full h-2 mt-1" 
                    min="0" 
                    max="100" 
                    value={noise}
                    onChange={(e) => setNoise(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
            
            {/* Metadata options */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Metadata Options</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="removeExif"
                    checked={removeExif}
                    onChange={() => setRemoveExif(!removeExif)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                  />
                  <label htmlFor="removeExif" className="ml-2 block text-sm text-slate-700">
                    Remove EXIF data
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addRandomMetadata"
                    checked={addRandomMetadata}
                    onChange={() => setAddRandomMetadata(!addRandomMetadata)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                  />
                  <label htmlFor="addRandomMetadata" className="ml-2 block text-sm text-slate-700">
                    Add random metadata
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="pt-4 border-t border-slate-200 flex space-x-3">
        <button 
          type="button" 
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
          onClick={handleResetClick}
          disabled={processing}
        >
          Reset
        </button>
        <button 
          type="button" 
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!selectedFile || processing}
        >
          {processing ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-2"></i>
              Processing...
            </>
          ) : (
            <>Apply & Send</>
          )}
        </button>
      </div>
    </div>
  );
}
