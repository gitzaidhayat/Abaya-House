import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'login',
        'logout',
        'status_change',
        'role_change',
        'ban',
        'unban',
      ],
    },
    entity: {
      type: String,
      required: true,
      enum: ['user', 'product', 'category', 'order', 'coupon', 'banner', 'review'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
