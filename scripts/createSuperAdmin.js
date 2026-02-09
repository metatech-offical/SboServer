"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const admin_schema_1 = __importDefault(require("../src/models/admin/admin.schema"));
const admin_types_1 = require("../src/models/admin/admin.types");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
function createSuperAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        const MONGODB_URI = process.env.MONGODB_URI;
        try {
            if (!MONGODB_URI || MONGODB_URI === '' || MONGODB_URI === 'undefined') {
                throw new Error('MONGO_DB_CONNECTION_STRING is not set');
            }
            // Connect to MongoDB
            yield mongoose_1.default.connect(MONGODB_URI);
            console.log('Connected to MongoDB');
            // Check if super admin already exists
            const existingSuperAdmin = yield admin_schema_1.default.findOne({ role: admin_types_1.AdminRole.SUPER_ADMIN });
            if (existingSuperAdmin) {
                console.log('Super admin already exists:');
                console.log('Email:', existingSuperAdmin.email);
                console.log('Name:', existingSuperAdmin.name);
                console.log('\nPlease use this account to login or delete it from the database first.');
                process.exit(0);
            }
            // Create super admin
            const superAdmin = yield admin_schema_1.default.create({
                name: 'Super Admin',
                email: 'admin@sbo.com',
                password: 'admin123456', // Will be hashed automatically
                role: admin_types_1.AdminRole.SUPER_ADMIN,
                status: admin_types_1.AdminStatus.ACTIVE,
            });
            console.log('\n✅ Super Admin created successfully!');
            console.log('\nLogin credentials:');
            console.log('Email:', superAdmin.email);
            console.log('Password: admin123456');
            console.log('\n⚠️  Please change the password after first login!');
        }
        catch (error) {
            console.error('Error creating super admin:', error);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log('\nDisconnected from MongoDB');
        }
    });
}
createSuperAdmin();
