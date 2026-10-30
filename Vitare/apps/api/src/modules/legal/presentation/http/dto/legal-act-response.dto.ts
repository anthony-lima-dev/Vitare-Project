export class LegalActResponseDto {
  id: string;
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: string;
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: string;
  origin: string;
  ipHash: string | null;
  recordedAt: Date;

  constructor(record: LegalActRecordDto) {
    this.id = record.id;
    this.actorId = record.actorId;
    this.actorRole = record.actorRole;
    this.holderId = record.holderId;
    this.actType = record.actType;
    this.documentVersion = record.documentVersion;
    this.contentHash = record.contentHash;
    this.purpose = record.purpose;
    this.legalBasis = record.legalBasis;
    this.origin = record.origin;
    this.ipHash = record.ipHash;
    this.recordedAt = record.recordedAt;
  }
}

interface LegalActRecordDto {
  id: string;
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: string;
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: string;
  origin: string;
  ipHash: string | null;
  recordedAt: Date;
}
