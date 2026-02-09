import mongoose from 'mongoose';
import AdminModel from '../src/models/admin/admin.schema';
import { AdminRole, AdminStatus } from '../src/models/admin/admin.types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();


async function createSuperAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI
  try {
    if (!MONGODB_URI || MONGODB_URI === '' || MONGODB_URI === 'undefined') {
      throw new Error('MONGO_DB_CONNECTION_STRING is not set');
    }
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await AdminModel.findOne({ role: AdminRole.SUPER_ADMIN });

    if (existingSuperAdmin) {
      console.log('Super admin already exists:');
      console.log('Email:', existingSuperAdmin.email);
      console.log('Name:', existingSuperAdmin.name);
      console.log('\nPlease use this account to login or delete it from the database first.');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await AdminModel.create({
      name: 'Super Admin',
      email: 'admin@sbo.com',
      password: 'admin123456', // Will be hashed automatically
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email:', superAdmin.email);
    console.log('Password: admin123456');
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createSuperAdmin();
