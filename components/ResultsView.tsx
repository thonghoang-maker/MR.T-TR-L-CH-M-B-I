import React, { useState, useEffect, useRef } from 'react';
import { GradingResult, PracticeProblem } from '../types';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, RefreshCw, FileText, User, MessageSquareQuote, BrainCircuit, ShieldAlert, BookOpen, Lightbulb, Pencil, FileCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ResultsViewProps {
  result: GradingResult;
  onReset?: () => void;
  readOnly?: boolean;
  onPracticeSubmit?: (files: any[]) => void; // Callback for practice submission
}

const MathContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nodeRef.current && window.MathJax) {
      window.MathJax.typesetPromise([nodeRef.current]).catch((err: any) => console.warn(err));
    }
  }, [content]);
  return <div ref={nodeRef} className={`whitespace-pre-wrap break-words leading-relaxed ${className || ''}`}>{content}</div>;
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset, readOnly = false, onPracticeSubmit }) => {
  const [showTranscription, setShowTranscription] = useState(false);
  const [activeTab, setActiveTab] = useState<'grading' | 'knowledge'>('grading');
  
  const percentage = result.maxTotalScore > 0 ? Math.round((result.totalScore / result.maxTotalScore) * 100) : 0;
  const data = [
    { name: 'Điểm Đạt', value: result.totalScore },
    { name: 'Điểm Mất', value: Math.max(0, result.maxTotalScore - result.totalScore) },
  ];
  const COLORS = ['#4F46E5', '#E2E8F0'];

  const isSuspicious = result.integrityAnalysis?.isSuspicious || result.integrityAnalysis?.plagiarismDetected;
  const suspicionLevel = result.integrityAnalysis?.suspicionLevel || (result.integrityAnalysis?.plagiarismDetected ? 'HIGH' : 'NONE');
  const hasPractice = result.practiceProblems && result.practiceProblems.length > 0 && !readOnly;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500 border border-slate-100">
      
      {/* Report Header */}
      <div className="bg-slate-50 p-8 border-b border-slate-100">
         <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex-1 space-y-4">
               <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded-full border border-indigo-100">
                  <BrainCircuit size={14} /> AI Grading Report
               </div>
               <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kết Quả Đánh Giá</h2>
                  <p className="text-slate-500 font-medium text-sm">Tổng hợp chi tiết và nhận xét</p>
               </div>
            </div>

            <div className="flex items-center gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
               <div className="h-20 w-20 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        innerRadius={25}
                        outerRadius={35}
                        paddingAngle={0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        cornerRadius={4}
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-700">{percentage}%</span>
                  </div>
               </div>
               <div>
                  <div className="text-4xl font-black text-slate-800 leading-none">
                     {result.letterGrade}
                  </div>
                  <div className="text-slate-500 font-bold text-sm mt-1">
                     {result.totalScore} <span className="text-slate-400 font-normal">/ {result.maxTotalScore} điểm</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Integrity Warning */}
         {isSuspicious && (
            <div className={`mt-6 rounded-xl border-l-4 p-4 shadow-sm animate-pulse ${
                suspicionLevel === 'HIGH' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-orange-50 border-orange-400 text-orange-800'
            }`}>
                <div className="flex items-start gap-3">
                    <ShieldAlert size={24} className={suspicionLevel === 'HIGH' ? 'text-red-500' : 'text-orange-500'} />
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wide mb-1">Cảnh báo: Phát hiện dấu hiệu bất thường</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 opacity-90">
                            {result.integrityAnalysis?.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
         )}
         
         {/* Navigation Tabs */}
         <div className="flex gap-2 mt-8 border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('grading')}
                className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-all border-b-2 ${activeTab === 'grading' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Chi tiết chấm điểm
            </button>
            <button 
                onClick={() => setActiveTab('knowledge')}
                className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-all border-b-2 ${activeTab === 'knowledge' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Kiến thức & Phương pháp
            </button>
         </div>
      </div>

      <div className="p-8 space-y-8 bg-white min-h-[400px]">
        
        {/* TAB 1: Grading Details */}
        {activeTab === 'grading' && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                {/* Teacher Summary */}
                <div className="relative">
                    <div className="absolute -top-3 left-4 bg-amber-100 text-amber-700 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-amber-200">
                    Lời phê của giáo viên
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-amber-100 shadow-sm text-slate-700 text-base leading-relaxed">
                    <MessageSquareQuote size={24} className="text-amber-200 absolute top-6 right-6" />
                    <MathContent content={result.summary} />
                    </div>
                </div>

                {/* Detailed Corrections */}
                <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                    Chi tiết từng câu
                </h3>
                
                <div className="space-y-6">
                    {result.corrections.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`rounded-2xl p-6 border transition-all ${
                        item.isCorrect 
                            ? 'border-emerald-100 bg-emerald-50/30' 
                            : 'border-rose-100 bg-rose-50/30'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-dashed border-slate-200/50">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-700 text-lg">
                            {item.questionId}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-md font-bold ${
                                item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                                {item.pointsAwarded}/{item.maxPoints} đ
                            </span>
                        </div>
                        {item.isCorrect 
                            ? <CheckCircle2 size={20} className="text-emerald-500"/> 
                            : <XCircle size={20} className="text-rose-500"/>
                        }
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <User size={12}/> Bài làm
                            </p>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 text-sm">
                                <MathContent content={item.studentAnswer || "(Trống)"} />
                            </div>
                        </div>
                        
                        {!item.isCorrect && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={12}/> Đáp án chuẩn
                                </p>
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-slate-800 text-sm">
                                <MathContent content={item.correctAnswer} />
                                </div>
                            </div>
                        )}
                        </div>
        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Nhận xét chi tiết</p>
                            <div className="text-sm text-slate-600 leading-relaxed">
                            <MathContent content={item.explanation} />
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
                </div>

                {/* Transcription Toggle */}
                <button 
                onClick={() => setShowTranscription(!showTranscription)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                >
                <div className="flex items-center gap-3 font-bold text-slate-600 group-hover:text-indigo-700">
                    <FileText size={18} />
                    <span>Xem văn bản nhận dạng (OCR)</span>
                </div>
                {showTranscription ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {showTranscription && (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-sm font-mono text-slate-600 overflow-x-auto">
                    <MathContent content={result.studentHandwritingTranscription} />
                </div>
                )}
            </div>
        )}

        {/* TAB 2: Knowledge & Method */}
        {activeTab === 'knowledge' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-sky-50 rounded-2xl p-6 border border-sky-100">
                    <h3 className="text-lg font-bold text-sky-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-sky-600"/> Kiến thức Sách Giáo Khoa (GDPT 2018)
                    </h3>
                    <div className="bg-white p-5 rounded-xl border border-sky-100 text-slate-700 leading-relaxed">
                        <MathContent content={result.textbookKnowledge || "Không có thông tin lý thuyết cụ thể."} />
                    </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                    <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                        <Lightbulb size={20} className="text-amber-600"/> Phương pháp giải
                    </h3>
                    <div className="bg-white p-5 rounded-xl border border-amber-100 text-slate-700 leading-relaxed">
                        <MathContent content={result.solutionMethod || "Không có thông tin phương pháp cụ thể."} />
                    </div>
                </div>
            </div>
        )}

        {/* Practice Problems Section (Always visible at bottom if present) */}
        {hasPractice && !readOnly && (
            <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Pencil size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Góc Rèn Luyện</h3>
                        <p className="text-slate-500 text-sm">Cơ hội gỡ điểm: Làm 3 bài tập tương tự dưới đây.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6">
                    {result.practiceProblems!.map((prob, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                            <span className="text-xs font-bold text-indigo-500 uppercase mb-2 block">Bài tập {idx + 1}</span>
                            <MathContent content={prob.content} className="font-semibold text-slate-700"/>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Action Buttons */}
        {!readOnly && onReset && (
          <div className="pt-8 flex justify-center pb-8">
            <button 
              onClick={onReset}
              className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            >
              <RefreshCw size={18} />
              {hasPractice ? "Kết thúc & Làm đề khác" : "Làm bài kiểm tra khác"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};