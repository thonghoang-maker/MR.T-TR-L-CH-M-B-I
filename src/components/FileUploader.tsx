import React, { useState, useRef, useEffect } from 'react';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onFileSelect({
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        base64: (reader.result as string).split(',')[1],
        mimeType: selectedFile.type,
        fileName: selectedFile.name
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (f) processFile(f);
    event.target.value = '';
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setIsCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch (e) { alert("Không thể mở camera."); }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d')?.drawImage(v, 0, 0);
        c.toBlob(blob => {
            if (blob) {
                processFile(new File([blob], "cam.jpg", { type: "image/jpeg" }));
                stopCamera();
            }
        }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsCameraOpen(false);
  };

  const handlePaste = async () => {
      try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
              const type = item.types.find(t => t.startsWith('image/'));
              if (type) {
                  const blob = await item.getType(type);
                  processFile(new File([blob], "paste.png", { type }));
                  return;
              }
          }
          alert("Không có ảnh trong clipboard.");
      } catch (e) { alert("Trình duyệt không hỗ trợ dán trực tiếp. Hãy dùng Ctrl+V."); }
  };

  // Helper to safely get display name even if file object is lost after reload
  const getDisplayName = () => {
    if (!file) return "";
    return file.fileName || file.file.name || "Unknown File";
  };

  return (
    <div className="w-full h-full flex flex-col">
      {label && <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>}
      <canvas ref={canvasRef} className="hidden" />

      {!file ? (
        <div 
          onClick={() => !isCameraOpen && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
          className={`relative flex-1 rounded-md border-2 border-dashed transition-colors flex flex-col items-center justify-center p-4 cursor-pointer min-h-[120px] ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-teal-400'}`}
        >
           {isCameraOpen ? (
               <div className="absolute inset-0 bg-black z-10 flex flex-col items-center justify-center">
                   <video ref={videoRef} autoPlay className="w-full h-full object-cover opacity-80" />
                   <div className="absolute bottom-2 gap-2 flex">
                       <button onClick={(e) => {e.stopPropagation(); capture();}} className="bg-white text-black px-3 py-1 rounded text-xs font-bold">Chụp</button>
                       <button onClick={(e) => {e.stopPropagation(); stopCamera();}} className="bg-white/20 text-white px-3 py-1 rounded text-xs">Hủy</button>
                   </div>
               </div>
           ) : (
               <>
                   <div className="mb-2 text-teal-600 text-2xl">{icon || <i className="fa-solid fa-cloud-arrow-up"></i>}</div>
                   <div className="text-center">
                       <span className="text-sm font-medium text-gray-600">Chọn file</span>
                       {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
                   </div>
                   <div className="mt-3 flex gap-2">
                       <button onClick={(e) => {e.stopPropagation(); startCamera();}} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:text-teal-600"><i className="fa-solid fa-camera"></i></button>
                       <button onClick={(e) => {e.stopPropagation(); handlePaste();}} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:text-teal-600"><i className="fa-solid fa-paste"></i></button>
                   </div>
               </>
           )}
           <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="relative h-full min-h-[120px] rounded-md border border-gray-200 bg-white p-2 group">
            {(file.mimeType?.startsWith('image/') || file.file.type.startsWith('image/')) ? (
                <img src={file.previewUrl ? file.previewUrl : `data:${file.mimeType};base64,${file.base64}`} className="w-full h-full object-contain" />
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <i className="fa-solid fa-file-lines text-3xl mb-2"></i>
                    <span className="text-xs text-center line-clamp-2">{getDisplayName()}</span>
                </div>
            )}
            <button onClick={(e) => {e.stopPropagation(); onFileSelect(null);}} className="absolute top-1 right-1 bg-gray-800/60 text-white w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>
      )}
    </div>
  );
};