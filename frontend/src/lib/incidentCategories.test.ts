import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INCIDENT_CATEGORY_CODES,
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_CATEGORY_EN_LABELS,
  getIncidentCategoryLabel,
  isValidIncidentCategoryCode,
} from './incidentCategories';

describe('incidentCategories constants and helpers', () => {
  it('defines exactly 12 predefined incident category codes in the exact order', () => {
    assert.equal(INCIDENT_CATEGORY_CODES.length, 12);
    assert.equal(INCIDENT_CATEGORY_OPTIONS.length, 12);

    const expectedCodesInOrder = [
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
    ];

    assert.deepEqual([...INCIDENT_CATEGORY_CODES], expectedCodesInOrder);
    assert.deepEqual(
      INCIDENT_CATEGORY_OPTIONS.map((opt) => opt.value),
      expectedCodesInOrder,
    );
  });

  it('maps each of the 12 codes to its exact Thai label as specified', () => {
    const expectedMappings = [
      ['RADIO_TRANSCEIVER_FAIL', 'วิทยุรับ-ส่งสัญญาณไม่ได้'],
      ['POWER_ON_FAIL', 'เปิดเครื่องไม่ติด'],
      ['BATTERY_BACKUP_FAIL', 'แบตเตอรี่ / ระบบสำรองไฟขัดข้อง'],
      ['DISPLAY_FAULT', 'หน้าจอไม่แสดงผล / ไฟสถานะขัดข้อง'],
      ['CONTROL_FAULT', 'ปุ่มกด / แผงควบคุมค้าง'],
      ['ANTENNA_DAMAGED', 'สายอากาศ / สายสัญญาณชำรุด'],
      ['BASE_TX_OFF', 'สถานีแม่ข่ายหยุดส่งสัญญาณ (Tx OFF)'],
      ['BASE_OFFLINE', 'สถานีแม่ข่ายออฟไลน์ (Offline)'],
      ['ALARM_SYSTEM', 'แจ้งเตือนระบบผิดปกติ (Alarm)'],
      ['DISASTER_LIGHTNING', 'ความเสียหายจากภัยธรรมชาติ / ฟ้าผ่า'],
      ['PHYSICAL_DAMAGE', 'ตัวเครื่อง / โครงสร้างชำรุดภายนอก'],
      ['OTHER', 'อื่นๆ (โปรดระบุรายละเอียด)'],
    ] as const;

    for (let i = 0; i < expectedMappings.length; i++) {
      const [code, label] = expectedMappings[i];
      assert.equal(INCIDENT_CATEGORY_OPTIONS[i].value, code);
      assert.equal(INCIDENT_CATEGORY_OPTIONS[i].label, label);
      assert.equal(getIncidentCategoryLabel(code), label);
      assert.equal(isValidIncidentCategoryCode(code), true);
    }
  });

  it('provides accurate English equivalents for all 12 options', () => {
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.RADIO_TRANSCEIVER_FAIL,
      'Radio cannot transmit/receive',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.POWER_ON_FAIL,
      'Device will not power on',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.BATTERY_BACKUP_FAIL,
      'Battery / backup power failure',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.DISPLAY_FAULT,
      'Display not working / status light fault',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.CONTROL_FAULT,
      'Buttons / control panel unresponsive',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.ANTENNA_DAMAGED,
      'Antenna / signal cable damaged',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.BASE_TX_OFF,
      'Base station stopped transmitting (Tx OFF)',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.BASE_OFFLINE,
      'Base station offline (Offline)',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.ALARM_SYSTEM,
      'System alarm (Alarm)',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.DISASTER_LIGHTNING,
      'Damage from natural disaster / lightning',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.PHYSICAL_DAMAGE,
      'External device / structure damage',
    );
    assert.equal(
      INCIDENT_CATEGORY_EN_LABELS.OTHER,
      'Other (please specify details)',
    );
  });

  it('resolves legacy category codes for backward compatibility', () => {
    assert.equal(getIncidentCategoryLabel('RADIO_RX_FAIL'), 'เครื่องวิทยุรับสัญญาณไม่ได้');
    assert.equal(getIncidentCategoryLabel('RADIO_TX_FAIL'), 'เครื่องวิทยุส่งสัญญาณไม่ได้');
    assert.equal(getIncidentCategoryLabel('RADIO_REG_FAIL'), 'เครื่องวิทยุลงทะเบียนเข้าระบบไม่ได้');
    assert.equal(getIncidentCategoryLabel('POWER_FAULT'), 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง');
    assert.equal(getIncidentCategoryLabel('DISASTER_ENVIRONMENT'), 'อุปกรณ์เสียหายจากสภาพแวดล้อมหรือภัยธรรมชาติ');

    // Legacy codes should not be recognized as currently valid for new submissions
    assert.equal(isValidIncidentCategoryCode('RADIO_RX_FAIL'), false);
    assert.equal(isValidIncidentCategoryCode('POWER_FAULT'), false);
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
