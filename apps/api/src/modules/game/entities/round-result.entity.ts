import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { RoundEntity } from './round.entity';

@Entity({ name: 'round_result' })
@Index('idx_round_result_player', ['playerId'])
export class RoundResultEntity {
  @PrimaryColumn({ type: 'uuid' })
  roundId!: string;

  @PrimaryColumn({ type: 'uuid' })
  playerId!: string;

  @ManyToOne(() => RoundEntity, (round) => round.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roundId' })
  round!: RoundEntity;

  @Column({ type: 'int' })
  livesRemaining!: number;

  /** Letras intentadas en orden, separadas sin delimitador (ej. "abrtio") */
  @Column({ type: 'varchar', length: 64 })
  lettersGuessed!: string;

  @Column({ type: 'boolean', default: false })
  solved!: boolean;

  @Column({ type: 'bigint', nullable: true })
  solvedAtMs!: string | null;
}
