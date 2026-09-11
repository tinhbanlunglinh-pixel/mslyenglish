import React, { useRef } from 'react';

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  isLoading: boolean;
  fileCount: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelect, isLoading, fileCount }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className={`
        border-4 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer relative overflow-hidden group
        ${isLoading ? 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'}
      `}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={!isLoading ? handleClick : undefined}
    >
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
        <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center text-4xl text-blue-500 group-hover:scale-110 transition-transform">
          {fileCount > 0 ? '📚' : '📸'}
        </div>
        
        <div className="space-y-1">
          <p className="text-xl font-bold text-blue-900">
            {fileCount > 0 ? `${fileCount} pages selected` : 'Drop book pages here'}
          </p>
          <p className="text-sm text-blue-600 font-medium">
            or click to browse
          </p>
        </div>
      </div>

      {fileCount > 0 && (
         <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
            Ready!
         </div>
      )}
    </div>
  );
};
