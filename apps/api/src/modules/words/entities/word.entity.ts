import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { WordDifficulty } from '@ahorcado/shared';

import { CategoryEntity } from './category.entity';

@Entity({ name: 'word' })
@Unique('uq_word_category_text_locale', ['categoryId', 'text', 'locale'])
@Index('idx_word_category_locale_difficulty', ['categoryId', 'locale', 'difficulty'])
export class WordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: CategoryEntity;

  /** Texto normalizado (sin acentos, minúsculas) que usa el matching */
  @Column({ type: 'varchar', length: 64 })
  text!: string;

  /** Texto a mostrar al jugador (con acentos / mayúsculas correctas) */
  @Column({ type: 'varchar', length: 64 })
  display!: string;

  @Column({
    type: 'enum',
    enum: WordDifficulty,
    default: WordDifficulty.MEDIUM,
  })
  difficulty!: WordDifficulty;

  @Column({ type: 'int' })
  length!: number;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'es-419' })
  locale!: string;
}
