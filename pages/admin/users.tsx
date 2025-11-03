import { useState, type FormEvent } from "react"
import Head from "next/head"
import Link from "next/link"
import type { GetServerSideProps, GetServerSidePropsContext, NextPage } from "next"
import clientPromise from "../../utils/mongodb"
import { getAuthenticatedUser, mapUserDocs } from "../../utils/session"
import type { GalleryUser } from "../../utils/types"

interface AdminUsersPageProps {
  activeUser: GalleryUser
  users: GalleryUser[]
}

const AdminUsersPage: NextPage<AdminUsersPageProps> = ({ activeUser, users: initialUsers }) => {
  const [users, setUsers] = useState(initialUsers)
  const [displayName, setDisplayName] = useState("")
  const [folder, setFolder] = useState("")
  const [pin, setPin] = useState("")
  const [pinHint, setPinHint] = useState("")
  const [avatarPublicId, setAvatarPublicId] = useState("")
  const [role, setRole] = useState<GalleryUser["role"]>("member")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          folder,
          pin,
          pinHint: pinHint || undefined,
          avatarPublicId: avatarPublicId || undefined,
          role,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "เกิดข้อผิดพลาดในการสร้างผู้ใช้")
      }

      const newUser: GalleryUser | undefined = payload?.user
      if (!newUser) {
        throw new Error("ไม่สามารถอ่านข้อมูลผู้ใช้ใหม่ได้")
      }

      setUsers((prev) =>
        [...prev, newUser].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
        ),
      )

      setDisplayName("")
      setFolder("")
      setPin("")
      setPinHint("")
      setAvatarPublicId("")
      setRole("member")
      setSuccessMessage(`สร้างผู้ใช้ ${newUser.displayName} เรียบร้อยแล้ว`)
    } catch (submissionError: any) {
      setError(submissionError?.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>จัดการผู้ใช้ | Gallery Admin</title>
      </Head>
      <main className="min-h-screen bg-[#050505] px-4 py-12 text-white">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Admin</p>
              <h1 className="mt-2 text-3xl font-semibold">จัดการผู้ใช้</h1>
              <p className="mt-2 text-sm text-white/70">
                สร้างผู้ใช้ใหม่และตรวจสอบสิทธิ์การเข้าถึงสำหรับแกลเลอรี
              </p>
            </div>
            <div className="flex flex-col items-end text-right text-sm text-white/60">
              <span className="font-semibold text-white/80">{activeUser.displayName}</span>
              <span className="text-xs uppercase tracking-[0.25em] text-sky-300">Admin</span>
              <Link
                href="/"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                กลับสู่แกลเลอรี
              </Link>
            </div>
          </div>

          <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              <h2 className="text-lg font-semibold text-white">สร้างผู้ใช้ใหม่</h2>
              <p className="mt-2 text-xs text-white/60">
                กำหนดข้อมูลพื้นฐานเพื่อเพิ่มผู้ใช้เข้าสู่ระบบ
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="displayName">
                    ชื่อที่แสดง
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                    placeholder="เช่น Pond"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="folder">
                    โฟลเดอร์ใน Cloudinary
                  </label>
                  <input
                    id="folder"
                    type="text"
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                    placeholder="เช่น pond_gallery"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="pin">
                    รหัส PIN (4-10 หลัก)
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    required
                    minLength={4}
                    maxLength={10}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                    placeholder="เช่น 1234"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="pinHint">
                    คำใบ้รหัส (ไม่บังคับ)
                  </label>
                  <input
                    id="pinHint"
                    type="text"
                    value={pinHint}
                    onChange={(event) => setPinHint(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                    placeholder="คำใบ้ที่จะช่วยจำ PIN"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="avatar">
                    รูปโปรไฟล์ (Cloudinary public ID)
                  </label>
                  <input
                    id="avatar"
                    type="text"
                    value={avatarPublicId}
                    onChange={(event) => setAvatarPublicId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                    placeholder="เช่น user/avatar"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="role">
                    สิทธิ์ของผู้ใช้
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as GalleryUser["role"])}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-0"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>
                )}
                {successMessage && (
                  <p className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                    {successMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full border border-sky-400/60 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:text-sky-50 disabled:cursor-not-allowed disabled:border-sky-400/30 disabled:text-sky-200/60"
                >
                  {isSubmitting ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.01] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              <h2 className="text-lg font-semibold text-white">ผู้ใช้ทั้งหมด</h2>
              <p className="mt-2 text-xs text-white/60">มีทั้งหมด {users.length} ผู้ใช้</p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.25em] text-white/50">
                    <tr>
                      <th className="px-4 py-3">ชื่อ</th>
                      <th className="px-4 py-3">โฟลเดอร์</th>
                      <th className="px-4 py-3">สิทธิ์</th>
                      <th className="px-4 py-3">คำใบ้รหัส</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/40">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.08]">
                        <td className="px-4 py-3 font-medium text-white">{user.displayName}</td>
                        <td className="px-4 py-3 text-white/70">{user.folder}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                            {user.role === "admin" ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/50">{user.pinHint || "-"}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-white/60">
                          ยังไม่มีผู้ใช้ในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<AdminUsersPageProps> = async (
  context: GetServerSidePropsContext,
) => {
  const activeUser = await getAuthenticatedUser(context.req as any)

  if (!activeUser || activeUser.role !== "admin") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    }
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "img-detail")
  const collection = db.collection("galleryUsers")

  const userDocs = await collection
    .find(
      {},
      {
        projection: {
          displayName: 1,
          folder: 1,
          avatarPublicId: 1,
          pinHint: 1,
          role: 1,
        },
      },
    )
    .sort({ displayName: 1 })
    .toArray()

  return {
    props: {
      activeUser,
      users: mapUserDocs(userDocs),
    },
  }
}

export default AdminUsersPage
