const mongoose = require('mongoose');

const { Schema } = mongoose;

const AUDIT_ACTIONS = Object.freeze({
  AUTO_LOCK: 'AUTO_LOCK',
  HOST_CLAIM: 'HOST_CLAIM',
  HANDOFF_REQUEST: 'HANDOFF_REQUEST',
  HANDOFF_APPROVED: 'HANDOFF_APPROVED',
  HANDOFF_REJECTED: 'HANDOFF_REJECTED',
  STALE_AUTO_RELEASE: 'STALE_AUTO_RELEASE',
  SETTLE_AUTO_CLOSE: 'SETTLE_AUTO_CLOSE',
  STAFF_OVERRIDE: 'STAFF_OVERRIDE',
  ACCESS_REQUESTED: 'ACCESS_REQUESTED',
  CO_ORDERER_APPROVED: 'CO_ORDERER_APPROVED',
  CO_ORDERER_DENIED: 'CO_ORDERER_DENIED',
  HOST_PROMOTED: 'HOST_PROMOTED',
});

const tableSessionAuditSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'TableSession',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true,
    },
    actorPhone: {
      type: String,
      default: '',
    },
    actorName: {
      type: String,
      default: '',
    },
    targetHostPhone: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

tableSessionAuditSchema.index({ restaurant: 1, table: 1, createdAt: -1 });

const TableSessionAuditModel = mongoose.model('TableSessionAudit', tableSessionAuditSchema);
TableSessionAuditModel.AUDIT_ACTIONS = AUDIT_ACTIONS;

module.exports = TableSessionAuditModel;
