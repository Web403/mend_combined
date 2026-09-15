export interface JWTPayload {
    id: string;
    authRole: 'USER' | 'HOTEL';
    hotelId?: string,
    departmentType?: string;
    departmentRole?: string;
}