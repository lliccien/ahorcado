import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SessionStatus } from '@ahorcado/shared';

import { PlayerEntity } from './player.entity';

@Entity({ name: 'game_session' })
export class GameSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 6 })
  code!: string;

  @Column({ type: 'uuid' })
  hostPlayerId!: string;

  @Column({ type: 'varchar', length: 32 })
  categorySlug!: string;

  @Column({ type: 'varchar', length: 16, default: 'es-419' })
  locale!: string;

  @Column({ type: 'int' })
  totalRounds!: number;

  @Column({ type: 'int', default: 0 })
  currentRound!: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.LOBBY,
  })
  status!: SessionStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  winnerPlayerId!: string | null;

  @OneToMany(() => PlayerEntity, (player) => player.session, {
    cascade: ['insert', 'update'],
  })
  players!: PlayerEntity[];
}
