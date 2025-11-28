import React, { useState } from 'react';
import { UploadedFile, StudentSubmission, ExamConfig, GradingResult } from '../types';
import { FileUploader } from './FileUploader';
import { Send, Plus, Trash2, Loader2, FileCheck, Sparkles, User, GraduationCap, Paperclip, ArrowLeft } from 'lucide-react';
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
  
  // Practice Mode State
  const [practiceFiles, setPracticeFiles] = useState<UploadedFile[]>([]);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddFile = (file: UploadedFile | null, isPractice = false) => {
    if (file) {
      const newFile = { ...file, id: Date.now().toString() };
      if (isPractice) {
        setPracticeFiles(prev => [...prev, newFile]);
      } else {
        setFiles(prev => [...prev, newFile]);
      }
    }
  };

  const removeFile = (id: string, isPractice = false) => {
    if (isPractice) {
        setPracticeFiles(prev => prev.filter(f => f.id !== id));
    } else {
        setFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleSubmit = async () => {
    if (!studentName || !studentId || files.length === 0) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin và tải lên ít nhất 1 trang bài làm.");
      return;
    }

    if (!examConfig.questions || examConfig.questions.length === 0) {
        setErrorMsg("Hệ thống chưa có đáp án.");
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

      // Save Initial Submission
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
      // Scroll to top
      window.scrollTo(0, 0);

    } catch (error) {
      console.error(error);
      setErrorMsg("Có lỗi xảy ra trong quá trình chấm. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPractice = async () => {
    if (practiceFiles.length === 0) {
        setErrorMsg("Vui lòng tải lên bài làm cho phần rèn luyện.");
        return;
    }
    if (!gradingResult?.practiceProblems) return;

    setIsSubmitting(true);
    try {
        const practiceResult = await gradePracticeWork(
            gradingResult.practiceProblems,
            practiceFiles,
            studentId
        );
        
        // Update the displayed result with the practice result
        // We might want to keep the original questions but show new scores, 
        // OR just replace the view with the practice assessment.
        // For simplicity: Replace view with practice assessment Result.
        setGradingResult(practiceResult);
        setIsPracticeMode(false); // Reset mode
        setPracticeFiles([]); // Clear files
        window.scrollTo(0, 0);
    } catch (err) {
        setErrorMsg("Lỗi chấm bài rèn luyện. Thử lại.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Render Result View immediately after grading
  if (gradingResult) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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

        {/* Practice Submission Area */}
        {gradingResult.practiceProblems && gradingResult.practiceProblems.length > 0 && (
            <div className="mt-8 bg-white rounded-3xl p-8 shadow-xl shadow-indigo-100/50 border border-indigo-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Sparkles className="text-indigo-500" /> Nộp bài Rèn luyện
                </h3>
                
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
                    {practiceFiles.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                            {practiceFiles.map((file, idx) => (
                                <div key={file.id} className="relative group aspect-[3/4] rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                                <img src={file.previewUrl} alt={`Page ${idx}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => removeFile(file.id!, true)}
                                        className="p-2 bg-white text-red-500 rounded-full hover:scale-110 transition-transform shadow-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                </div>
                            ))}
                            <div className="flex items-center justify-center aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-indigo-400 hover:text-indigo-600 text-slate-400 transition-all cursor-pointer">
                                <FileUploader 
                                label=""
                                file={null}
                                onFileSelect={(f) => handleAddFile(f, true)}
                                icon={<Plus size={24}/>}
                                />
                            </div>
                        </div>
                    ) : (
                        <FileUploader 
                            label="" 
                            subLabel="Tải lên bài làm cho 3 câu hỏi rèn luyện ở trên"
                            file={null} 
                            onFileSelect={(f) => handleAddFile(f, true)}
                        />
                    )}
                </div>

                <button
                    onClick={handleSubmitPractice}
                    disabled={isSubmitting}
                    className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    Chấm bài Rèn luyện
                </button>
            </div>
        )}
      </div>
    );
  }

  // Initial Exam Form
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Exam Info */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-3xl p-8 shadow-lg shadow-indigo-100/50 border border-white sticky top-24">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                 <FileCheck size={24} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-2">{examConfig.title}</h1>
              <p className="text-slate-500 text-sm font-medium mb-6">Môn Toán • Tự luận</p>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600 leading-relaxed">
                 <strong className="block text-indigo-900 mb-2 flex items-center gap-2">
                   <Sparkles size={14} /> Hướng dẫn làm bài
                 </strong>
                 {examConfig.instructions || "Học sinh làm bài ra giấy, trình bày rõ ràng từng bước. Sau đó chụp ảnh và tải lên hệ thống."}
              </div>
           </div>
        </div>

        {/* Right Column: Submission Form */}
        <div className="lg:col-span-8">
           <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
              
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="p-8 md:p-10 space-y-10">
                {/* Step 1 */}
                <section className="relative">
                   <div className="absolute -left-[53px] top-0 h-full w-0.5 bg-slate-100 hidden md:block"></div>
                   <div className="flex items-start gap-4">
                      <div className="hidden md:flex w-8 h-8 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-sm shadow-md shrink-0 relative z-10">1</div>
                      <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="md:hidden w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                            Thông tin thí sinh
                         </h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase ml-1">Họ và Tên</label>
                               <div className="relative">
                                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="text" 
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="Nguyễn Văn A"
                                  />
                               </div>
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase ml-1">Lớp / Mã HS</label>
                               <div className="relative">
                                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="text" 
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="VD: 12A1"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

                {/* Step 2 */}
                <section className="relative">
                   <div className="flex items-start gap-4">
                      <div className="hidden md:flex w-8 h-8 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-sm shadow-md shrink-0 relative z-10">2</div>
                      <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="md:hidden w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                            Bài làm (Ảnh chụp)
                         </h3>
                         
                         <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
                            {files.length > 0 ? (
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                  {files.map((file, idx) => (
                                     <div key={file.id} className="relative group aspect-[3/4] rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                                        <img src={file.previewUrl} alt={`Page ${idx}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                           <button 
                                              onClick={() => removeFile(file.id!)}
                                              className="p-2 bg-white text-red-500 rounded-full hover:scale-110 transition-transform shadow-lg"
                                           >
                                              <Trash2 size={18} />
                                           </button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                                           Trang {idx + 1}
                                        </div>
                                     </div>
                                  ))}
                                  <div className="flex items-center justify-center aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-indigo-400 hover:text-indigo-600 text-slate-400 transition-all cursor-pointer">
                                     <FileUploader 
                                        label=""
                                        file={null}
                                        onFileSelect={handleAddFile}
                                        icon={<Plus size={24}/>}
                                     />
                                  </div>
                               </div>
                            ) : (
                               <div className="py-8">
                                  <FileUploader 
                                     label="" 
                                     subLabel="Nhấn để chụp hoặc tải ảnh lên"
                                     file={null} 
                                     onFileSelect={handleAddFile}
                                  />
                               </div>
                            )}
                         </div>
                         <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-indigo-50 px-3 py-2 rounded-lg w-fit">
                            <Paperclip size={14} className="text-indigo-500" />
                            <span>Hỗ trợ: JPG, PNG. Chụp rõ nét để có kết quả tốt nhất.</span>
                         </div>
                      </div>
                   </div>
                </section>
                
                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold animate-pulse">
                     <span className="bg-red-100 p-1 rounded-full">⚠️</span> {errorMsg}
                  </div>
                )}

                <div className="pt-2 pl-0 md:pl-12">
                   <button
                     onClick={handleSubmit}
                     disabled={isSubmitting}
                     className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all ${
                        isSubmitting 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5'
                     }`}
                   >
                     {isSubmitting ? (
                       <>
                         <Loader2 className="animate-spin" />
                         <span>Đang xử lý...</span>
                       </>
                     ) : (
                       <>
                         <Send size={20} />
                         Nộp bài chấm điểm
                       </>
                     )}
                   </button>
                </div>

              </div>
           </div>
        </div>
      </div>
    </div>
  );
};