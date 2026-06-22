import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";

/**
 * Row Level Security (RLS) Service
 * Sets PostgreSQL session variables for RLS policies
 */
@Injectable()
export class RlsService {
  /**
   * Set admin context - bypasses all RLS policies
   */
  async setAdminContext(manager: EntityManager): Promise<void> {
    await manager.query("SELECT set_config('app.is_admin', 'true', true)");
  }

  /**
   * Set doctor context - allows access to linked patients
   */
  async setDoctorContext(
    manager: EntityManager,
    doctorId: string,
  ): Promise<void> {
    await manager.query("SELECT set_config('app.doctor_id', $1, true)", [
      doctorId,
    ]);
  }

  /**
   * Set patient context - allows access to own data only
   */
  async setPatientContext(
    manager: EntityManager,
    patientId: string,
  ): Promise<void> {
    await manager.query("SELECT set_config('app.patient_id', $1, true)", [
      patientId,
    ]);
  }

  /**
   * Clear all RLS context
   */
  async clearContext(manager: EntityManager): Promise<void> {
    await manager.query("SELECT set_config('app.is_admin', '', true)");
    await manager.query("SELECT set_config('app.doctor_id', '', true)");
    await manager.query("SELECT set_config('app.patient_id', '', true)");
  }

  /**
   * Execute a function within admin RLS context
   */
  async withAdminContext<T>(
    manager: EntityManager,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await this.setAdminContext(manager);
    try {
      return await fn(manager);
    } finally {
      await this.clearContext(manager);
    }
  }

  /**
   * Execute a function within doctor RLS context
   */
  async withDoctorContext<T>(
    manager: EntityManager,
    doctorId: string,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await this.setDoctorContext(manager, doctorId);
    try {
      return await fn(manager);
    } finally {
      await this.clearContext(manager);
    }
  }

  /**
   * Execute a function within patient RLS context
   */
  async withPatientContext<T>(
    manager: EntityManager,
    patientId: string,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await this.setPatientContext(manager, patientId);
    try {
      return await fn(manager);
    } finally {
      await this.clearContext(manager);
    }
  }
}
