import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INCIDENT_CATEGORY_CODES,
  INCIDENT_CATEGORY_OPTIONS,
  getIncidentCategoryLabel,
  isValidIncidentCategoryCode,
} from './incidentCategories';

describe('incidentCategories constants and helpers', () => {
  it('defines exactly 13 predefined incident category codes', () => {
    assert.equal(INCIDENT_CATEGORY_CODES.length, 13);
    assert.equal(INCIDENT_CATEGORY_OPTIONS.length, 13);
  });

  it('maps each of the 13 codes to its exact Thai label', () => {
    const expectedMappings = [
      ['RADIO_RX_FAIL', 'เครื่องวิทยุรับสัญญาณไม่ได้'],
      ['RADIO_TX_FAIL', 'เครื่องวิทยุส่งสัญญาณไม่ได้'],
      ['RADIO_REG_FAIL', 'เครื่องวิทยุลงทะเบียนเข้าระบบไม่ได้'],
      ['POWER_FAULT', 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง'],
      ['DISPLAY_FAULT', 'ไฟแสดงผลหรือหน้าจอขัดข้อง'],
      ['CONTROL_FAULT', 'แผงควบคุมหรือปุ่มกดไม่ตอบสนอง'],
      ['BASE_TX_OFF', 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)'],
      ['BASE_OFFLINE', 'สถานีแม่ข่ายขาดการเชื่อมต่อกับระบบตรวจสอบ (Offline)'],
      ['ANTENNA_DAMAGED', 'สายอากาศหรือสายนำสัญญาณชำรุด'],
      ['ALARM_SYSTEM', 'ระบบแจ้งเตือนความผิดปกติ (Alarm)'],
      ['DISASTER_ENVIRONMENT', 'อุปกรณ์เสียหายจากสภาพแวดล้อมหรือภัยธรรมชาติ'],
      ['PHYSICAL_DAMAGE', 'อุปกรณ์เสียหายทางกายภาพภายนอก'],
      ['OTHER', 'อื่นๆ (โปรดระบุรายละเอียด)'],
    ] as const;

    for (const [code, label] of expectedMappings) {
      assert.equal(getIncidentCategoryLabel(code), label);
      assert.equal(isValidIncidentCategoryCode(code), true);
    }
  });

  it('returns fallback dash for null, undefined, or empty string', () => {
    assert.equal(getIncidentCategoryLabel(null), '—');
    assert.equal(getIncidentCategoryLabel(undefined), '—');
    assert.equal(getIncidentCategoryLabel(''), '—');
  });

  it('returns raw string for unknown codes', () => {
    assert.equal(getIncidentCategoryLabel('CUSTOM_UNKNOWN'), 'CUSTOM_UNKNOWN');
    assert.equal(isValidIncidentCategoryCode('CUSTOM_UNKNOWN'), false);
  });
});
