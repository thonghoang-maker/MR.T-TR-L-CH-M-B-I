import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Camera, Clipboard, Plus } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploaderProps {
  label: string;
  subLabel?: string;
  accept?: string;
  file: UploadedFile | null;
  onFileSelect: (file: UploadedFile | null) => void;
  icon?: React.ReactNode;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  subLabel,
  accept = "image/*", 
  file, 
  onFileSelect,
  icon 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onFileSelect({
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        base64: (reader.result as string).split(',')[1]
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
    if (event.target) event.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) processFile(blob);
        break;
      }
    }
  };

  const triggerManualPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          processFile(new File([blob], "pasted-image.png", { type: blob.type }));
          return;
        }
      }
      alert("Không tìm thấy hình ảnh trong bộ nhớ tạm.");
    } catch (err) {
      containerRef.current?.focus();
      alert("Click vào khung và nhấn Ctrl+V để dán.");
    }
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      setCameraError('Cần cấp quyền Camera.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          processFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  };

  return (
    <div className="w-full h-full">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{label}</label>}
      <canvas ref={canvasRef} className="hidden" />

      {!file ? (
        <div 
          ref={containerRef}
          tabIndex={0}
          onPaste={handlePaste}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative w-full h-full min-h-[140px] rounded-xl transition-all duration-300 overflow-hidden flex flex-col items-center justify-center group outline-none ${
            isDragging 
              ? 'border-2 border-indigo-500 bg-indigo-50' 
              : 'border border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-400'
          }`}
        >
          {isCameraOpen ? (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
              <div className="absolute bottom-4 flex gap-3 z-10">
                <button onClick={stopCamera} className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-bold backdrop-blur-md hover:bg-white/30">Hủy</button>
                <button onClick={capturePhoto} className="px-4 py-1.5 bg-white text-black rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-gray-100">
                  <Camera size={14} /> Chụp
                </button>
              </div>
            </div>
          ) : (
            <>
              <div 
                className="flex-1 flex flex-col items-center justify-center p-4 cursor-pointer w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-2 p-3 rounded-full bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  {icon || <Upload size={20} className="text-slate-400 group-hover:text-indigo-500" />}
                </div>
                <div className="text-center">
                    <p className="text-slate-600 font-bold text-sm group-hover:text-indigo-600 transition-colors">
                    Chọn File
                    </p>
                    {subLabel && <p className="text-[10px] text-slate-400 mt-0.5">{subLabel}</p>}
                </div>
                {cameraError && <p className="text-[10px] text-red-500 mt-2 font-bold bg-red-50 px-2 py-0.5 rounded">{cameraError}</p>}
              </div>

              <div className="w-full border-t border-slate-200 bg-slate-100/50 p-1.5 flex justify-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); startCamera(); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all" title="Camera">
                  <Camera size={16} />
                </button>
                <div className="w-px bg-slate-300 my-1"></div>
                <button onClick={(e) => { e.stopPropagation(); triggerManualPaste(); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all" title="Dán (Ctrl+V)">
                  <Clipboard size={16} />
                </button>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" accept={accept} onChange={handleFileChange} />
        </div>
      ) : (
        <div className="relative w-full h-full min-h-[140px] rounded-xl overflow-hidden shadow-sm group border border-slate-200 bg-white">
          {file.file.type.startsWith('image/') ? (
            <img src={file.previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-500 p-4">
              <FileText size={32} className="text-slate-400 mb-2" />
              <span className="text-xs font-bold text-center break-all line-clamp-2">{file.file.name}</span>
            </div>
          )}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={handleClear} className="bg-slate-900/50 hover:bg-red-500 backdrop-blur text-white p-1.5 rounded-lg transition-colors shadow-sm">
                <X size={14} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};