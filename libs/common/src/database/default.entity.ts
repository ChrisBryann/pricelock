import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";

export abstract class DefaultEntity {
    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
      })
      createdAt: Date;
    
      @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
      })
      updatedAt: Date;
    
      @DeleteDateColumn({
        type: 'timestamp',
        default: null, // cannot have a default value since it will cause postgres to assume it has been deleted
        onUpdate: 'CURRENT_TIMESTAMP(6)',
      })
      deletedAt: Date;
}