import { ExamConfig, StudentSubmission } from "../types";

const EXAM_CONFIG_KEY = 'autograde_exam_config';
const SUBMISSIONS_KEY = 'autograde_submissions';

export const saveExamConfig = (config: ExamConfig): void => {
  localStorage.setItem(EXAM_CONFIG_KEY, JSON.stringify(config));
};

export const getExamConfig = (): ExamConfig | null => {
  const data = localStorage.getItem(EXAM_CONFIG_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearExamConfig = (): void => {
    localStorage.removeItem(EXAM_CONFIG_KEY);
}

export const saveSubmission = (submission: StudentSubmission): void => {
  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === submission.id);
  if (index >= 0) {
    submissions[index] = submission;
  } else {
    submissions.push(submission);
  }
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
};

export const getSubmissions = (): StudentSubmission[] => {
  const data = localStorage.getItem(SUBMISSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearSubmissions = (): void => {
    localStorage.removeItem(SUBMISSIONS_KEY);
}

/**
 * Generates an Excel 2003 XML file (SpreadsheetML).
 * This format allows saving multiple worksheets in a single file, 
 * which satisfies the requirement "Each student is a sheet".
 */
export const exportSubmissionsToExcelXML = (): string => {
  const submissions = getSubmissions();
  
  // XML Header
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Arial" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:FontName="Arial" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sLabel">
    <Font ss:FontName="Arial" ss:Bold="1"/>
    <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sCorrect">
    <Font ss:FontName="Arial" ss:Color="#065F46"/>
    <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sIncorrect">
    <Font ss:FontName="Arial" ss:Color="#7F1D1D"/>
    <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sWrap">
    <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>
`;

  // 1. Summary Sheet (Overview)
  xml += ` <Worksheet ss:Name="TỔNG HỢP">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Column ss:Width="80"/>
   <Column ss:Width="60"/>
   <Column ss:Width="60"/>
   <Column ss:Width="80"/>
   <Column ss:Width="300"/>
   <Row ss:StyleID="sHeader">
    <Cell><Data ss:Type="String">Thời gian nộp</Data></Cell>
    <Cell><Data ss:Type="String">Họ tên</Data></Cell>
    <Cell><Data ss:Type="String">Mã SV</Data></Cell>
    <Cell><Data ss:Type="String">Điểm</Data></Cell>
    <Cell><Data ss:Type="String">Tối đa</Data></Cell>
    <Cell><Data ss:Type="String">Xếp loại</Data></Cell>
    <Cell><Data ss:Type="String">Nhận xét chung</Data></Cell>
   </Row>`;

  submissions.forEach(sub => {
    const time = new Date(sub.submissionTime).toLocaleString('vi-VN');
    const score = sub.result?.totalScore || 0;
    const max = sub.result?.maxTotalScore || 10;
    const grade = sub.result?.letterGrade || "";
    const summary = sub.result?.summary || "";
    
    xml += `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(time)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(sub.studentName)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(sub.studentId)}</Data></Cell>
    <Cell><Data ss:Type="Number">${score}</Data></Cell>
    <Cell><Data ss:Type="Number">${max}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(grade)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(summary)}</Data></Cell>
   </Row>`;
  });

  xml += `  </Table>
 </Worksheet>
`;

  // 2. Individual Sheets for Each Student
  submissions.forEach((sub, index) => {
    // Worksheet names must be unique and limited length. Use Name + Index
    const sheetName = escapeXml(`${sub.studentName.substring(0, 20)}_${index + 1}`);
    
    xml += ` <Worksheet ss:Name="${sheetName}">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="400"/>
   <Column ss:Width="60"/>
   <Column ss:Width="60"/>
   <Column ss:Width="400"/>
   
   <Row>
     <Cell ss:StyleID="sLabel"><Data ss:Type="String">Học sinh:</Data></Cell>
     <Cell><Data ss:Type="String">${escapeXml(sub.studentName)}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="sLabel"><Data ss:Type="String">Mã SV:</Data></Cell>
     <Cell><Data ss:Type="String">${escapeXml(sub.studentId)}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="sLabel"><Data ss:Type="String">Tổng điểm:</Data></Cell>
     <Cell><Data ss:Type="String">${sub.result?.totalScore} / ${sub.result?.maxTotalScore}</Data></Cell>
   </Row>
   <Row>
     <Cell ss:StyleID="sLabel"><Data ss:Type="String">Lời phê:</Data></Cell>
     <Cell ss:StyleID="sWrap"><Data ss:Type="String">${escapeXml(sub.result?.summary || "")}</Data></Cell>
   </Row>
   <Row/>
   
   <Row ss:StyleID="sHeader">
    <Cell><Data ss:Type="String">Câu hỏi</Data></Cell>
    <Cell><Data ss:Type="String">Bài làm học sinh (OCR)</Data></Cell>
    <Cell><Data ss:Type="String">Điểm</Data></Cell>
    <Cell><Data ss:Type="String">Max</Data></Cell>
    <Cell><Data ss:Type="String">Chi tiết nhận xét (Phương pháp &amp; Lỗi)</Data></Cell>
   </Row>`;

    if (sub.result?.corrections) {
        sub.result.corrections.forEach(corr => {
            const rowStyle = corr.isCorrect ? "sCorrect" : "sIncorrect";
            xml += `
   <Row>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(corr.questionId)}</Data></Cell>
    <Cell ss:StyleID="sWrap"><Data ss:Type="String">${escapeXml(corr.studentAnswer)}</Data></Cell>
    <Cell><Data ss:Type="Number">${corr.pointsAwarded}</Data></Cell>
    <Cell><Data ss:Type="Number">${corr.maxPoints}</Data></Cell>
    <Cell ss:StyleID="sWrap"><Data ss:Type="String">${escapeXml(corr.explanation)}</Data></Cell>
   </Row>`;
        });
    }

    xml += `  </Table>
 </Worksheet>
`;
  });

  xml += `</Workbook>`;
  return xml;
};

// Helper to escape XML characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}