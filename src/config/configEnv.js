import dotenv from 'dotenv';

dotenv.config();

class ConfigService {
  // Khai báo private static instance
  static #instance;

  // Khai báo các private fields
  #mongoUri;
  #jwtSecret;
  #cloudinaryCloudName;
  #cloudinaryApiKey;
  #cloudinaryApiSecret;

  constructor() {
    // Ngăn chặn việc khởi tạo trực tiếp bằng từ khóa 'new' từ bên ngoài
    if (ConfigService.#instance) {
      throw new Error('Use ConfigService.getInstance() instead of new.');
    }

    this.#mongoUri = this.#get('MONGO_URI', 'mongodb://localhost:27017/taskmanager');
    this.#jwtSecret = this.#get('JWT_SECRET', 'your-secret-key');
    this.#cloudinaryCloudName = this.#get('CLOUDINARY_CLOUD_NAME', '');
    this.#cloudinaryApiKey = this.#get('CLOUDINARY_API_KEY', '');
    this.#cloudinaryApiSecret = this.#get('CLOUDINARY_API_SECRET', '');
  }

  static getInstance() {
    if (!ConfigService.#instance) {
      ConfigService.#instance = new ConfigService();
    }
    return ConfigService.#instance;
  }

  // Phương thức private để lấy giá trị từ môi trường
  #get(key, defaultValue = '') {
    const value = process.env[key];
    return value ?? defaultValue;
  }

  // Getters
  get MONGO_URI() {
    return this.#mongoUri;
  }

  get JWT_SECRET() {
    return this.#jwtSecret;
  }

  get CLOUDINARY_CLOUD_NAME() {
    return this.#cloudinaryCloudName;
  }

  get CLOUDINARY_API_KEY() {
    return this.#cloudinaryApiKey;
  }

  get CLOUDINARY_API_SECRET() {
    return this.#cloudinaryApiSecret;
  }
}

// Xuất ra một instance duy nhất (Singleton)
export const config = ConfigService.getInstance();
