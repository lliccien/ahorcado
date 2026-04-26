import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { GameSessionEntity } from '../../sessions/entities/game-session.entity';
import { RoundResultEntity } from './round-result.entity';

@Entity({ name: 'round' })
@Unique('uq_round_session_number', ['sessionId', 'roundNumber'])
export class RoundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => GameSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: GameSessionEntity;

  @Column({ type: 'int' })
  roundNumber!: number;

  /** Snapshot de la palabra usada (no FK para que sea inmune a re-seeds) */
  @Column({ type: 'varchar', length: 64 })
  wordText!: string;

  @Column({ type: 'varchar', length: 64 })
  wordDisplay!: string;

  @Column({ type: 'varchar', length: 32 })
  categorySlug!: string;

  @Column({ type: 'uuid', nullable: true })
  winnerPlayerId!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => RoundResultEntity, (rr) => rr.round, {
    cascade: ['insert'],
  })
  results!: RoundResultEntity[];
}
