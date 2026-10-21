-- Migration: Update legacy incident category codes in `Job` table to the new 12 standard codes
-- Safe, idempotent SQL script for UAT / Production database

-- 1. Radio RX/TX/REG fail -> RADIO_TRANSCEIVER_FAIL (วิทยุรับ-ส่งสัญญาณไม่ได้)
UPDATE `Job`
SET `incidentCategory` = 'RADIO_TRANSCEIVER_FAIL'
WHERE `incidentCategory` IN ('RADIO_RX_FAIL', 'RADIO_TX_FAIL', 'RADIO_REG_FAIL');

-- 2. Power fault -> POWER_ON_FAIL (เปิดเครื่องไม่ติด)
UPDATE `Job`
SET `incidentCategory` = 'POWER_ON_FAIL'
WHERE `incidentCategory` = 'POWER_FAULT';

-- 3. Environment/disaster -> DISASTER_LIGHTNING (ความเสียหายจากภัยธรรมชาติ / ฟ้าผ่า)
UPDATE `Job`
SET `incidentCategory` = 'DISASTER_LIGHTNING'
WHERE `incidentCategory` = 'DISASTER_ENVIRONMENT';
