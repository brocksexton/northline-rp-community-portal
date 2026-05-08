export const DATA_DELETION_CONFIRMATION = 'DELETE MY NORTHLINE DATA';
export type PrivacyRequestType = 'export' | 'deletion';
export type PrivacyRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type PrivacyRequest = {
  id: string;
  type: PrivacyRequestType;
  steamId: string;
  displayName: string;
  status: PrivacyRequestStatus;
  requestedAt: string;
  updatedAt: string;
  processedBySteamId?: string | null;
  processedByName?: string | null;
  staffNote?: string;
  userNote?: string;
  acknowledgements?: Record<string, boolean>;
};
