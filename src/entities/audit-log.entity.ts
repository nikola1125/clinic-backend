import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @PrimaryColumn({ type: 'timestamptz' })
  ts: Date;

  @Column({ type: 'text', nullable: false, name: 'request_id' })
  requestId: string;

  @Column({ type: 'text', nullable: true, name: 'actor_sub' })
  actorSub: string | null;

  @Column({ type: 'text', nullable: true, name: 'actor_role' })
  actorRole: string | null;

  @Column({ type: 'text', nullable: false })
  action: string;

  @Column({ type: 'text', nullable: false })
  resource: string;

  @Column({ type: 'text', nullable: true, name: 'resource_id' })
  resourceId: string | null;

  @Column({ type: 'text', nullable: false })
  method: string;

  @Column({ type: 'text', nullable: false })
  path: string;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;
}
