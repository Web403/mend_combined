export interface ISession {
  id: string;
  userId: string;
  hotelId: string;
  hashedRefreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}