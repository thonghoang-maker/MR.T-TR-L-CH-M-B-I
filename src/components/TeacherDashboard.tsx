import React, { useState, useEffect } from 'react';
import { ExamConfig, UploadedFile, StudentSubmission, QuestionConfig } from '../types';
import { FileUploader } from './FileUploader';
import { saveExamConfig, getSubmissions, clearSubmissions, exportSubmissionsToExcelXML, saveSubmission } from '../services/storageService';
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
    const hasGeneralKey = !!generalAnswerKey;
    const hasSpecificKey = questions.some(q => q.file !== null);

    if (!examTitle) {
      alert("Vui lòng nhập tên đề thi.");
      return;
    }

    if (!hasGeneralKey && !hasSpecificKey) {
       alert("Vui lòng upload ít nhất 1 file đáp án.");
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
    alert("Cấu hình đã được lưu thành công.");
  };

  const handleExportConfigJSON = () => {
    if (!currentConfig) {
        alert("Chưa có cấu hình để xuất.");
        return;
    }
    const jsonString = JSON.stringify(currentConfig);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `De_Thi_${currentConfig.title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const xmlContent = exportSubmissionsToExcelXML();
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ket_Qua_${examTitle.replace(/\s+/g, '_')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Basic Jaccard Similarity for Plagiarism
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

    // Reset flags
    subs.forEach(s => {
        if(s.result?.integrityAnalysis) {
            s.result.integrityAnalysis.plagiarismDetected = false;
        }
    });

    for (let i = 0; i < subs.length; i++) {
        for (let j = i + 1; j < subs.length; j++) {
            const txt1 = subs[i].result?.studentHandwritingTranscription || "";
            const txt2 = subs[j].result?.studentHandwritingTranscription || "";
            
            if (txt1.length > 20 && txt2.length > 20) {
                const similarity = calculateSimilarity(txt1, txt2);
                if (similarity > 0.85) {
                    foundIssues++;
                    const warningMsg = (otherName: string) => `\n\n[CẢNH BÁO]: Nội dung trùng lặp > 85% với ${otherName}.`;
                    
                    if (!subs[i].result!.integrityAnalysis) subs[i].result!.integrityAnalysis = { isSuspicious: true, suspicionLevel: 'HIGH', reasons: [] };
                    subs[i].result!.integrityAnalysis!.plagiarismDetected = true;
                    if (!subs[i].result!.summary.includes("[CẢNH BÁO]")) subs[i].result!.summary += warningMsg(subs[j].studentName);

                    if (!subs[j].result!.integrityAnalysis) subs[j].result!.integrityAnalysis = { isSuspicious: true, suspicionLevel: 'HIGH', reasons: [] };
                    subs[j].result!.integrityAnalysis!.plagiarismDetected = true;
                    if (!subs[j].result!.summary.includes("[CẢNH BÁO]")) subs[j].result!.summary += warningMsg(subs[i].studentName);
                    
                    saveSubmission(subs[i]);
                    saveSubmission(subs[j]);
                }
            }
        }
    }
    setSubmissions(subs);
    setIsScanningPlagiarism(false);
    alert(foundIssues > 0 ? `Phát hiện ${foundIssues} trường hợp nghi vấn.` : "Không phát hiện nghi vấn.");
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      
      {/* Modal View Detail */}
      {selectedSubmission && selectedSubmission.result && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
               <div>
                 <h3 className="font-bold text-lg text-teal-800">{selectedSubmission.studentName}</h3>
                 <span className="text-sm text-gray-500">{selectedSubmission.studentId}</span>
               </div>
               <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                 <i className="fa-solid fa-xmark text-2xl"></i>
               </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
               <ResultsView result={selectedSubmission.result} readOnly={true} />
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="card sticky top-24">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-700">Menu Quản lý</h3>
            </div>
            <nav className="p-2 space-y-1">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`nav-link w-full ${activeTab === 'config' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-gear w-5 text-center"></i> Cấu hình đề thi
                </button>
                <button
                    onClick={() => setActiveTab('results')}
                    className={`nav-link w-full ${activeTab === 'results' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-list-check w-5 text-center"></i> Kết quả thi
                    {submissions.length > 0 && <span className="ml-auto bg-gray-200 text-gray-700 text-xs py-0.5 px-2 rounded-full">{submissions.length}</span>}
                </button>
            </nav>
            <div className="p-4 border-t border-gray-100 mt-2">
                <button onClick={onSwitchToStudentView} className="btn btn-secondary w-full text-sm">
                    <i className="fa-regular fa-eye"></i> Xem Demo HS
                </button>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="card p-6">
               <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Thiết lập Đề thi</h2>
               
               <div className="mb-4">
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Tên bài kiểm tra</label>
                   <input 
                     type="text" 
                     className="form-control"
                     value={examTitle}
                     onChange={(e) => setExamTitle(e.target.value)}
                     placeholder="Ví dụ: Kiểm tra 15 phút Toán 12"
                   />
               </div>

               <div className="mb-6">
                   <label className="block text-sm font-semibold text-gray-700 mb-2">File Đề & Đáp án (Chung)</label>
                   <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                     <FileUploader
                        label=""
                        subLabel="Kéo thả hoặc chọn file PDF/Ảnh"
                        accept="image/*,application/pdf"
                        file={generalAnswerKey}
                        onFileSelect={setGeneralAnswerKey}
                     />
                   </div>
               </div>

               <div className="mb-6">
                   <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Chi tiết câu hỏi</label>
                        <button onClick={handleAddQuestion} className="text-sm text-teal-600 font-medium hover:text-teal-800">
                            <i className="fa-solid fa-plus-circle"></i> Thêm câu
                        </button>
                   </div>
                   <div className="space-y-3">
                        {questions.map((q) => (
                            <div key={q.id} className="flex gap-4 items-start bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="w-1/4">
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        value={q.label}
                                        onChange={(e) => updateQuestionLabel(q.id, e.target.value)}
                                        placeholder="Nhãn (Câu 1)"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="h-10">
                                        <FileUploader label="" subLabel="Đáp án riêng (nếu có)" file={q.file} onFileSelect={(f) => updateQuestionFile(q.id, f)} />
                                    </div>
                                </div>
                                {questions.length > 1 && (
                                    <button onClick={() => handleRemoveQuestion(q.id)} className="text-gray-400 hover:text-red-500 mt-2">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        ))}
                   </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tài liệu tham khảo</label>
                        <div className="h-24">
                            <FileUploader label="" file={referenceFile} onFileSelect={setReferenceFile} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Lưu ý chấm điểm</label>
                        <textarea 
                            className="form-control h-24 resize-none"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Nhập hướng dẫn thêm cho AI..."
                        />
                    </div>
               </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={handleExportConfigJSON} className="btn btn-secondary">
                    <i className="fa-solid fa-share-nodes"></i> Xuất File Cấu Hình
                </button>
                <button onClick={handleSaveConfig} className="btn btn-primary">
                    <i className="fa-solid fa-floppy-disk"></i> Lưu Cấu Hình
                </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="card overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <h2 className="text-lg font-bold text-gray-800">Bảng Điểm</h2>
                <div className="flex gap-2">
                    <button onClick={handleScanPlagiarism} disabled={isScanningPlagiarism} className="btn btn-secondary text-xs">
                        {isScanningPlagiarism ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-user-secret"></i>} Quét Gian Lận
                    </button>
                    <button onClick={() => { if(confirm("Xóa tất cả?")) { clearSubmissions(); setSubmissions([]); }}} className="btn btn-danger text-xs">
                        <i className="fa-solid fa-trash"></i> Xóa Hết
                    </button>
                    <button onClick={handleExportExcel} className="btn btn-success text-xs">
                        <i className="fa-solid fa-file-excel"></i> Xuất Excel
                    </button>
                </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Học Sinh</th>
                            <th className="px-6 py-4">Thời Gian</th>
                            <th className="px-6 py-4 text-center">Điểm</th>
                            <th className="px-6 py-4">Xếp Loại</th>
                            <th className="px-6 py-4 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {submissions.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">Chưa có bài nộp nào.</td></tr>
                        ) : (
                            submissions.map(sub => {
                                const isCheating = sub.result?.integrityAnalysis?.plagiarismDetected;
                                return (
                                    <tr key={sub.id} className={`hover:bg-gray-50 ${isCheating ? 'bg-red-50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{sub.studentName}</div>
                                            <div className="text-xs text-gray-500">{sub.studentId}</div>
                                            {isCheating && <span className="text-red-600 text-xs font-bold"><i className="fa-solid fa-triangle-exclamation"></i> Gian lận</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(sub.submissionTime).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-teal-700">
                                            {sub.result?.totalScore}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                sub.result?.letterGrade.includes('Giỏi') ? 'bg-emerald-100 text-emerald-700' :
                                                sub.result?.letterGrade.includes('Khá') ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {sub.result?.letterGrade}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setSelectedSubmission(sub)} className="text-teal-600 hover:text-teal-800 font-medium text-xs">
                                                <i className="fa-regular fa-eye"></i> Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};