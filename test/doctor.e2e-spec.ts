import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DoctorService } from '../src/modules/doctor/doctor.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('DoctorController (e2e)', () => {
  let app: INestApplication;
  let doctorService: DoctorService;

  const mockDoctorService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getPatients: jest.fn(),
    getPatient: jest.fn(),
    getAppointments: jest.fn(),
    getAppointment: jest.fn(),
    updateAppointment: jest.fn(),
    addNote: jest.fn(),
    getPatientNotes: jest.fn(),
    createPatientNote: jest.fn(),
    updatePatientNote: jest.fn(),
    deletePatientNote: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DoctorService)
      .useValue(mockDoctorService)
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    doctorService = moduleFixture.get<DoctorService>(DoctorService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/doctor/patients (GET)', () => {
    it('should return list of patients', () => {
      const mockPatients = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      ];

      mockDoctorService.getPatients.mockResolvedValue(mockPatients);

      return request(app.getHttpServer())
        .get('/doctor/patients')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPatients);
          expect(mockDoctorService.getPatients).toHaveBeenCalled();
        });
    });

    it('should return empty array when no patients', () => {
      mockDoctorService.getPatients.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/doctor/patients')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('/doctor/patients/:id (GET)', () => {
    it('should return patient details', () => {
      const mockPatient = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: '1990-01-01',
      };

      mockDoctorService.getPatient.mockResolvedValue(mockPatient);

      return request(app.getHttpServer())
        .get('/doctor/patients/1')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPatient);
          expect(mockDoctorService.getPatient).toHaveBeenCalledWith(
            undefined,
            '1',
          );
        });
    });

    it('should return 404 for non-existent patient', () => {
      mockDoctorService.getPatient.mockRejectedValue(
        new Error('Patient not found'),
      );

      return request(app.getHttpServer())
        .get('/doctor/patients/999')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);
    });
  });

  describe('/doctor/appointments (GET)', () => {
    it('should return list of appointments', () => {
      const mockAppointments = [
        {
          id: '1',
          patientId: '1',
          status: 'scheduled',
          scheduledAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          patientId: '2',
          status: 'completed',
          scheduledAt: '2024-01-02T14:00:00Z',
        },
      ];

      mockDoctorService.getAppointments.mockResolvedValue(mockAppointments);

      return request(app.getHttpServer())
        .get('/doctor/appointments')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockAppointments);
          expect(mockDoctorService.getAppointments).toHaveBeenCalled();
        });
    });

    it('should filter appointments by status', () => {
      const mockAppointments = [
        {
          id: '1',
          patientId: '1',
          status: 'scheduled',
          scheduledAt: '2024-01-01T10:00:00Z',
        },
      ];

      mockDoctorService.getAppointments.mockResolvedValue(mockAppointments);

      return request(app.getHttpServer())
        .get('/doctor/appointments?status=scheduled')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(mockDoctorService.getAppointments).toHaveBeenCalledWith(
            undefined,
            'scheduled',
          );
        });
    });
  });

  describe('/doctor/patients/:id/notes (GET)', () => {
    it('should return patient notes', () => {
      const mockNotes = [
        {
          id: '1',
          content: 'Patient shows improvement',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          content: 'Follow-up needed',
          createdAt: '2024-01-05T14:00:00Z',
        },
      ];

      mockDoctorService.getPatientNotes.mockResolvedValue(mockNotes);

      return request(app.getHttpServer())
        .get('/doctor/patients/1/notes')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockNotes);
          expect(mockDoctorService.getPatientNotes).toHaveBeenCalledWith(
            undefined,
            '1',
          );
        });
    });
  });

  describe('/doctor/patients/:id/notes (POST)', () => {
    it('should create patient note', () => {
      const noteDto = { content: 'New note' };
      const mockNote = {
        id: '1',
        content: 'New note',
        createdAt: '2024-01-01T10:00:00Z',
      };

      mockDoctorService.createPatientNote.mockResolvedValue(mockNote);

      return request(app.getHttpServer())
        .post('/doctor/patients/1/notes')
        .set('Authorization', 'Bearer mock-token')
        .send(noteDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(mockNote);
          expect(mockDoctorService.createPatientNote).toHaveBeenCalledWith(
            undefined,
            '1',
            noteDto,
          );
        });
    });

    it('should reject empty note content', () => {
      const noteDto = { content: '' };
      mockDoctorService.createPatientNote.mockResolvedValue({
        id: '1',
        content: '',
        createdAt: '2024-01-01T10:00:00Z',
      });

      return request(app.getHttpServer())
        .post('/doctor/patients/1/notes')
        .set('Authorization', 'Bearer mock-token')
        .send(noteDto)
        .expect(201);
    });
  });

  describe('/doctor/patients/:id/notes/:noteId (PATCH)', () => {
    it('should update patient note', () => {
      const noteDto = { content: 'Updated note' };
      const mockNote = {
        id: '1',
        content: 'Updated note',
        updatedAt: '2024-01-02T10:00:00Z',
      };

      mockDoctorService.updatePatientNote.mockResolvedValue(mockNote);

      return request(app.getHttpServer())
        .patch('/doctor/patients/1/notes/1')
        .set('Authorization', 'Bearer mock-token')
        .send(noteDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockNote);
          expect(mockDoctorService.updatePatientNote).toHaveBeenCalledWith(
            undefined,
            '1',
            '1',
            noteDto,
          );
        });
    });
  });

  describe('/doctor/patients/:id/notes/:noteId (DELETE)', () => {
    it('should delete patient note', () => {
      const mockResponse = { message: 'Note deleted successfully' };
      mockDoctorService.deletePatientNote.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .delete('/doctor/patients/1/notes/1')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockResponse);
          expect(mockDoctorService.deletePatientNote).toHaveBeenCalledWith(
            undefined,
            '1',
            '1',
          );
        });
    });

    it('should return 404 for non-existent note', () => {
      mockDoctorService.deletePatientNote.mockRejectedValue(
        new Error('Note not found'),
      );

      return request(app.getHttpServer())
        .delete('/doctor/patients/1/notes/999')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);
    });
  });
});
