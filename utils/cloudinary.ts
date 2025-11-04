import { v2 as cloudinary } from "cloudinary";

const configuredCloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

cloudinary.config({
  cloud_name: configuredCloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { configuredCloudName };

export default cloudinary;
