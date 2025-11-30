import { GoogleGenAI, Type } from "@google/genai";
import { GradingResult, UploadedFile, QuestionConfig, PracticeProblem } from "../types";

// Fix TypeScript error: Cannot find name 'process'
declare const process: {
  env: {
    API_KEY: string;
  }
};

const MODEL_ID = "gemini-3-pro-preview";

// Helper to get initialized AI client safely
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Chưa cấu hình API Key. Vui lòng thêm API_KEY vào Environment Variables trên Vercel.");
    }
    return new GoogleGenAI({ apiKey: apiKey });
};

export const gradeStudentWork = async (
  questions: QuestionConfig[], 
  studentWorkFiles: UploadedFile[], 
  referenceFile?: UploadedFile | null,
  gradingInstructions?: string,
  studentClassInfo?: string,
  generalAnswerKey?: UploadedFile | null
): Promise<GradingResult> => {
  try {
    const ai = getAiClient(); // Lazy init here

    let promptText = `
      Bạn là một GIÁO VIÊN TOÁN CAO CẤP với 20 năm kinh nghiệm.
      
      THÔNG TIN:
      - Lớp/Mã HS: "${studentClassInfo || "Không xác định"}"
      
      NHIỆM VỤ CHÍNH:
      1. Chấm điểm chi tiết bài làm học sinh dựa trên đáp án.
      2. Phát hiện gian lận (net chữ, công nghệ, copy).
      3. **CUNG CẤP KIẾN THỨC**: Trích dẫn lý thuyết SGK (Chương trình GDPT 2018) liên quan đến bài toán này.
      4. **PHƯƠNG PHÁP GIẢI**: Tóm tắt phương pháp giải dạng toán này từng bước.
      5. **RÈN LUYỆN**: Nếu điểm < điểm tối đa, hãy SINH RA 3 BÀI TẬP TƯƠNG TỰ (cùng dạng, thay số) để học sinh làm lại.

      YÊU CẦU ĐẦU RA (JSON):
      - 'textbookKnowledge': Tóm tắt lý thuyết trọng tâm SGK liên quan.
      - 'solutionMethod': Các bước giải chuẩn (General steps).
      - 'practiceProblems': Mảng gồm 3 câu hỏi (LaTeX) nếu học sinh làm sai.
      - 'integrityAnalysis': Phân tích gian lận.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        totalScore: { type: Type.NUMBER },
        maxTotalScore: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        letterGrade: { type: Type.STRING },
        studentHandwritingTranscription: { type: Type.STRING },
        textbookKnowledge: { type: Type.STRING, description: "Kiến thức cơ bản trong SGK liên quan." },
        solutionMethod: { type: Type.STRING, description: "Phương pháp giải dạng toán này." },
        practiceProblems: {
            type: Type.ARRAY,
            description: "3 bài tập tương tự để rèn luyện (Nếu điểm thấp).",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    content: { type: Type.STRING, description: "Nội dung câu hỏi (LaTeX)" }
                }
            }
        },
        integrityAnalysis: {
            type: Type.OBJECT,
            properties: {
                isSuspicious: { type: Type.BOOLEAN },
                suspicionLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "NONE"] },
                reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["isSuspicious", "suspicionLevel", "reasons"]
        },
        corrections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionId: { type: Type.STRING },
              studentAnswer: { type: Type.STRING },
              correctAnswer: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
              pointsAwarded: { type: Type.NUMBER },
              maxPoints: { type: Type.NUMBER },
            },
            required: ["questionId", "studentAnswer", "correctAnswer", "isCorrect", "explanation", "pointsAwarded", "maxPoints"],
          },
        },
      },
      required: ["totalScore", "maxTotalScore", "summary", "letterGrade", "corrections", "studentHandwritingTranscription", "integrityAnalysis"],
    };

    const parts: any[] = [{ text: promptText }];

    if (generalAnswerKey) {
        parts.push({ text: `\n--- ĐÁP ÁN CHUNG ---` });
        parts.push({ inlineData: { mimeType: generalAnswerKey.file.type || "application/pdf", data: generalAnswerKey.base64 } });
    }

    questions.forEach((q) => {
      if (q.file) {
        parts.push({ text: `\n--- ĐÁP ÁN CÂU ${q.label} ---` });
        parts.push({ inlineData: { mimeType: q.file.file.type || "application/pdf", data: q.file.base64 } });
      }
    });

    if (referenceFile) {
        parts.push({ text: `\n--- TÀI LIỆU THAM KHẢO ---` });
        parts.push({ inlineData: { mimeType: referenceFile.file.type || "application/pdf", data: referenceFile.base64 } });
    }

    parts.push({ text: `\n--- BÀI LÀM HỌC SINH ---` });
    studentWorkFiles.forEach((file) => {
      parts.push({ inlineData: { mimeType: file.file.type || "image/jpeg", data: file.base64 } });
    });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: { parts: parts },
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as GradingResult;

  } catch (error) {
    console.error("Grading failed:", error);
    throw error;
  }
};

/**
 * Grades the remedial practice problems generated by the previous step.
 */
export const gradePracticeWork = async (
    practiceProblems: PracticeProblem[],
    studentWorkFiles: UploadedFile[],
    studentClassInfo?: string
): Promise<GradingResult> => {
    try {
        const ai = getAiClient(); // Lazy init here

        let promptText = `
        Bạn đang chấm BÀI TẬP RÈN LUYỆN (Remedial Work) cho học sinh lớp: "${studentClassInfo || "N/A"}".
        
        ĐỀ BÀI (Đã giao cho học sinh):
        ${practiceProblems.map(p => `Bài ${p.id}: ${p.content}`).join('\n')}
        
        NHIỆM VỤ:
        1. Tự giải các bài toán trên để có đáp án chuẩn.
        2. Chấm bài làm học sinh gửi lên.
        3. Nhận xét xem học sinh đã hiểu bài chưa.
        
        YÊU CẦU ĐẦU RA (JSON): Giống hệt format chấm bài thi chính thức.
        `;
        
        const schema = {
        type: Type.OBJECT,
        properties: {
            totalScore: { type: Type.NUMBER },
            maxTotalScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            letterGrade: { type: Type.STRING },
            studentHandwritingTranscription: { type: Type.STRING },
            textbookKnowledge: { type: Type.STRING },
            solutionMethod: { type: Type.STRING },
            integrityAnalysis: {
                type: Type.OBJECT,
                properties: {
                    isSuspicious: { type: Type.BOOLEAN },
                    suspicionLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "NONE"] },
                    reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["isSuspicious", "suspicionLevel", "reasons"]
            },
            corrections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                questionId: { type: Type.STRING },
                studentAnswer: { type: Type.STRING },
                correctAnswer: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
                explanation: { type: Type.STRING },
                pointsAwarded: { type: Type.NUMBER },
                maxPoints: { type: Type.NUMBER },
                },
                required: ["questionId", "studentAnswer", "correctAnswer", "isCorrect", "explanation", "pointsAwarded", "maxPoints"],
            },
            },
        },
        required: ["totalScore", "maxTotalScore", "summary", "letterGrade", "corrections", "studentHandwritingTranscription", "integrityAnalysis"],
        };

        const parts: any[] = [{ text: promptText }];
        parts.push({ text: `\n--- BÀI LÀM RÈN LUYỆN CỦA HỌC SINH ---` });
        studentWorkFiles.forEach((file) => {
        parts.push({ inlineData: { mimeType: file.file.type || "image/jpeg", data: file.base64 } });
        });

        const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts: parts },
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
        });

        const text = response.text;
        if (!text) throw new Error("AI Error");
        return JSON.parse(text) as GradingResult;
    } catch (error) {
        console.error("Practice grading failed", error);
        throw error;
    }
}