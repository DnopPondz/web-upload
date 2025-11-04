import { useState, type FormEvent } from "react"
import Head from "next/head"
import Link from "next/link"
import type { GetServerSideProps, GetServerSidePropsContext, NextPage } from "next"
import clientPromise from "../../utils/mongodb"
import { getAuthenticatedUser, mapUserDocs } from "../../utils/session"
import type { GalleryUser } from "../../utils/types"
import {
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"

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
  const [tableError, setTableError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<GalleryUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editFolder, setEditFolder] = useState("")
  const [editRole, setEditRole] = useState<GalleryUser["role"]>("member")
  const [editPin, setEditPin] = useState("")
  const [editPinHint, setEditPinHint] = useState("")
  const [editAvatarPublicId, setEditAvatarPublicId] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null)

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

  const openEditDialog = (user: GalleryUser) => {
    setEditingUser(user)
    setEditDisplayName(user.displayName)
    setEditFolder(user.folder)
    setEditRole(user.role)
    setEditPin("")
    setEditPinHint(user.pinHint ?? "")
    setEditAvatarPublicId(user.avatarPublicId ?? "")
    setEditError(null)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingUser(null)
    setEditError(null)
  }

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser || isUpdatingUser) return

    const payload: Record<string, unknown> = {
      displayName: editDisplayName,
      folder: editFolder,
      role: editRole,
      pinHint: editPinHint,
      avatarPublicId: editAvatarPublicId,
    }

    const normalizedPin = editPin.trim()
    if (normalizedPin) {
      payload.pin = normalizedPin
    }

    setIsUpdatingUser(true)
    setEditError(null)

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(body?.error || "ไม่สามารถอัปเดตผู้ใช้ได้")
      }

      const updatedUser: GalleryUser | undefined = body?.user
      if (!updatedUser) {
        throw new Error("ไม่สามารถอ่านข้อมูลผู้ใช้ที่อัปเดตได้")
      }

      setUsers((previous) =>
        [...previous.map((u) => (u.id === updatedUser.id ? updatedUser : u))].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
        ),
      )

      setSuccessMessage(`อัปเดตผู้ใช้ ${updatedUser.displayName} เรียบร้อยแล้ว`)
      setTableError(null)
      closeEditDialog()
    } catch (updateError: any) {
      setEditError(updateError?.message || "ไม่สามารถอัปเดตผู้ใช้ได้")
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleDeleteUser = async (user: GalleryUser) => {
    if (isDeletingUserId || !user) return

    const confirmDelete = window.confirm(`ต้องการลบผู้ใช้ ${user.displayName} หรือไม่?`)
    if (!confirmDelete) return

    setIsDeletingUserId(user.id)
    setTableError(null)

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "ไม่สามารถลบผู้ใช้ได้")
      }

      setUsers((previous) => previous.filter((item) => item.id !== user.id))
      setSuccessMessage(`ลบผู้ใช้ ${user.displayName} เรียบร้อยแล้ว`)

      if (editingUser?.id === user.id) {
        closeEditDialog()
      }
    } catch (deleteError: any) {
      setTableError(deleteError?.message || "ไม่สามารถลบผู้ใช้ได้")
    } finally {
      setIsDeletingUserId(null)
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
            <div className="flex flex-col items-start text-left text-sm text-white/60 sm:items-end sm:text-right">
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

              {tableError && (
                <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
                  {tableError}
                </p>
              )}

              <div className="mt-6 hidden rounded-2xl border border-white/5 md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.25em] text-white/50">
                    <tr>
                      <th className="px-4 py-3">ชื่อ</th>
                      <th className="px-4 py-3">โฟลเดอร์</th>
                      <th className="px-4 py-3">สิทธิ์</th>
                      <th className="px-4 py-3">คำใบ้รหัส</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
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
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => openEditDialog(user)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-semibold text-white/80 transition hover:border-sky-400/60 hover:text-sky-100"
                              >
                                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                                แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                disabled={isDeletingUserId === user.id}
                                className="inline-flex items-center gap-2 rounded-full border border-red-400/40 px-3 py-1.5 font-semibold text-red-200 transition hover:border-red-300/60 hover:text-red-50 disabled:cursor-not-allowed disabled:border-red-400/30 disabled:text-red-200/60"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                {isDeletingUserId === user.id ? "กำลังลบ..." : "ลบ"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-white/60">
                            ยังไม่มีผู้ใช้ในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:hidden">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_15px_35px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-white">{user.displayName}</p>
                        <div className="space-y-1 text-xs text-white/60">
                          <p>
                            <span className="font-semibold text-white/70">โฟลเดอร์:</span> {user.folder}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="font-semibold text-white/70">สิทธิ์:</span>
                            <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
                              {user.role === "admin" ? "Admin" : "Member"}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-white/70">คำใบ้รหัส:</span> {user.pinHint || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-start gap-2 text-xs sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openEditDialog(user)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-semibold text-white/80 transition hover:border-sky-400/60 hover:text-sky-100"
                        >
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          disabled={isDeletingUserId === user.id}
                          className="inline-flex items-center gap-2 rounded-full border border-red-400/40 px-3 py-1.5 font-semibold text-red-200 transition hover:border-red-300/60 hover:text-red-50 disabled:cursor-not-allowed disabled:border-red-400/30 disabled:text-red-200/60"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          {isDeletingUserId === user.id ? "กำลังลบ..." : "ลบ"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/60">
                    ยังไม่มีผู้ใช้ในระบบ
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {isEditDialogOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b0f] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] sm:p-8">
            <button
              type="button"
              onClick={closeEditDialog}
              className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <span className="sr-only">ปิดหน้าต่างแก้ไข</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <h3 className="text-xl font-semibold text-white">แก้ไขข้อมูลผู้ใช้</h3>
            <p className="mt-2 text-sm text-white/60">
              ปรับปรุงข้อมูลของ {editingUser.displayName} โดยสามารถแก้ไขชื่อ โฟลเดอร์ สิทธิ์ และรีเซ็ตรหัส PIN ได้จากที่นี่
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleUpdateUser}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editDisplayName">
                  ชื่อที่แสดง
                </label>
                <input
                  id="editDisplayName"
                  type="text"
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editFolder">
                  โฟลเดอร์ใน Cloudinary
                </label>
                <input
                  id="editFolder"
                  type="text"
                  value={editFolder}
                  onChange={(event) => setEditFolder(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editRole">
                  สิทธิ์ของผู้ใช้
                </label>
                <select
                  id="editRole"
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as GalleryUser["role"])}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-0"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editPin">
                  รหัส PIN ใหม่ (ตัวเลข 4-10 หลัก)
                </label>
                <input
                  id="editPin"
                  type="password"
                  inputMode="numeric"
                  value={editPin}
                  onChange={(event) => setEditPin(event.target.value)}
                  minLength={4}
                  maxLength={10}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                  placeholder="ปล่อยว่างหากไม่ต้องการเปลี่ยน"
                />
                <p className="mt-1 text-xs text-white/40">หากปล่อยว่าง ระบบจะคงรหัส PIN เดิมไว้</p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editPinHint">
                  คำใบ้รหัส
                </label>
                <input
                  id="editPinHint"
                  type="text"
                  value={editPinHint}
                  onChange={(event) => setEditPinHint(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                  placeholder="คำใบ้ที่จะช่วยจำ PIN"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50" htmlFor="editAvatar">
                  รูปโปรไฟล์ (Cloudinary public ID)
                </label>
                <input
                  id="editAvatar"
                  type="text"
                  value={editAvatarPublicId}
                  onChange={(event) => setEditAvatarPublicId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-0"
                  placeholder="เช่น user/avatar"
                />
                <p className="mt-1 text-xs text-white/40">ปล่อยว่างเพื่อล้างรูปโปรไฟล์</p>
              </div>

              {editError && (
                <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">{editError}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="inline-flex items-center justify-center rounded-full border border-sky-400/60 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:text-sky-50 disabled:cursor-not-allowed disabled:border-sky-400/30 disabled:text-sky-200/60"
                >
                  {isUpdatingUser ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
