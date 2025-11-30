import React, { useState } from 'react';
import { UploadedFile, StudentSubmission, ExamConfig, GradingResult } from '../types';
import { FileUploader } from './FileUploader';
import { gradeStudentWork, gradePracticeWork } from '../services/geminiService';
import { saveSubmission } from '../services/storageService';
import { ResultsView } from './ResultsView';

interface StudentViewProps {
  examConfig: ExamConfig;
}

export const StudentView: React.FC<StudentViewProps> = ({ examConfig }) => {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [practiceFiles, setPracticeFiles] = useState<UploadedFile[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddFile = (file: UploadedFile | null, isPractice = false) => {
    if (file) {
      const newFile = { ...file, id: Date.now().toString() };
      isPractice ? setPracticeFiles(prev => [...prev, newFile]) : setFiles(prev => [...prev, newFile]);
    }
  };

  const removeFile = (id: string, isPractice = false) => {
    isPractice ? setPracticeFiles(prev => prev.filter(f => f.id !== id)) : setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!studentName || !studentId || files.length === 0) {
      setErrorMsg("Vui lòng điền tên, mã HS và tải lên bài làm.");
      return;
    }
    if (!examConfig.questions || examConfig.questions.length === 0) {
        setErrorMsg("Đề thi chưa có đáp án.");
        return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await gradeStudentWork(
        examConfig.questions,
        files,
        examConfig.referenceFile,
        examConfig.instructions,
        studentId,
        examConfig.generalAnswerKey
      );
      const submission: StudentSubmission = {
        id: Date.now().toString(),
        studentName,
        studentId,
        submissionTime: Date.now(),
        files,
        result,
        status: 'GRADED'
      };
      saveSubmission(submission);
      setGradingResult(result);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error(error);
      setErrorMsg("Lỗi xử lý. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPractice = async () => {
    if (practiceFiles.length === 0) return setErrorMsg("Chưa có bài làm rèn luyện.");
    if (!gradingResult?.practiceProblems) return;

    setIsSubmitting(true);
    try {
        const practiceResult = await gradePracticeWork(
            gradingResult.practiceProblems,
            practiceFiles,
            studentId
        );
        setGradingResult(practiceResult);
        setPracticeFiles([]);
        window.scrollTo(0, 0);
    } catch (err) {
        setErrorMsg("Lỗi chấm bài rèn luyện.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (gradingResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <ResultsView 
            result={gradingResult} 
            onReset={() => {
                setGradingResult(null);
                setFiles([]);
                setPracticeFiles([]);
                setStudentName('');
                setStudentId('');
            }}
        />

        {gradingResult.practiceProblems && gradingResult.practiceProblems.length > 0 && (
            <div className="card p-6 border-teal-200 bg-teal-50">
                <h3 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-pen-nib"></i> Góc Rèn Luyện
                </h3>
                <div className="bg-white p-4 rounded border border-teal-100 mb-4">
                    {practiceFiles.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {practiceFiles.map((file) => (
                                <div key={file.id} className="relative aspect-[3/4] border rounded overflow-hidden">
                                    <img src={file.previewUrl} className="w-full h-full object-cover" />
                                    <button onClick={() => removeFile(file.id!, true)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <FileUploader label="" subLabel="Tải lên bài làm 3 câu rèn luyện" file={null} onFileSelect={(f) => handleAddFile(f, true)} />
                    )}
                </div>
                <button onClick={handleSubmitPractice} disabled={isSubmitting} className="btn btn-primary w-full">
                    {isSubmitting ? 'Đang chấm...' : 'Nộp bài rèn luyện'}
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
         <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-teal-800">{examConfig.title}</h1>
            <p className="text-gray-500 mt-1">Điền thông tin và nộp bài làm của bạn</p>
         </div>

         <div className="space-y-6">
            {/* Student Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên</label>
                   <input 
                     type="text" 
                     className="form-control"
                     value={studentName}
                     onChange={(e) => setStudentName(e.target.value)}
                     placeholder="Nguyễn Văn A"
                   />
                </div>
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Mã HS / Lớp</label>
                   <input 
                     type="text" 
                     className="form-control"
                     value={studentId}
                     onChange={(e) => setStudentId(e.target.value)}
                     placeholder="VD: 12A1"
                   />
                </div>
            </div>

            {/* Upload Area */}
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh chụp bài làm</label>
               <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {files.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {files.map((file, idx) => (
                             <div key={file.id} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                <img src={file.previewUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <button onClick={() => removeFile(file.id!)} className="text-white hover:text-red-400">
                                      <i className="fa-solid fa-trash text-xl"></i>
                                   </button>
                                </div>
                                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded">Trang {idx+1}</span>
                             </div>
                          ))}
                          <div className="aspect-[3/4] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer">
                             <FileUploader label="" icon={<i className="fa-solid fa-plus text-gray-400"></i>} file={null} onFileSelect={handleAddFile} />
                          </div>
                      </div>
                  ) : (
                      <FileUploader label="" subLabel="Chụp ảnh hoặc tải file lên" file={null} onFileSelect={handleAddFile} />
                  )}
               </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded text-sm font-medium flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
                </div>
            )}

            <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="btn btn-primary w-full py-3 text-lg shadow-md"
            >
                {isSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Đang chấm bài...</>
                ) : (
                    <><i className="fa-solid fa-paper-plane"></i> Nộp Bài</>
                )}
            </button>
         </div>
      </div>
      
      <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-100 text-sm text-teal-800">
         <strong className="block mb-1"><i className="fa-solid fa-circle-info"></i> Hướng dẫn:</strong>
         {examConfig.instructions || "Làm bài ra giấy, chụp ảnh rõ nét và tải lên theo thứ tự trang."}
      </div>
    </div>
  );
};