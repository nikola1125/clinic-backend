import { Test, TestingModule } from '@nestjs/testing';
import { RlsService } from './rls.service';
import { EntityManager } from 'typeorm';

describe('RlsService', () => {
  let service: RlsService;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockManager = {
      query: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RlsService],
    }).compile();

    service = module.get<RlsService>(RlsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setAdminContext', () => {
    it('should set admin context', async () => {
      await service.setAdminContext(mockManager);

      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.is_admin', 'true', true)"
      );
    });
  });

  describe('setDoctorContext', () => {
    it('should set doctor context', async () => {
      const doctorId = '123e4567-e89b-12d3-a456-426614174000';
      await service.setDoctorContext(mockManager, doctorId);

      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.doctor_id', $1, true)",
        [doctorId]
      );
    });
  });

  describe('setPatientContext', () => {
    it('should set patient context', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174001';
      await service.setPatientContext(mockManager, patientId);

      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.patient_id', $1, true)",
        [patientId]
      );
    });
  });

  describe('clearContext', () => {
    it('should clear all RLS contexts', async () => {
      await service.clearContext(mockManager);

      expect(mockManager.query).toHaveBeenCalledTimes(3);
      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.is_admin', '', true)"
      );
      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.doctor_id', '', true)"
      );
      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.patient_id', '', true)"
      );
    });
  });

  describe('withAdminContext', () => {
    it('should execute function within admin context', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      const result = await service.withAdminContext(mockManager, mockFn);

      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.is_admin', 'true', true)"
      );
      expect(mockFn).toHaveBeenCalledWith(mockManager);
      expect(result).toBe('result');
      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.is_admin', '', true)"
      );
    });

    it('should clear context even if function throws', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      await expect(
        service.withAdminContext(mockManager, mockFn)
      ).rejects.toThrow('test error');

      expect(mockManager.query).toHaveBeenCalledWith(
        "SELECT set_config('app.is_admin', '', true)"
      );
    });
  });
});
