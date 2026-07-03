export type AdminDataRequestStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

export type AdminDataRequestType =
  | 'ACCESS'
  | 'CORRECTION'
  | 'DELETION'
  | 'ANONYMIZATION'
  | 'CONSENT_REVOCATION'
  | 'OTHER';

export interface AdminDataRequestSummary {
  id: string;
  userSubject: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  type: AdminDataRequestType;
  status: AdminDataRequestStatus;
  details: string | null;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface AdminDataRequestUpdate {
  status: AdminDataRequestStatus;
  resolutionNote?: string;
}

export interface AdminDataRequestFilters {
  status?: AdminDataRequestStatus;
  type?: AdminDataRequestType;
  page?: number;
  size?: number;
}
