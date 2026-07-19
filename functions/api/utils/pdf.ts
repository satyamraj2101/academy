function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateCertificateHtml(certData: {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  credentialId: string;
  verifyUrl?: string;
}): string {
  const date = new Date(certData.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const studentName = escapeHtml(certData.studentName);
  const courseTitle = escapeHtml(certData.courseTitle);
  const credentialId = escapeHtml(certData.credentialId);
  const verifyUrl = certData.verifyUrl ? escapeHtml(certData.verifyUrl) : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate - ${certData.credentialId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #f8fafc;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .certificate {
      width: 1056px; /* 11 inches at 96 DPI */
      height: 816px; /* 8.5 inches at 96 DPI */
      background: white;
      position: relative;
      padding: 60px;
      box-sizing: border-box;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      border: 12px solid #4f46e5;
      outline: 4px solid #c7d2fe;
      outline-offset: -20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-image: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
    }

    .header {
      font-size: 16px;
      font-weight: 900;
      color: #4f46e5;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 40px;
    }

    .title {
      font-size: 56px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 20px;
    }

    .subtitle {
      font-size: 20px;
      color: #64748b;
      margin-bottom: 40px;
    }

    .student {
      font-size: 48px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 40px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      display: inline-block;
      min-width: 60%;
    }

    .course {
      font-size: 32px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 60px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 40px;
    }

    .meta-block {
      text-align: left;
    }

    .meta-label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .meta-value {
      font-size: 18px;
      color: #0f172a;
      font-weight: 700;
      font-family: monospace;
    }

    .logo {
      width: 64px;
      height: 64px;
      background: #4f46e5;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .logo svg {
      width: 32px;
      height: 32px;
      color: white;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div style="display: flex; justify-content: center;">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </div>
    </div>
    <div class="header">SpotCLM Academy</div>
    <div class="title">Certificate of Completion</div>
    <div class="subtitle">This certifies that</div>
    <div class="student">${studentName}</div>
    <div class="subtitle">has successfully completed the course</div>
    <div class="course">${courseTitle}</div>

    <div class="footer">
      <div class="meta-block">
        <div class="meta-label">Date of Issue</div>
        <div class="meta-value">${date}</div>
      </div>

      <div class="meta-block" style="text-align: center;">
        <div class="meta-label">Verify at</div>
        <div class="meta-value" style="font-size: 13px;">${verifyUrl || 'spotclm.com/certifications'}</div>
      </div>

      <div class="meta-block" style="text-align: right;">
        <div class="meta-label">Credential ID</div>
        <div class="meta-value">${credentialId}</div>
      </div>
    </div>
  </div>
  <script>
    // Automatically trigger print dialog so user can save as PDF
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
  `;
}
