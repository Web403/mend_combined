import { IUser } from "../../shared/interfaces";
import { UserRepository } from "./user.repository";
import { UserListOptions } from "../../shared/interfaces/user.d";
import bcrypt from "bcrypt";
import { nanoid } from 'nanoid';
import { UserRole } from '../../shared/enums';
import { EmailService } from "../../core/utils/EmailService";
import mongoose from "mongoose";
import { HotelModel } from "../hotel/hotel.model";

export class UserService {
    private repo = new UserRepository();

    private async resolveHotelId(hotelId?: string) {
        if (!hotelId) {
            return undefined;
        }

        if (mongoose.isValidObjectId(hotelId)) {
            return hotelId;
        }

        const hotel = await HotelModel.findOne({ id: hotelId }).select('_id').lean();
        if (!hotel) {
            throw new Error('Hotel not found');
        }

        return hotel._id;
    }

    async createUser(data: any) {
        const existing = await this.repo.findUserByEmail(data.email);
        if (existing) {
            throw new Error('Email already in use');
        }

        data.password = "user1234";
        const hotelId = await this.resolveHotelId(data.hotelId);

        const passwordHash = await bcrypt.hash(data.password, 10);

        const user = await this.repo.create({
            id: `user_${nanoid(8)}`,
            hotelId,
            email: data.email,
            passwordHash,
            password: data.password,
            role: data.role || UserRole.EMPLOYEE,
            profile: data.profile,
            phone: data.phone,
            whatsappNumber: data.whatsappNumber,   // fix: was missing — whatsapp number never saved
            profession: data.profession,
            availability: data.availability,
            previousVenues: data.previousVenues,
            idType: data.idType,
            idNumber: data.idNumber,
            yearsOfExperience: data.yearsOfExperience,
            departmentType: data.departmentType,
            departmentRole: data.departmentRole,
        } as IUser);

        return user;
    }

    async updateUser(userId: string, data: any) {
        const user = await this.repo.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (data.password) {
            data.passwordHash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }

        return this.repo.updateUser(userId, data);
    }

    async suspendUser(userId: string) {
        const user = await this.repo.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return this.repo.suspendUser(userId);
    }

    async deleteUser(userId: string) {
        return this.repo.deleteUser(userId);
    }

    async getUserById(userId: string) {
        return this.repo.findUserById(userId);
    }

    async getUsersWithPagination(options: UserListOptions = {}) {
        const hotelId = await this.resolveHotelId(options.filters?.hotelId);
        return this.repo.getUsersWithPagination({
            ...options,
            filters: {
                ...options.filters,
                ...(hotelId && { hotelId: String(hotelId) }),
            },
        });
    }

    async sendCredentialsToUser(userId: string) {
        const user = await this.repo.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (!user.email || !user.password || !user.profile?.firstName) {
            throw new Error("User data is incomplete");
        }
        await EmailService.sendCredentialsEmail(user.email, user.password, user.profile.firstName, 'user');
        return true;

    }

    async getUsersPerformance(hotelId?: string) {
        const resolvedHotelId = await this.resolveHotelId(hotelId);
        return this.repo.getUsersPerformance(resolvedHotelId ? String(resolvedHotelId) : undefined);
    }

    async getUserWorkSummary(userId: string) {
        const user = await this.repo.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        return this.repo.getUserWorkSummary(new mongoose.Types.ObjectId(userId));
    }
}
