import { nanoid } from "nanoid";
import { HotelRepository } from "./hotel.repository";
import { UserService } from "../users/user.service";
import bcrypt from "bcrypt";
import { EmailService } from "../../core/utils/EmailService";
import { env } from "../../config/env";
import ms, { StringValue } from "ms";
import { SessionModel } from "../auth/session.model";
import { signToken } from "../../core/utils/jwt.helper";
import XLSX from 'xlsx';
import { UserRole } from "../../shared/enums";
import { UserDepartmentRole, UserDepartmentType } from "../../shared/enums/user";

export interface HotelAnalyticsDto {
    hotelId: string;
    hotelName: string;
    isActive?: boolean;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date;
    employeeCount: number;
    managerCount: number;
    attendanceSummary: {
        total: number;
        geoValidated: number;
        exceeds10Hours: number;
        insufficientRecovery: number;
    };
    complianceScore: number;
    certificationStatus: string;
    hiringEligibility: boolean;
    openJobs: number;
}

export class HotelService {
    private repo = new HotelRepository();
    private emailService = new EmailService();

    async login(email: string, password: string) {
        const hotel = await this.repo.findHotelByEmail(email);
        if (!hotel) {
            throw new Error("Invalid credentials");
        }

        const valid = await bcrypt.compare(password, hotel.passwordHash);
        // if (!valid) {
        //     throw new Error("Invalid credentials");
        // }


        const accessToken = signToken(
            { sub: hotel._id, roles: [hotel.authRole || 'HOTEL'] },
            env.JWT_SECRET,
            env.JWT_EXPIRES_IN as StringValue
        );

        const refreshToken = signToken(
            { sub: hotel._id },
            env.REFRESH_TOKEN_SECRET,
            env.REFRESH_TOKEN_EXPIRES_IN as StringValue
        );

        await SessionModel.create({
            id: `sess_${nanoid(8)}`,
            userId: (hotel._id as any).toString(),
            hotelId: (hotel._id as any).toString(),
            hashedRefreshToken: await bcrypt.hash(refreshToken, 10),
            expiresAt: new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRES_IN as StringValue))
        });

        return { accessToken, refreshToken, role: hotel.authRole || 'HOTEL' };
    }

    async createHotel(data: any) {
        const existingHotel = await this.repo.findHotelByPhone(data.phoneNumber);
        if (existingHotel) {
            throw new Error("Hotel with this phone number already exists");
        }

        data.password = 'hotel1234';
        const passwordHash = await bcrypt.hash(data.password, 10);

        const hotel = await this.repo.create({
            id: `hotel_${nanoid(8)}`,
            ...data,
            passwordHash,
        });

        return hotel;
    }

    async updateHotel(hotelId: string, data: any) {
        const hotel = await this.repo.findHotelById(hotelId);
        if (!hotel) {
            throw new Error("Hotel not found");
        }

        if (data.password) {
            data.passwordHash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }

        return this.repo.updateData(hotelId, data);
    }

    async setHotelStatus(hotelId: string, isActive: boolean) {
        const hotel = await this.repo.updateData(hotelId, { isActive });
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        return hotel;
    }

    async updateSubscription(hotelId: string, data: any) {
        const update: any = {};

        if (data.subscriptionPlan !== undefined) {
            update.subscriptionPlan = data.subscriptionPlan;
        }

        if (data.subscriptionStatus !== undefined) {
            update.subscriptionStatus = data.subscriptionStatus;
        }

        if (data.subscriptionExpiresAt !== undefined) {
            update.subscriptionExpiresAt = new Date(data.subscriptionExpiresAt);
        }

        const hotel = await this.repo.updateData(hotelId, update);
        if (!hotel) {
            throw new Error("Hotel not found");
        }

        return hotel;
    }

    async getHotelById(hotelId: string) {
        const hotel = await this.repo.findById(hotelId);
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        return hotel;
    }

    private userService = new UserService();

    private async resolveHotelObjectId(hotelId: string) {
        const hotel = await this.repo.findHotelById(hotelId);
        if (!hotel) {
            throw new Error('Hotel not found');
        }
        return hotel._id;
    }

    private isValidDepartmentRole(value: any): boolean {
        return value !== undefined && Object.values(UserDepartmentRole).includes(value);
    }

    private isValidDepartmentType(value: any): boolean {
        return value !== undefined && Object.values(UserDepartmentType).includes(value);
    }

    async getHotelAnalytics(hotelId: string): Promise<HotelAnalyticsDto> {
        const hotel = await this.repo.findById(hotelId);
        if (!hotel) {
            throw new Error("Hotel not found");
        }

        const [
            employeeCount,
            managerCount,
            attendanceSummary,
            complianceScore,
            openJobs,
        ] = await Promise.all([
            this.repo.countActiveEmployees(hotel),
            this.repo.countActiveManagers(hotel),
            this.repo.getAttendanceSummary(hotel),
            this.repo.getComplianceScore(hotel),
            this.repo.countOpenJobs(hotel),
        ]);

        return {
            hotelId: hotel.id,
            hotelName: hotel.name,
            isActive: hotel.isActive,
            subscriptionPlan: hotel.subscriptionPlan,
            subscriptionStatus: hotel.subscriptionStatus,
            subscriptionExpiresAt: hotel.subscriptionExpiresAt,
            employeeCount,
            managerCount,
            attendanceSummary,
            complianceScore,
            certificationStatus: hotel.initialPaymentDone ? 'Certified' : 'Not Certified',
            hiringEligibility: !!hotel.isActive && !hotel.isStriked && complianceScore >= 70,
            openJobs,
        };
    }

    private parseCsvToRows(buffer: Buffer): any[] {
        const text = buffer.toString('utf8').trim();
        if (!text) {
            return [];
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        const headers = lines[0].split(',').map((header) => header.trim());

        return lines.slice(1).map((line) => {
            const values = line.split(',').map((value) => value.trim());
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index] !== undefined ? values[index] : '';
            });
            return row;
        });
    }

    private parseExcelToRows(buffer: Buffer): any[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    private normalizeUserRow(row: any): any {
        const profile: any = {
            firstName: row.firstName || row.first_name || row['First Name'] || row['first name'],
            middleName: row.middleName || row.middle_name || row['Middle Name'] || row['middle name'],
            lastName: row.lastName || row.last_name || row['Last Name'] || row['last name'],
            dob: row.dob || row.dateOfBirth || row.date_of_birth || row['DOB'],
            gender: row.gender || row.Gender,
            location: {
                street: row.street || row.Street,
                city: row.city || row.City,
                state: row.state || row.State,
                country: row.country || row.Country,
                pinCode: row.pinCode || row.pincode || row['Pin Code'] || row['pin code'],
            },
            department: row.department || row.Department,
        };

        const normalized: any = {
            email: row.email || row.Email,
            phone: row.phone || row.Phone,
            whatsappNumber: row.whatsappNumber || row.whatsapp || row.WhatsApp,
            role: row.role || row.Role || UserRole.EMPLOYEE,
            profession: row.profession || row.Profession,
            availability: row.availability || row.Availability,
            previousVenues: row.previousVenues ? String(row.previousVenues).split(';').map((s: string) => s.trim()).filter(Boolean) : [],
            idType: row.idType || row.id_type || row['ID Type'],
            idNumber: row.idNumber || row.id_number || row['ID Number'],
            yearsOfExperience: row.yearsOfExperience || row.years_of_experience || row['Years Of Experience'],
            departmentType: row.departmentType || row.department_type || row['Department Type'],
            departmentRole: row.departmentRole || row.department_role || row['Department Role'],
            profile,
        };

        if (profile.dob) {
            const parsed = new Date(profile.dob);
            if (!isNaN(parsed.getTime())) {
                normalized.profile.dob = parsed;
            }
        }

        if (normalized.role && !Object.values(UserRole).includes(normalized.role as UserRole)) {
            normalized.role = UserRole.EMPLOYEE;
        }

        if (!this.isValidDepartmentRole(normalized.departmentRole)) {
            delete normalized.departmentRole;
        }

        if (!this.isValidDepartmentType(normalized.departmentType)) {
            delete normalized.departmentType;
        }

        return normalized;
    }

    async createHotelUsers(hotelId: string, payload: any) {
        const hotelObjectId = await this.resolveHotelObjectId(hotelId);
        const users = Array.isArray(payload) ? payload : [payload];
        const results: any[] = [];

        for (const rawUser of users) {
            try {
                const user = await this.userService.createUser({ ...rawUser, hotelId: hotelObjectId });
                results.push({ success: true, user });
            } catch (error: any) {
                results.push({ success: false, error: error.message, data: rawUser });
            }
        }

        return results;
    }

    async createHotelUsersFromFile(hotelId: string, file: Express.Multer.File) {
        const hotelObjectId = await this.resolveHotelObjectId(hotelId);

        if (!file || !file.buffer) {
            throw new Error('File upload is required');
        }

        const filename = file.originalname.toLowerCase();
        const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
        const isCsv = filename.endsWith('.csv') || file.mimetype.includes('csv');

        let rows: any[] = [];
        if (isExcel) {
            rows = this.parseExcelToRows(file.buffer);
        } else if (isCsv) {
            rows = this.parseCsvToRows(file.buffer);
        } else {
            throw new Error('Unsupported file type. Use CSV or Excel (.xlsx/.xls).');
        }

        if (!rows.length) {
            throw new Error('No data found in uploaded file');
        }

        const results = [];
        for (const rawRow of rows) {
            const userPayload = this.normalizeUserRow(rawRow);
            try {
                const user = await this.userService.createUser({ ...userPayload, hotelId: hotelObjectId });
                results.push({ success: true, user });
            } catch (error: any) {
                results.push({ success: false, error: error.message, data: userPayload });
            }
        }

        return results;
    }

    async promoteHotelUser(hotelId: string, userId: string, data: any) {
        if (!data || !data.role) {
            throw new Error('Target role is required');
        }

        if (!Object.values(UserRole).includes(data.role as UserRole)) {
            throw new Error('Invalid role specified');
        }

        const user = await this.userService.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const update: any = { role: data.role };
        if (data.departmentRole) {
            update.departmentRole = data.departmentRole;
        }
        if (data.departmentType) {
            update.departmentType = data.departmentType;
        }

        return this.userService.updateUser(userId, update);
    }

    async strikeHotel(hotelId: string, reason?: string, strikedBy?: string) {
        const hotel = await this.repo.updateData(hotelId, {
            isStriked: true,
            ...(reason && { strikeReason: reason }),
            strikedAt: new Date(),
            ...(strikedBy && { strikedBy }),
        });
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        return hotel;
    }

    async unstrikeHotel(hotelId: string) {
        const hotel = await this.repo.updateData(hotelId, {
            isStriked: false,
            strikeReason: undefined,
            strikedAt: undefined,
            strikedBy: undefined,
        });
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        return hotel;
    }

    async deleteHotel(hotelId: string) {
        const hotel = await this.repo.delete(hotelId);
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        return hotel;
    }

    async getHotels(options: any) {
        return this.repo.findAll(options);
    }

    async sendCredentialsToHotel(hotelId: string) {
        const hotel = await this.repo.findHotelById(hotelId);
        if (!hotel) {
            throw new Error("Hotel not found");
        }
        if (!hotel.email || !hotel.password || !hotel.name) {
            throw new Error("Hotel data is incomplete");
        }
        await EmailService.sendCredentialsEmail(hotel.email, hotel.password, hotel.name, 'hotel');
        return true;
    }
}
