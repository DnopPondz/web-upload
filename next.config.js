/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // ❌ ปิด Strict Mode (แก้ bug react-beautiful-dnd)

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**", // ✅ อนุญาตทุก path ของ Cloudinary
      },
    ],
  },
}

module.exports = nextConfig
