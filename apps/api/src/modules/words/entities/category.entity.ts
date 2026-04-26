import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'category' })
@Unique('uq_category_slug_locale', ['slug', 'locale'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  slug!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  icon!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'es-419' })
  locale!: string;

  @Column({ type: 'int', default: 0 })
  wordCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
