export type GeneratedCheckinToken = {
  tokenId: string;
  expiresAt: string;
  qrPayload: string;
};

export type CheckinResult = {
  success: true;
  alreadyCheckedIn: boolean;
  checkinId: string;
  xpAwarded: number;
};
