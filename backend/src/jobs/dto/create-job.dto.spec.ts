import { ClassifyDocSchema, CreateJobSchema } from './create-job.dto';

describe('CreateJobSchema email optional (Meeting Phase A)', () => {
  const base = {
    province: 'สงขลา',
    district: 'หาดใหญ่',
    agency: 'ที่ทำการบ้านผู้ใหญ่บ้าน',
    location: 'หมู่ 1 สถานีทดสอบ',
    incidentCategory: 'RADIO_RX_FAIL',
    description: 'รายละเอียดปัญหาอย่างน้อยสิบตัวอักษร',
    reporterName: 'ผู้แจ้ง',
    reporterPhone: '0812345678',
  };

  it('allows empty reporterEmail', () => {
    const parsed = CreateJobSchema.parse({ ...base, reporterEmail: '' });
    expect(parsed.reporterEmail).toBe('');
  });

  it('allows omitted reporterEmail via empty preprocess', () => {
    const parsed = CreateJobSchema.parse({ ...base, reporterEmail: undefined });
    expect(parsed.reporterEmail).toBe('');
  });

  it('accepts valid email', () => {
    const parsed = CreateJobSchema.parse({
      ...base,
      reporterEmail: 'a@example.com',
    });
    expect(parsed.reporterEmail).toBe('a@example.com');
  });

  it('rejects invalid email when provided', () => {
    expect(() =>
      CreateJobSchema.parse({ ...base, reporterEmail: 'not-an-email' }),
    ).toThrow();
  });

  it('accepts optional subdistrict', () => {
    const parsed = CreateJobSchema.parse({
      ...base,
      reporterEmail: '',
      subdistrict: 'คอหงส์',
    });
    expect(parsed.subdistrict).toBe('คอหงส์');
  });

  it('requires agency (สถานที่/หน่วยงาน)', () => {
    const { agency: _a, ...withoutAgency } = base;
    expect(() =>
      CreateJobSchema.parse({ ...withoutAgency, reporterEmail: '' }),
    ).toThrow(/agency|สถานที่/);
  });

  it('keeps location as station name', () => {
    const parsed = CreateJobSchema.parse({ ...base, reporterEmail: '' });
    expect(parsed.agency).toBe('ที่ทำการบ้านผู้ใหญ่บ้าน');
    expect(parsed.location).toBe('หมู่ 1 สถานีทดสอบ');
  });

  it('rejects missing incidentCategory', () => {
    const { incidentCategory: _ic, ...withoutCategory } = base;
    expect(() =>
      CreateJobSchema.parse({ ...withoutCategory, reporterEmail: '' }),
    ).toThrow(/กรุณาเลือกหัวข้อเหตุขัดข้อง/);
  });

  it('rejects invalid incidentCategory', () => {
    expect(() =>
      CreateJobSchema.parse({
        ...base,
        reporterEmail: '',
        incidentCategory: 'INVALID_CATEGORY',
      }),
    ).toThrow();
  });

  it('accepts all 13 valid incidentCategory codes', () => {
    const codes = [
      'RADIO_RX_FAIL',
      'RADIO_TX_FAIL',
      'RADIO_REG_FAIL',
      'POWER_FAULT',
      'DISPLAY_FAULT',
      'CONTROL_FAULT',
      'BASE_TX_OFF',
      'BASE_OFFLINE',
      'ANTENNA_DAMAGED',
      'ALARM_SYSTEM',
      'DISASTER_ENVIRONMENT',
      'PHYSICAL_DAMAGE',
      'OTHER',
    ];
    for (const code of codes) {
      const parsed = CreateJobSchema.parse({
        ...base,
        incidentCategory: code,
        reporterEmail: '',
        description: 'รายละเอียดปัญหาอย่างน้อยสิบตัวอักษร',
      });
      expect(parsed.incidentCategory).toBe(code);
    }
  });

  it('allows optional description when incidentCategory is not OTHER', () => {
    const parsed = CreateJobSchema.parse({
      ...base,
      incidentCategory: 'RADIO_RX_FAIL',
      description: '',
      reporterEmail: '',
    });
    expect(parsed.description).toBe('');
  });

  it('requires description >= 10 characters when incidentCategory is OTHER', () => {
    expect(() =>
      CreateJobSchema.parse({
        ...base,
        incidentCategory: 'OTHER',
        description: '',
        reporterEmail: '',
      }),
    ).toThrow(
      /กรุณาระบุรายละเอียดเหตุขัดข้องอย่างน้อย 10 ตัวอักษร สำหรับหมวดหมู่อื่นๆ/,
    );

    expect(() =>
      CreateJobSchema.parse({
        ...base,
        incidentCategory: 'OTHER',
        description: 'สั้นเกิน',
        reporterEmail: '',
      }),
    ).toThrow(
      /กรุณาระบุรายละเอียดเหตุขัดข้องอย่างน้อย 10 ตัวอักษร สำหรับหมวดหมู่อื่นๆ/,
    );

    const valid = CreateJobSchema.parse({
      ...base,
      incidentCategory: 'OTHER',
      description: 'อาการขัดข้องอื่นๆ ที่ระบุโดยละเอียดมากกว่าสิบตัวอักษร',
      reporterEmail: '',
    });
    expect(valid.incidentCategory).toBe('OTHER');
    expect(valid.description).toBe(
      'อาการขัดข้องอื่นๆ ที่ระบุโดยละเอียดมากกว่าสิบตัวอักษร',
    );
  });
});

describe('ClassifyDocSchema', () => {
  it('accepts boolean and string flags', () => {
    expect(
      ClassifyDocSchema.parse({ isOutOfContract: true }).isOutOfContract,
    ).toBe(true);
    expect(
      ClassifyDocSchema.parse({ isOutOfContract: 'false' }).isOutOfContract,
    ).toBe(false);
  });
});
