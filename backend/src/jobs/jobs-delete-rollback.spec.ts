import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus } from '@prisma/client';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { UsersService } from '../users/users.service';
import { MinioService } from '../minio/minio.service';
import { JobEmailNotificationService } from './job-email-notification.service';
import { RolesService } from '../roles/roles.service';

describe('JobsService delete and sequence rollback', () => {
  let service: JobsService;
  let jobFindUnique: jest.Mock;
  let jobDelete: jest.Mock;
  let queryRaw: jest.Mock;
  let executeRaw: jest.Mock;

  beforeEach(async () => {
    jobFindUnique = jest.fn();
    jobDelete = jest.fn();
    queryRaw = jest.fn();
    executeRaw = jest.fn();

    const mockTx = {
      job: {
        findUnique: jobFindUnique,
        delete: jobDelete,
      },
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (cb) => cb(mockTx)),
            job: {
              findUnique: jobFindUnique,
              delete: jobDelete,
            },
            $queryRaw: queryRaw,
            $executeRaw: executeRaw,
          },
        },
        { provide: SitesService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: MinioService, useValue: {} },
        { provide: JobEmailNotificationService, useValue: {} },
        { provide: RolesService, useValue: {} },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  describe('deleteUnassignedJob with sequence rollback', () => {
    it('rolls back RQ-CM when deleted job is the latest in sequence', async () => {
      jobFindUnique.mockResolvedValue({
        id: 10,
        status: JobStatus.PENDING,
        assignedToId: null,
        requestTicketNo: 'RQ-CM-20260003',
        ticketNo: null,
      });
      // Sequence currently has lastValue = 3
      queryRaw.mockResolvedValueOnce([{ lastValue: 3 }]);
      jobDelete.mockResolvedValue({ id: 10 });

      const res = await service.deleteUnassignedJob(10);
      expect(res).toEqual({ ok: true });
      expect(queryRaw).toHaveBeenCalled();
      // Should execute UPDATE setting lastValue = 2
      expect(executeRaw).toHaveBeenCalled();
      expect(jobDelete).toHaveBeenCalledWith({ where: { id: 10 } });
    });

    it('rolls back RQ-OOC when deleted job is the latest in sequence', async () => {
      jobFindUnique.mockResolvedValue({
        id: 11,
        status: JobStatus.PENDING,
        assignedToId: null,
        requestTicketNo: 'RQ-OOC-20260005',
        ticketNo: null,
      });
      queryRaw.mockResolvedValueOnce([{ lastValue: 5 }]);
      jobDelete.mockResolvedValue({ id: 11 });

      const res = await service.deleteUnassignedJob(11);
      expect(res).toEqual({ ok: true });
      expect(executeRaw).toHaveBeenCalled();
    });

    it('does NOT roll back sequence when deleted job is NOT the latest (e.g. 0002 when lastValue is 0003)', async () => {
      jobFindUnique.mockResolvedValue({
        id: 12,
        status: JobStatus.PENDING,
        assignedToId: null,
        requestTicketNo: 'RQ-CM-20260002',
        ticketNo: null,
      });
      // Sequence currently has lastValue = 3
      queryRaw.mockResolvedValueOnce([{ lastValue: 3 }]);
      jobDelete.mockResolvedValue({ id: 12 });

      const res = await service.deleteUnassignedJob(12);
      expect(res).toEqual({ ok: true });
      // queryRaw was called to check, but executeRaw (UPDATE) must NOT be called
      expect(executeRaw).not.toHaveBeenCalled();
      expect(jobDelete).toHaveBeenCalledWith({ where: { id: 12 } });
    });

    it('rolls back both requestTicketNo and ticketNo if both are latest', async () => {
      jobFindUnique.mockResolvedValue({
        id: 13,
        status: JobStatus.PENDING,
        assignedToId: null,
        requestTicketNo: 'RQ-OOC-20260001',
        ticketNo: 'OOC-2026-0001',
      });
      // Both have lastValue = 1
      queryRaw
        .mockResolvedValueOnce([{ lastValue: 1 }]) // for requestTicketNo
        .mockResolvedValueOnce([{ lastValue: 1 }]); // for ticketNo
      jobDelete.mockResolvedValue({ id: 13 });

      const res = await service.deleteUnassignedJob(13);
      expect(res).toEqual({ ok: true });
      expect(executeRaw).toHaveBeenCalledTimes(2);
      expect(jobDelete).toHaveBeenCalledWith({ where: { id: 13 } });
    });

    it('throws NotFoundException when job does not exist', async () => {
      jobFindUnique.mockResolvedValue(null);
      await expect(service.deleteUnassignedJob(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when job is not PENDING', async () => {
      jobFindUnique.mockResolvedValue({
        id: 14,
        status: JobStatus.RESOLVED,
        assignedToId: null,
      });
      await expect(service.deleteUnassignedJob(14)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when job is assigned', async () => {
      jobFindUnique.mockResolvedValue({
        id: 15,
        status: JobStatus.PENDING,
        assignedToId: 2,
      });
      await expect(service.deleteUnassignedJob(15)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('tryDeleteInProgressJobByAdmin with sequence rollback', () => {
    it('rolls back sequence and deletes IN_PROGRESS job', async () => {
      jobFindUnique.mockResolvedValue({
        id: 20,
        status: JobStatus.IN_PROGRESS,
        requestTicketNo: 'RQ-CM-20260004',
        ticketNo: null,
      });
      queryRaw.mockResolvedValueOnce([{ lastValue: 4 }]);
      jobDelete.mockResolvedValue({ id: 20 });

      const deleted = await service.tryDeleteInProgressJobByAdmin(20);
      expect(deleted).toBe(true);
      expect(executeRaw).toHaveBeenCalled();
      expect(jobDelete).toHaveBeenCalledWith({ where: { id: 20 } });
    });

    it('returns false without rollback or delete if job is not IN_PROGRESS', async () => {
      jobFindUnique.mockResolvedValue({
        id: 21,
        status: JobStatus.PENDING,
        requestTicketNo: 'RQ-CM-20260004',
        ticketNo: null,
      });

      const deleted = await service.tryDeleteInProgressJobByAdmin(21);
      expect(deleted).toBe(false);
      expect(executeRaw).not.toHaveBeenCalled();
      expect(jobDelete).not.toHaveBeenCalled();
    });
  });
});
