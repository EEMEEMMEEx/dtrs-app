/**
 * สคริปต์ปรับปรุงรหัส incidentCategory ในตาราง Job ให้เป็นไปตาม 12 หมวดหมู่มาตรฐานใหม่
 *
 * การแมปข้อมูล:
 *   RADIO_RX_FAIL, RADIO_TX_FAIL, RADIO_REG_FAIL -> RADIO_TRANSCEIVER_FAIL (วิทยุรับ-ส่งสัญญาณไม่ได้)
 *   POWER_FAULT -> POWER_ON_FAIL (เปิดเครื่องไม่ติด)
 *   DISASTER_ENVIRONMENT -> DISASTER_LIGHTNING (ความเสียหายจากภัยธรรมชาติ / ฟ้าผ่า)
 *
 * วิธีรัน (ในโฟลเดอร์ backend/):
 *   npx ts-node scripts/migrate-incident-categories.ts [--dry-run]
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

const MIGRATION_MAP: Record<string, string> = {
  RADIO_RX_FAIL: 'RADIO_TRANSCEIVER_FAIL',
  RADIO_TX_FAIL: 'RADIO_TRANSCEIVER_FAIL',
  RADIO_REG_FAIL: 'RADIO_TRANSCEIVER_FAIL',
  POWER_FAULT: 'POWER_ON_FAIL',
  DISASTER_ENVIRONMENT: 'DISASTER_LIGHTNING',
};

async function main() {
  console.log(`🔄 ตรวจสอบข้อมูล incidentCategory ในฐานข้อมูล... ${isDryRun ? '[โหมด DRY-RUN]' : ''}`);

  const distribution = await prisma.job.groupBy({
    by: ['incidentCategory'],
    _count: true,
  });

  console.log('\n📊 สรุปจำนวนแยกตามหมวดหมู่ปัจจุบัน:');
  for (const item of distribution) {
    console.log(`  - ${item.incidentCategory ?? '(null)'}: ${item._count} รายการ`);
  }

  const legacyCodes = Object.keys(MIGRATION_MAP);
  const legacyJobs = await prisma.job.findMany({
    where: {
      incidentCategory: {
        in: legacyCodes,
      },
    },
    select: {
      id: true,
      ticketNo: true,
      incidentCategory: true,
    },
  });

  if (legacyJobs.length === 0) {
    console.log('\n✅ ไม่พบรายการที่ต้องแปลงข้อมูล (รหัสทั้งหมดเป็นมาตรฐานใหม่แล้ว)');
    return;
  }

  console.log(`\n🔍 พบรายการที่ใช้รหัสเดิมทั้งหมด ${legacyJobs.length} รายการ:`);

  let updatedCount = 0;
  for (const job of legacyJobs) {
    const oldCode = job.incidentCategory!;
    const newCode = MIGRATION_MAP[oldCode];
    console.log(`  - Job ID #${job.id} (${job.ticketNo ?? 'no ticket'}): ${oldCode} -> ${newCode}`);

    if (!isDryRun) {
      await prisma.job.update({
        where: { id: job.id },
        data: { incidentCategory: newCode },
      });
      updatedCount++;
    }
  }

  if (isDryRun) {
    console.log(`\n💡 [DRY-RUN เสร็จสิ้น] พบรายการที่สามารถแปลงได้ ${legacyJobs.length} รายการ (ไม่มีการแก้ไขข้อมูลจริง)`);
  } else {
    console.log(`\n🎉 [MIGRATION สำเร็จ] อัปเดตข้อมูลแล้ว ${updatedCount} รายการ`);
  }
}

main()
  .catch((err) => {
    console.error('❌ เกิดข้อผิดพลาดในการ migrate:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
