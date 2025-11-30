import React, { useState, useEffect } from 'react';
import { ExamConfig, UploadedFile, StudentSubmission, QuestionConfig } from '../types';
import { FileUploader } from './FileUploader';
import { saveExamConfig, getSubmissions, clearSubmissions, exportSubmissionsToExcelXML, saveSubmission } from '../services/storageService';
import { Save, FileSpreadsheet, Trash2, BookOpen, ScrollText, Layout, Settings, Plus, X, Eye, ChevronRight, ListChecks, Download, FileCheck2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ResultsView } from './ResultsView';

interface TeacherDashboardProps {
  currentConfig: ExamConfig | null;
  onConfigSave: (config: ExamConfig) => void;
  onSwitchToStudentView: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  currentConfig, 
  onConfigSave,
  onSwitchToStudentView
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  
  const [examTitle, setExamTitle] = useState(currentConfig?.title || '');
  const [generalAnswerKey, setGeneralAnswerKey] = useState<UploadedFile | null>(currentConfig?.generalAnswerKey || null);
  const [questions, setQuestions] = useState<QuestionConfig[]>(
    currentConfig?.questions && currentConfig.questions.length > 0 
      ? currentConfig.questions 
      : [{ id: Date.now().toString(), label: 'Câu 1', file: null }]
  );
  const [referenceFile, setReferenceFile] = useState<UploadedFile | null>(currentConfig?.referenceFile || null);
  const [instructions, setInstructions] = useState(currentConfig?.instructions || '');
  
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isScanningPlagiarism, setIsScanningPlagiarism] = useState(false);

  useEffect(() => {
    if (activeTab === 'results') {
      setSubmissions(getSubmissions());
    }
  }, [activeTab]);

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions([...questions, { 
      id: Date.now().toString(), 
      label: `Câu ${nextNum}`, 
      file: null 
    }]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionLabel = (id: string, newLabel: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, label: newLabel } : q));
  };

  const updateQuestionFile = (id: string, file: UploadedFile | null) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, file: file } : q));
  };

  const handleSaveConfig = () => {
    // Validation: Must have title AND (General Key OR at least one specific Key)
    const hasGeneralKey = !!generalAnswerKey;
    const hasSpecificKey = questions.some(q => q.file !== null);

    if (!examTitle) {
      alert("Vui lòng nhập tên đề thi.");
      return;
    }

    if (!hasGeneralKey && !hasSpecificKey) {
       alert("Vui lòng upload ít nhất 1 file đáp án (Đáp án chung hoặc Đáp án từng câu).");
       return;
    }

    const newConfig: ExamConfig = {
      id: currentConfig?.id || Date.now().toString(),
      title: examTitle,
      generalAnswerKey: generalAnswerKey,
      questions: questions,
      referenceFile: referenceFile,
      instructions: instructions,
      createdRequest: Date.now()
    };
    saveExamConfig(newConfig);
    onConfigSave(newConfig);
    alert("Đã lưu cấu hình thành công!");
  };

  const handleExport = () => {
    const xmlContent = exportSubmissionsToExcelXML();
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ket_qua_${examTitle.replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Basic Jaccard Similarity for Text
  const calculateSimilarity = (str1: string, str2: string) => {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  };

  const handleScanPlagiarism = () => {
    setIsScanningPlagiarism(true);
    const subs = [...submissions];
    let foundIssues = 0;

    // Reset previous scan flags locally first
    subs.forEach(s => {
        if(s.result?.integrityAnalysis) {
            s.result.integrityAnalysis.plagiarismDetected = false;
            s.result.integrityAnalysis.matchedStudentId = undefined;
        }
    });

    for (let i = 0; i < subs.length; i++) {
        for (let j = i + 1; j < subs.length; j++) {
            const txt1 = subs[i].result?.studentHandwritingTranscription || "";
            const txt2 = subs[j].result?.studentHandwritingTranscription || "";
            
            if (txt1.length > 20 && txt2.length > 20) { // Only check significant content
                const similarity = calculateSimilarity(txt1, txt2);
                if (similarity > 0.85) { // Threshold: 85% similar
                    foundIssues++;
                    
                    const warningMsg = (otherStudentName: string) => 
                        `\n\n[CẢNH BÁO HỆ THỐNG]: Phát hiện nội dung bài làm sao chép (trùng lặp > 85%) với học sinh ${otherStudentName}. Yêu cầu giáo viên kiểm tra lại.`;

                    // Flag Student A (i)
                    if (!subs[i].result!.integrityAnalysis) {
                        subs[i].result!.integrityAnalysis = { isSuspicious: true, suspicionLevel: 'HIGH', reasons: [] };
                    }
                    subs[i].result!.integrityAnalysis!.plagiarismDetected = true;
                    subs[i].result!.integrityAnalysis!.matchedStudentId = subs[j].studentName;
                    
                    // Inject warning into summary if not already present
                    if (!subs[i].result!.summary.includes("[CẢNH BÁO HỆ THỐNG]")) {
                        subs[i].result!.summary += warningMsg(subs[j].studentName);
                    }
                    
                    // Flag Student B (j)
                    if (!subs[j].result!.integrityAnalysis) {
                        subs[j].result!.integrityAnalysis = { isSuspicious: true, suspicionLevel: 'HIGH', reasons: [] };
                    }
                    subs[j].result!.integrityAnalysis!.plagiarismDetected = true;
                    subs[j].result!.integrityAnalysis!.matchedStudentId = subs[i].studentName;

                    // Inject warning into summary if not already present
                    if (!subs[j].result!.summary.includes("[CẢNH BÁO HỆ THỐNG]")) {
                        subs[j].result!.summary += warningMsg(subs[i].studentName);
                    }

                    // Update local storage
                    saveSubmission(subs[i]);
                    saveSubmission(subs[j]);
                }
            }
        }
    }
    
    setSubmissions(subs); // Update state to trigger re-render
    setIsScanningPlagiarism(false);
    if (foundIssues > 0) {
        alert(`QUÉT HOÀN TẤT: Phát hiện ${foundIssues} cặp bài có dấu hiệu sao chép. Hệ thống đã tự động thêm cảnh báo vào lời phê.`);
    } else {
        alert("QUÉT HOÀN TẤT: Không phát hiện dấu hiệu sao chép giữa các bài nộp.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden min-h-[800px] flex flex-col md:flex-row relative">
      
      {/* Detail Modal */}
      {selectedSubmission && selectedSubmission.result && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                     {selectedSubmission.studentName.charAt(0)}
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-800 text-lg">{selectedSubmission.studentName}</h3>
                     <p className="text-slate-500 text-xs font-semibold uppercase">{selectedSubmission.studentId}</p>
                  </div>
               </div>
               <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
               >
                 <X size={24} />
               </button>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
               <div className="max-w-4xl mx-auto p-8">
                 <ResultsView result={selectedSubmission.result} readOnly={true} />
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-8 pb-4">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                Quản lý
            </h3>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'config' 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:bg-white hover:text-slate-700'
            }`}
          >
            <Settings size={18} />
            <span>Cấu hình đề thi</span>
            {activeTab === 'config' && <ChevronRight size={14} className="ml-auto" />}
          </button>
          
          <button
            onClick={() => setActiveTab('results')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'results' 
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:bg-white hover:text-slate-700'
            }`}
          >
            <Layout size={18} />
            <span>Kết quả & Báo cáo</span>
            {submissions.length > 0 && (
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'results' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {submissions.length}
                </span>
            )}
          </button>
        </nav>
        
        <div className="p-4 mt-auto border-t border-slate-200">
           <button 
             onClick={onSwitchToStudentView}
             className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm"
           >
             <Eye size={16} /> Xem trang Học sinh
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 md:p-10 overflow-y-auto max-h-[900px] bg-white">
        
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tên bài kiểm tra</label>
               <input 
                 type="text" 
                 value={examTitle}
                 onChange={(e) => setExamTitle(e.target.value)}
                 className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-xl font-bold text-slate-800 transition-all outline-none placeholder-slate-400"
                 placeholder="VD: Kiểm tra 1 tiết Đại số 10"
               />
            </div>

            {/* General Answer Key Section */}
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
               <label className="block text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <FileCheck2 size={18} className="text-indigo-600"/> File Đề & Đáp án chung (Toàn bộ)
               </label>
               <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
                 <FileUploader
                    label=""
                    subLabel="Upload 1 file chứa đáp án tất cả câu hỏi (PDF/Ảnh)"
                    accept="image/*,application/pdf"
                    file={generalAnswerKey}
                    onFileSelect={setGeneralAnswerKey}
                 />
               </div>
               <p className="text-xs text-indigo-600/70 mt-3 font-medium">
                  * Mẹo: Bạn có thể upload 1 file đáp án chung tại đây thay vì upload lẻ từng câu ở dưới. Hệ thống sẽ tự tìm đáp án tương ứng.
               </p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                     <ListChecks size={20} className="text-slate-500"/> Danh sách câu hỏi
                  </h4>
                  <button onClick={handleAddQuestion} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                     <Plus size={14}/> Thêm câu
                  </button>
               </div>
               
               <p className="text-xs text-slate-400 font-medium italic">
                  Hãy định nghĩa các câu hỏi (Ví dụ: Câu 1, Câu 2) để hệ thống biết cấu trúc đề thi.
               </p>

               <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 group hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nhãn câu</label>
                        <input
                          type="text"
                          value={question.label}
                          onChange={(e) => updateQuestionLabel(question.id, e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">File đáp án riêng (Tùy chọn)</label>
                        <div className="bg-white rounded-lg overflow-hidden">
                           <FileUploader
                             label=""
                             subLabel={generalAnswerKey ? "Đã có đáp án chung" : "Tải đáp án cho câu này"}
                             accept="image/*,application/pdf"
                             file={question.file}
                             onFileSelect={(f) => updateQuestionFile(question.id, f)}
                           />
                        </div>
                      </div>
                      {questions.length > 1 && (
                        <button 
                           onClick={() => handleRemoveQuestion(question.id)}
                           className="self-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                           <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-500"/> Tài liệu tham khảo
                   </label>
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                     <FileUploader
                      label=""
                      subLabel="upload file"
                      file={referenceFile}
                      onFileSelect={setReferenceFile}
                    />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                     <ScrollText size={16} className="text-indigo-500"/> Hướng dẫn chấm
                   </label>
                   <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="VD: Chấp nhận làm tròn 2 chữ số..."
                      className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 resize-none font-medium text-slate-600 text-sm outline-none"
                    />
                </div>
            </div>

            <div className="sticky bottom-0 bg-white/90 backdrop-blur pt-4 pb-2 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all hover:-translate-y-0.5"
              >
                <Save size={18} />
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
           <div className="animate-in fade-in duration-300 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Danh sách bài nộp</h2>
                <div className="flex gap-3">
                    <button 
                      onClick={handleScanPlagiarism}
                      disabled={isScanningPlagiarism}
                      className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold text-xs transition-colors border border-indigo-100 flex items-center gap-2"
                   >
                      {isScanningPlagiarism ? <ShieldAlert className="animate-pulse" size={14}/> : <ShieldCheck size={14} />} 
                      {isScanningPlagiarism ? "Đang quét..." : "Quét gian lận"}
                   </button>

                   <button 
                      onClick={() => { if(confirm("Bạn có chắc muốn xóa tất cả bài nộp?")) { clearSubmissions(); setSubmissions([]); }}}
                      className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors border border-red-100 flex items-center gap-2"
                   >
                      <Trash2 size={14} /> Xóa hết
                   </button>
                   <button 
                      onClick={handleExport}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all"
                   >
                      <Download size={16} /> Xuất Excel
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
                 <div className="overflow-x-auto h-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-extrabold tracking-wider sticky top-0 z-10 shadow-sm">
                           <tr>
                              <th className="px-6 py-4 border-b border-slate-200">Học sinh</th>
                              <th className="px-6 py-4 border-b border-slate-200">Ngày nộp</th>
                              <th className="px-6 py-4 border-b border-slate-200 text-center">Điểm số</th>
                              <th className="px-6 py-4 border-b border-slate-200">Đánh giá</th>
                              <th className="px-6 py-4 border-b border-slate-200 text-right"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {submissions.length === 0 ? (
                              <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-sm">Chưa có dữ liệu bài nộp</td></tr>
                           ) : (
                              submissions.map((sub) => {
                                 const isCheating = sub.result?.integrityAnalysis?.isSuspicious || sub.result?.integrityAnalysis?.plagiarismDetected;
                                 return (
                                 <tr key={sub.id} className={`hover:bg-indigo-50/40 transition-colors group ${isCheating ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                       <div className="font-bold text-slate-800 flex items-center gap-2">
                                          {sub.studentName}
                                          {isCheating && <ShieldAlert size={14} className="text-red-500" title="Cảnh báo gian lận" />}
                                       </div>
                                       <div className="text-xs text-slate-400 mt-0.5">{sub.studentId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                       {new Date(sub.submissionTime).toLocaleDateString('vi-VN')}
                                       <span className="text-slate-400 ml-2 text-xs">{new Date(sub.submissionTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <span className={`inline-block px-3 py-1 font-bold rounded-lg border ${
                                            isCheating 
                                            ? 'bg-red-100 text-red-700 border-red-200' 
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                       }`}>
                                          {sub.result?.totalScore}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                            sub.result?.letterGrade?.includes('Giỏi') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            sub.result?.letterGrade?.includes('Khá') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>
                                            {sub.result?.letterGrade}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <button 
                                          onClick={() => setSelectedSubmission(sub)}
                                          className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all font-bold text-xs inline-flex items-center gap-1"
                                       >
                                          <Eye size={14} /> Xem
                                       </button>
                                    </td>
                                 </tr>
                              )})
                           )}
                        </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};