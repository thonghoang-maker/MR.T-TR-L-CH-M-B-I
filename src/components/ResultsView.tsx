import React, { useState, useEffect, useRef } from 'react';
import { GradingResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ResultsViewProps {
  result: GradingResult;
  onReset?: () => void;
  readOnly?: boolean;
}

const MathContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nodeRef.current && window.MathJax) {
      window.MathJax.typesetPromise([nodeRef.current]).catch((err: any) => console.warn(err));
    }
  }, [content]);
  return <div ref={nodeRef} className={`whitespace-pre-wrap break-words ${className || ''}`}>{content}</div>;
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'grading' | 'knowledge'>('grading');
  
  const percentage = result.maxTotalScore > 0 ? Math.round((result.totalScore / result.maxTotalScore) * 100) : 0;
  const data = [
    { name: 'Đạt', value: result.totalScore },
    { name: 'Mất', value: Math.max(0, result.maxTotalScore - result.totalScore) },
  ];
  const COLORS = ['#0d9488', '#e2e8f0']; // Teal-600 & Slate-200

  return (
    <div className="card">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row items-center gap-6">
         <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">Kết Quả Đánh Giá</h2>
            <p className="text-gray-500 text-sm">Tổng hợp chi tiết từ AI</p>
         </div>
         <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-lg border border-gray-200 shadow-sm">
             <div className="w-16 h-16">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} innerRadius={20} outerRadius={30} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
             </div>
             <div>
                <div className="text-3xl font-bold text-teal-700 leading-none">{result.letterGrade}</div>
                <div className="text-sm font-medium text-gray-500">{result.totalScore} / {result.maxTotalScore} điểm</div>
             </div>
         </div>
      </div>

      {result.integrityAnalysis?.plagiarismDetected && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0">
             <h4 className="font-bold text-red-700 text-sm uppercase"><i className="fa-solid fa-triangle-exclamation"></i> Cảnh báo gian lận</h4>
             <p className="text-sm text-red-600 mt-1">Hệ thống phát hiện nội dung bài làm có dấu hiệu sao chép.</p>
          </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6 mt-4">
         <button 
            onClick={() => setActiveTab('grading')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'grading' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
         >
            Chi tiết chấm điểm
         </button>
         <button 
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'knowledge' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
         >
            Kiến thức & Phương pháp
         </button>
      </div>

      <div className="p-6">
        {activeTab === 'grading' && (
            <div className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-gray-700">
                    <strong className="block text-orange-800 mb-2 text-sm uppercase"><i className="fa-solid fa-quote-left"></i> Lời phê:</strong>
                    <MathContent content={result.summary} />
                </div>

                <div className="space-y-4">
                    {result.corrections.map((item, idx) => (
                        <div key={idx} className={`border rounded-lg p-4 ${item.isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-gray-800">{item.questionId}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.pointsAwarded}/{item.maxPoints} đ
                                </span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Bài làm</span>
                                    <div className="bg-white border border-gray-200 p-3 rounded text-gray-800">
                                        <MathContent content={item.studentAnswer || "(Trống)"} />
                                    </div>
                                </div>
                                {!item.isCorrect && (
                                    <div>
                                        <span className="text-xs font-bold text-emerald-600 uppercase block mb-1">Đáp án đúng</span>
                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded text-gray-800">
                                            <MathContent content={item.correctAnswer} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                                <strong className="text-teal-600 text-xs uppercase mr-2">Nhận xét:</strong>
                                <MathContent content={item.explanation} className="inline" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'knowledge' && (
            <div className="space-y-6">
                <div className="card p-5 border-l-4 border-l-sky-500">
                    <h3 className="font-bold text-sky-700 mb-2"><i className="fa-solid fa-book"></i> Kiến thức SGK</h3>
                    <div className="text-gray-700 text-sm"><MathContent content={result.textbookKnowledge || "Không có dữ liệu."} /></div>
                </div>
                <div className="card p-5 border-l-4 border-l-amber-500">
                    <h3 className="font-bold text-amber-700 mb-2"><i className="fa-solid fa-lightbulb"></i> Phương pháp giải</h3>
                    <div className="text-gray-700 text-sm"><MathContent content={result.solutionMethod || "Không có dữ liệu."} /></div>
                </div>
            </div>
        )}

        {result.practiceProblems && result.practiceProblems.length > 0 && !readOnly && (
            <div className="mt-8">
                 <h4 className="font-bold text-gray-800 mb-2">Bài tập rèn luyện (Đề xuất)</h4>
                 <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                    {result.practiceProblems.map((p, i) => (
                        <li key={i} className="bg-gray-50 p-2 rounded border border-gray-200">
                            <MathContent content={p.content} className="inline"/>
                        </li>
                    ))}
                 </ul>
            </div>
        )}

        {!readOnly && onReset && (
            <div className="mt-8 text-center">
                <button onClick={onReset} className="btn btn-secondary">
                    <i className="fa-solid fa-rotate-right"></i> Làm bài khác
                </button>
            </div>
        )}
      </div>
    </div>
  );
};