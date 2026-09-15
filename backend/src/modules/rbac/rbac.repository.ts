import { RBACPermissionModel } from './rbac.model';
import { IRBACPermission } from '../../shared/interfaces/rbac.d';
import { UserRole, UserDepartmentType, UserDepartmentRole } from '../../shared/enums/user';
import { Permission, ResourceType } from '../../shared/enums/rbac';

export class RBACRepository {
  /**
   * Create a new permission
   */
  async create(permission: Partial<IRBACPermission>): Promise<IRBACPermission> {
    const newPermission = new RBACPermissionModel(permission);
    return await newPermission.save();
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<IRBACPermission | null> {
    return await RBACPermissionModel.findById(id);
  }

  /**
   * Find permission with custom query
   */
  async findOne(query: any): Promise<IRBACPermission | null> {
    return await RBACPermissionModel.findOne(query);
  }

  /**
   * Find multiple permissions
   */
  async find(query: any): Promise<IRBACPermission[]> {
    return await RBACPermissionModel.find(query);
  }

  /**
   * Update permission
   */
  async update(id: string, data: Partial<IRBACPermission>): Promise<IRBACPermission | null> {
    return await RBACPermissionModel.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete permission
   */
  async delete(id: string): Promise<boolean> {
    const result = await RBACPermissionModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Find all by hotel
   */
  async findByHotel(hotelId: string): Promise<IRBACPermission[]> {
    return await RBACPermissionModel.find({ hotelId });
  }

  /**
   * Count permissions
   */
  async count(query: any): Promise<number> {
    return await RBACPermissionModel.countDocuments(query);
  }

  /**
   * Bulk insert
   */
  async insertMany(permissions: Partial<IRBACPermission>[]): Promise<IRBACPermission[]> {
    const createdDocs = await RBACPermissionModel.insertMany(permissions);
    return createdDocs.map((doc) => (doc.toObject ? doc.toObject() : doc) as IRBACPermission);
  }

  /**
   * Delete by query
   */
  async deleteMany(query: any): Promise<number> {
    const result = await RBACPermissionModel.deleteMany(query);
    return result.deletedCount;
  }
}

export default new RBACRepository();
