import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { GameSessionEntity } from './game-session.entity';

@Entity({ name: 'player' })
@Unique('uq_player_session_name', ['sessionId', 'name'])
export class PlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => GameSessionEntity, (session) => session.players, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session!: GameSessionEntity;

  @Column({ type: 'varchar', length: 20 })
  name!: string;

  @Column({ type: 'boolean', default: false })
  isHost!: boolean;

  @CreateDateColumn()
  joinedAt!: Date;
}
