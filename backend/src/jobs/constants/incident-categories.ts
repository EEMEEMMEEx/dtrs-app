export const INCIDENT_CATEGORY_CODES = [
  'RADIO_TRANSCEIVER_FAIL',
  'POWER_ON_FAIL',
  'BATTERY_BACKUP_FAIL',
  'DISPLAY_FAULT',
  'CONTROL_FAULT',
  'ANTENNA_DAMAGED',
  'BASE_TX_OFF',
  'BASE_OFFLINE',
  'ALARM_SYSTEM',
  'DISASTER_LIGHTNING',
  'PHYSICAL_DAMAGE',
  'OTHER',
] as const;

export type IncidentCategoryCode = (typeof INCIDENT_CATEGORY_CODES)[number];

export interface IncidentCategoryOption {
  code: IncidentCategoryCode;
  label: string;
}

export const INCIDENT_CATEGORIES: readonly IncidentCategoryOption[] = [
  { code: 'RADIO_TRANSCEIVER_FAIL', label: 'วิทยุรับ-ส่งสัญญาณไม่ได้' },
  { code: 'POWER_ON_FAIL', label: 'เปิดเครื่องไม่ติด' },
  { code: 'BATTERY_BACKUP_FAIL', label: 'แบตเตอรี่ / ระบบสำรองไฟขัดข้อง' },
  { code: 'DISPLAY_FAULT', label: 'หน้าจอไม่แสดงผล / ไฟสถานะขัดข้อง' },
  { code: 'CONTROL_FAULT', label: 'ปุ่มกด / แผงควบคุมค้าง' },
  { code: 'ANTENNA_DAMAGED', label: 'สายอากาศ / สายสัญญาณชำรุด' },
  { code: 'BASE_TX_OFF', label: 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)' },
  { code: 'BASE_OFFLINE', label: 'สถานีแม่ข่ายออฟไลน์ (Offline)' },
  { code: 'ALARM_SYSTEM', label: 'แจ้งเตือนระบบผิดปกติ (Alarm)' },
  {
    code: 'DISASTER_LIGHTNING',
    label: 'ความเสียหายจากภัยธรรมชาติ / ฟ้าผ่า',
  },
  { code: 'PHYSICAL_DAMAGE', label: 'ตัวเครื่อง / โครงสร้างชำรุดภายนอก' },
  { code: 'OTHER', label: 'อื่นๆ (โปรดระบุรายละเอียด)' },
] as const;

const INCIDENT_CATEGORY_LABEL_MAP: Record<IncidentCategoryCode, string> = {
  RADIO_TRANSCEIVER_FAIL: 'วิทยุรับ-ส่งสัญญาณไม่ได้',
  POWER_ON_FAIL: 'เปิดเครื่องไม่ติด',
  BATTERY_BACKUP_FAIL: 'แบตเตอรี่ / ระบบสำรองไฟขัดข้อง',
  DISPLAY_FAULT: 'หน้าจอไม่แสดงผล / ไฟสถานะขัดข้อง',
  CONTROL_FAULT: 'ปุ่มกด / แผงควบคุมค้าง',
  ANTENNA_DAMAGED: 'สายอากาศ / สายสัญญาณชำรุด',
  BASE_TX_OFF: 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)',
  BASE_OFFLINE: 'สถานีแม่ข่ายออฟไลน์ (Offline)',
  ALARM_SYSTEM: 'แจ้งเตือนระบบผิดปกติ (Alarm)',
  DISASTER_LIGHTNING: 'ความเสียหายจากภัยธรรมชาติ / ฟ้าผ่า',
  PHYSICAL_DAMAGE: 'ตัวเครื่อง / โครงสร้างชำรุดภายนอก',
  OTHER: 'อื่นๆ (โปรดระบุรายละเอียด)',
};

/**
 * คำแปลภาษาอังกฤษสำหรับหมวดหมู่อาการ (สำหรับเอกสาร / API / ระบบ 2 ภาษา)
 */
export const INCIDENT_CATEGORY_EN_LABELS: Record<IncidentCategoryCode, string> = {
  RADIO_TRANSCEIVER_FAIL: 'Radio cannot transmit/receive',
  POWER_ON_FAIL: 'Device will not power on',
  BATTERY_BACKUP_FAIL: 'Battery / backup power failure',
  DISPLAY_FAULT: 'Display not working / status light fault',
  CONTROL_FAULT: 'Buttons / control panel unresponsive',
  ANTENNA_DAMAGED: 'Antenna / signal cable damaged',
  BASE_TX_OFF: 'Base station stopped transmitting (Tx OFF)',
  BASE_OFFLINE: 'Base station offline (Offline)',
  ALARM_SYSTEM: 'System alarm (Alarm)',
  DISASTER_LIGHTNING: 'Damage from natural disaster / lightning',
  PHYSICAL_DAMAGE: 'External device / structure damage',
  OTHER: 'Other (please specify details)',
};

/**
 * รองรับรหัสหมวดหมู่เดิมในประวัติ (backward-compatibility เมื่อแสดงผลงานเก่าที่ยังไม่ถูก migrate)
 */
const LEGACY_INCIDENT_CATEGORY_LABEL_MAP: Record<string, string> = {
  RADIO_RX_FAIL: 'เครื่องวิทยุรับสัญญาณไม่ได้',
  RADIO_TX_FAIL: 'เครื่องวิทยุส่งสัญญาณไม่ได้',
  RADIO_REG_FAIL: 'เครื่องวิทยุลงทะเบียนเข้าระบบไม่ได้',
  POWER_FAULT: 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง',
  DISASTER_ENVIRONMENT: 'อุปกรณ์เสียหายจากสภาพแวดล้อมหรือภัยธรรมชาติ',
};

export function getIncidentCategoryLabel(code?: string | null): string {
  if (!code) return '—';
  if (code in INCIDENT_CATEGORY_LABEL_MAP) {
    return INCIDENT_CATEGORY_LABEL_MAP[code as IncidentCategoryCode];
  }
  if (code in LEGACY_INCIDENT_CATEGORY_LABEL_MAP) {
    return LEGACY_INCIDENT_CATEGORY_LABEL_MAP[code];
  }
  return code;
}

export function isValidIncidentCategoryCode(
  code: string,
): code is IncidentCategoryCode {
  return (INCIDENT_CATEGORY_CODES as readonly string[]).includes(code);
}
