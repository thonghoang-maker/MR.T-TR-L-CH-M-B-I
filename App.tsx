import React, { useState, useEffect } from 'react';
import { BrainCircuit, GraduationCap, School, Upload } from 'lucide-react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentView } from './components/StudentView';
import { ExamConfig, UploadedFile } from './types';
import { getExamConfig, saveExamConfig } from './services/storageService';
import { FileUploader } from './components/FileUploader';

type ViewMode = 'TEACHER' | 'STUDENT';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('STUDENT');
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);

  useEffect(() => {
    const savedConfig = getExamConfig();
    if (savedConfig) {
      setExamConfig(savedConfig);
    }
  }, []);

  const handleImportConfig = (file: UploadedFile | null) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            // Basic validation
            if (json.id && json.title && Array.isArray(json.questions)) {
                saveExamConfig(json);
                setExamConfig(json);
                alert(`Đã nạp đề thi: ${json.title}`);
            } else {
                alert("File không hợp lệ.");
            }
        } catch (err) {
            alert("Lỗi đọc file cấu hình.");
        }
    };
    reader.readAsText(file.file);
  };

  return (
    <div className="min-h-screen font-sans pb-12 text-slate-700 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* Gentle Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-60">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-pink-100 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Education Header */}
      <div className="sticky top-6 z-50 flex justify-center px-4 mb-8">
        <nav className="glass rounded-2xl pl-4 pr-2 py-2 flex items-center justify-between w-full max-w-4xl shadow-lg shadow-indigo-100/50">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewMode('TEACHER')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-200 transition-transform group-hover:scale-105">
              <School size={22} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">
                AutoGrade<span className="text-indigo-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Chấm thi tự động</span>
            </div>
          </div>
          
          <div className="bg-slate-100/80 p-1 rounded-xl flex border border-slate-200/50">
             <button 
               onClick={() => setViewMode('STUDENT')}
               className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                 viewMode === 'STUDENT' 
                 ? 'bg-white text-indigo-700 shadow-sm' 
                 : 'text-slate-500 hover:text-slate-700'
               }`}
             >
               Học Sinh
             </button>
             <button 
                onClick={() => setViewMode('TEACHER')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                   viewMode === 'TEACHER' 
                   ? 'bg-white text-indigo-700 shadow-sm' 
                   : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                Giáo Viên
             </button>
          </div>
        </nav>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {viewMode === 'TEACHER' ? (
          <TeacherDashboard 
            currentConfig={examConfig}
            onConfigSave={(newConfig) => setExamConfig(newConfig)}
            onSwitchToStudentView={() => setViewMode('STUDENT')}
          />
        ) : (
          examConfig ? (
             <StudentView examConfig={examConfig} />
          ) : (
             <div className="glass rounded-3xl p-16 text-center mt-20 max-w-2xl mx-auto shadow-xl border border-white">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-indigo-500">
                  <GraduationCap />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có đề thi</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    Giáo viên chưa cài đặt đề thi trên máy này. Nếu bạn nhận được <strong>File Đề Thi</strong> từ giáo viên, hãy tải lên bên dưới.
                </p>
                
                <div className="max-w-xs mx-auto mb-8 bg-white p-2 rounded-xl border border-dashed border-slate-300">
                     <FileUploader 
                        label=""
                        subLabel="Tải lên file đề thi (.json)"
                        accept=".json"
                        file={null}
                        onFileSelect={handleImportConfig}
                        icon={<Upload size={20} />}
                     />
                </div>

                <div className="flex justify-center gap-4 text-sm font-semibold">
                    <button 
                    onClick={() => setViewMode('TEACHER')}
                    className="text-indigo-600 hover:text-indigo-800"
                    >
                    Đăng nhập Giáo viên
                    </button>
                </div>
             </div>
          )
        )}
      </main>
      
      <footer className="text-center text-slate-400 text-xs py-8 mt-12 font-medium">
        <p>© 2025 AutoGrade AI. Nền tảng Giáo dục Thông minh.</p>
      </footer>
    </div>
  );
}

export default App;