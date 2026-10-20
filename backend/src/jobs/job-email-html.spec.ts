import {
  buildClosedEmailHtml,
  buildReportedEmailHtml,
  type JobEmailPayload,
} from './job-email-html';

describe('job-email-html location line (agency + station)', () => {
  const base: JobEmailPayload = {
    ticketNo: 'CM-SHF-2026-0001',
    issueSummary: 'ทดสอบ',
    province: 'กาญจนบุรี',
    district: 'เลาขวัญ',
    agency: 'ที่ทำการบ้านผู้ใหญ่บ้าน',
    location: 'หมู่ 13 หนองจิกน้ำดำ',
    fixEnvironmentLabel: null,
    jobTypeLabel: null,
    statusCode: 'PENDING',
    statusLabel: 'รอดำเนินการ',
    reporterName: 'ผู้แจ้ง',
    assigneeName: null,
    reportDateLabel: '1/1/2026',
    fixDateLabel: null,
    dashboardUrl: 'http://localhost/dashboard/jobs/1',
    publicStatusUrl: 'http://localhost/public/status?ticketNo=1',
  };

  it('includes agency and station in email body', () => {
    const { html } = buildReportedEmailHtml(base, '');
    expect(html).toContain('ที่ทำการบ้านผู้ใหญ่บ้าน');
    expect(html).toContain('หมู่ 13 หนองจิกน้ำดำ');
  });

  it('shows only location when agency is null (legacy job)', () => {
    const { html } = buildReportedEmailHtml({ ...base, agency: null }, '');
    expect(html).toContain('หมู่ 13 หนองจิกน้ำดำ');
    expect(html).not.toContain('ที่ทำการบ้านผู้ใหญ่บ้าน');
  });
});

describe('job-email-html incident category rows (หัวข้อเหตุขัดข้อง / รายละเอียดเพิ่มเติม)', () => {
  const base: JobEmailPayload = {
    ticketNo: 'CM-SHF-2026-0023',
    issueSummary: 'ฟหกด์พรัรนย',
    incidentCategoryLabel: 'เครื่องวิทยุรับสัญญาณไม่ได้',
    province: 'นครราชสีมา',
    district: 'วังน้ำเขียว',
    agency: 'ศาลาประชาคม',
    location: 'หมู่ 5 คลองกุ่ม',
    fixEnvironmentLabel: 'Indoor (ในอาคาร)',
    jobTypeLabel: null,
    statusCode: 'PENDING',
    statusLabel: 'รอดำเนินการ',
    reporterName: 'ศักดิ์ภัท สวัสดีเนตร',
    assigneeName: null,
    reportDateLabel: '19/10/2569 00:00:00',
    fixDateLabel: null,
    dashboardUrl: 'http://localhost/dashboard/jobs/23',
    publicStatusUrl: 'http://localhost/public/status?ticketNo=23',
  };

  const cellAfter = (html: string, label: string): string => {
    const i = html.indexOf(label);
    expect(i).toBeGreaterThanOrEqual(0);
    const seg = html.slice(i, i + 400);
    const m = seg.match(/<td[^>]*>([^<]*)<\/td>/);
    return m ? m[1] : 'REGEX-MISS';
  };

  it('renders Thai category label and free-text details as two rows', () => {
    const { html } = buildClosedEmailHtml(base, '');
    expect(html).not.toContain('เรื่อง / ข้อขัดข้อง');
    expect(cellAfter(html, 'หัวข้อเหตุขัดข้อง')).toBe(
      'เครื่องวิทยุรับสัญญาณไม่ได้',
    );
    expect(cellAfter(html, 'รายละเอียดเพิ่มเติม')).toBe('ฟหกด์พรัรนย');
  });

  it('falls back to em-dash when category is null or undefined (legacy job)', () => {
    expect(
      cellAfter(
        buildClosedEmailHtml({ ...base, incidentCategoryLabel: null }, '').html,
        'หัวข้อเหตุขัดข้อง',
      ),
    ).toBe('—');
    const legacy = { ...base } as JobEmailPayload;
    delete legacy.incidentCategoryLabel;
    expect(
      cellAfter(buildClosedEmailHtml(legacy, '').html, 'หัวข้อเหตุขัดข้อง'),
    ).toBe('—');
  });

  it('escapes HTML special characters in injected values', () => {
    const { html } = buildClosedEmailHtml(
      { ...base, issueSummary: '<script>alert("x&y")</script>' },
      '',
    );
    expect(html).not.toContain('<script>alert');
    expect(cellAfter(html, 'รายละเอียดเพิ่มเติม')).toBe(
      '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;',
    );
  });
});
