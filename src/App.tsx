import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Top Navigation Bar */}
      <nav className="bg-teal-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('TEACHER')}>
              <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center backdrop-blur-sm">
                 <i className="fa-solid fa-graduation-cap text-lg"></i>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">AutoGrade AI</span>
                <span className="text-xs block text-teal-200 font-medium">Hệ thống chấm thi thông minh</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
               <button 
                 onClick={() => setViewMode('STUDENT')}
                 className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                   viewMode === 'STUDENT' 
                   ? 'bg-white text-teal-800 shadow-sm' 
                   : 'text-teal-100 hover:bg-teal-600 hover:text-white'
                 }`}
               >
                 <i className="fa-solid fa-user-pen mr-2"></i>
                 Học Sinh
               </button>
               <button 
                  onClick={() => setViewMode('TEACHER')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                     viewMode === 'TEACHER' 
                     ? 'bg-white text-teal-800 shadow-sm' 
                     : 'text-teal-100 hover:bg-teal-600 hover:text-white'
                  }`}
               >
                  <i className="fa-solid fa-chalkboard-user mr-2"></i>
                  Giáo Viên
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
             <div className="card max-w-lg mx-auto mt-20 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <i className="fa-solid fa-folder-open text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa có đề thi</h2>
                <p className="text-gray-500 mb-6 text-sm">
                    Giáo viên chưa cài đặt đề thi. Vui lòng tải lên file cấu hình nếu bạn có.
                </p>
                
                <div className="mb-6 bg-gray-50 p-4 rounded border border-dashed border-gray-300">
                     <FileUploader 
                        label=""
                        subLabel="Tải lên file .json"
                        accept=".json"
                        file={null}
                        onFileSelect={handleImportConfig}
                        icon={<i className="fa-solid fa-file-import text-xl"></i>}
                     />
                </div>

                <button 
                  onClick={() => setViewMode('TEACHER')}
                  className="text-teal-600 hover:text-teal-800 text-sm font-medium underline"
                >
                  Đăng nhập quyền Giáo viên
                </button>
             </div>
          )
        )}
      </main>
      
      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2025 AutoGrade AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;