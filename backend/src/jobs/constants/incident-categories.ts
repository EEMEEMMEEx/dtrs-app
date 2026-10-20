export const INCIDENT_CATEGORY_CODES = [
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
] as const;

export type IncidentCategoryCode = (typeof INCIDENT_CATEGORY_CODES)[number];

export interface IncidentCategoryOption {
  code: IncidentCategoryCode;
  label: string;
}

export const INCIDENT_CATEGORIES: readonly IncidentCategoryOption[] = [
  { code: 'RADIO_RX_FAIL', label: 'เครื่องวิทยุรับสัญญาณไม่ได้' },
  { code: 'RADIO_TX_FAIL', label: 'เครื่องวิทยุส่งสัญญาณไม่ได้' },
  { code: 'RADIO_REG_FAIL', label: 'เครื่องวิทยุลงทะเบียนเข้าระบบไม่ได้' },
  { code: 'POWER_FAULT', label: 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง' },
  { code: 'DISPLAY_FAULT', label: 'ไฟแสดงผลหรือหน้าจอขัดข้อง' },
  { code: 'CONTROL_FAULT', label: 'แผงควบคุมหรือปุ่มกดไม่ตอบสนอง' },
  { code: 'BASE_TX_OFF', label: 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)' },
  {
    code: 'BASE_OFFLINE',
    label: 'สถานีแม่ข่ายขาดการเชื่อมต่อกับระบบตรวจสอบ (Offline)',
  },
  { code: 'ANTENNA_DAMAGED', label: 'สายอากาศหรือสายนำสัญญาณชำรุด' },
  { code: 'ALARM_SYSTEM', label: 'ระบบแจ้งเตือนความผิดปกติ (Alarm)' },
  {
    code: 'DISASTER_ENVIRONMENT',
    label: 'อุปกรณ์เสียหายจากสภาพแวดล้อมหรือภัยธรรมชาติ',
  },
  { code: 'PHYSICAL_DAMAGE', label: 'อุปกรณ์เสียหายทางกายภาพภายนอก' },
  { code: 'OTHER', label: 'อื่นๆ (โปรดระบุรายละเอียด)' },
] as const;

const INCIDENT_CATEGORY_LABEL_MAP: Record<IncidentCategoryCode, string> = {
  RADIO_RX_FAIL: 'เครื่องวิทยุรับสัญญาณไม่ได้',
  RADIO_TX_FAIL: 'เครื่องวิทยุส่งสัญญาณไม่ได้',
  RADIO_REG_FAIL: 'เครื่องวิทยุลงทะเบียนเข้าระบบไม่ได้',
  POWER_FAULT: 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง',
  DISPLAY_FAULT: 'ไฟแสดงผลหรือหน้าจอขัดข้อง',
  CONTROL_FAULT: 'แผงควบคุมหรือปุ่มกดไม่ตอบสนอง',
  BASE_TX_OFF: 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)',
  BASE_OFFLINE: 'สถานีแม่ข่ายขาดการเชื่อมต่อกับระบบตรวจสอบ (Offline)',
  ANTENNA_DAMAGED: 'สายอากาศหรือสายนำสัญญาณชำรุด',
  ALARM_SYSTEM: 'ระบบแจ้งเตือนความผิดปกติ (Alarm)',
  DISASTER_ENVIRONMENT: 'อุปกรณ์เสียหายจากสภาพแวดล้อมหรือภัยธรรมชาติ',
  PHYSICAL_DAMAGE: 'อุปกรณ์เสียหายทางกายภาพภายนอก',
  OTHER: 'อื่นๆ (โปรดระบุรายละเอียด)',
};

export function getIncidentCategoryLabel(code?: string | null): string {
  if (!code) return '—';
  if (code in INCIDENT_CATEGORY_LABEL_MAP) {
    return INCIDENT_CATEGORY_LABEL_MAP[code as IncidentCategoryCode];
  }
  return code;
}

export function isValidIncidentCategoryCode(
  code: string,
): code is IncidentCategoryCode {
  return (INCIDENT_CATEGORY_CODES as readonly string[]).includes(code);
}
