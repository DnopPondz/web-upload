"use client"

import { TrashIcon } from "@heroicons/react/24/outline"
import type { GetServerSidePropsContext, NextPage } from "next"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type FormEvent,
} from "react"
import Bridge from "../components/Icons/Bridge"
import Modal from "../components/Modal"
import cloudinary from "../utils/cloudinary"
import getBase64ImageUrl from "../utils/generateBlurPlaceholder"
import { clearSessionCookie, getAuthenticatedUser, mapUserDocs, SESSION_COOKIE_NAME } from "../utils/session"
import type { GalleryUser, ImageProps } from "../utils/types"
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto"

type HomeProps = {
  images: ImageProps[]
  users: GalleryUser[]
  activeUser: GalleryUser | null
}

const Home: NextPage<HomeProps> = ({ images, users, activeUser }) => {
  const router = useRouter()
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto()

  const [imageData, setImageData] = useState(images)
  const [albumFilter, setAlbumFilter] = useState<string>("__all__")
  const [editingImageId, setEditingImageId] = useState<number | null>(null)
  const [editAlbum, setEditAlbum] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [savingImageId, setSavingImageId] = useState<number | null>(null)
  const [metadataStatus, setMetadataStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null)

  const [activeUserState, setActiveUserState] = useState<GalleryUser | null>(activeUser)
  const [isSelectorOpen, setIsSelectorOpen] = useState(!activeUser)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pinInputRef = useRef<HTMLInputElement | null>(null)
  const [isResetPinDialogOpen, setIsResetPinDialogOpen] = useState(false)
  const [currentPinValue, setCurrentPinValue] = useState("")
  const [newPinValue, setNewPinValue] = useState("")
  const [confirmPinValue, setConfirmPinValue] = useState("")
  const [pinHintValue, setPinHintValue] = useState(activeUser?.pinHint ?? "")
  const [resetPinError, setResetPinError] = useState<string | null>(null)
  const [resetPinSuccess, setResetPinSuccess] = useState<string | null>(null)
  const [isResettingPin, setIsResettingPin] = useState(false)

  useEffect(() => {
    setImageData(images)
  }, [images])

  useEffect(() => {
    setActiveUserState(activeUser)
    setPinHintValue(activeUser?.pinHint ?? "")
    if (!activeUser) {
      setIsResetPinDialogOpen(false)
      setCurrentPinValue("")
      setNewPinValue("")
      setConfirmPinValue("")
      setResetPinError(null)
      setResetPinSuccess(null)
    }
  }, [activeUser])

  useEffect(() => {
    setIsSelectorOpen(!activeUser)
    if (!activeUser) {
      setSelectedUserId(null)
      setPinInput("")
      setPinError(null)
    }
  }, [activeUser])

  useEffect(() => {
    setAlbumFilter("__all__")
    setEditMode(false)
    setDeleteTarget(null)
  }, [activeUser])

  useEffect(() => {
    if (!isSelectorOpen) {
      setPinInput("")
      setPinError(null)
    }
  }, [isSelectorOpen])

  useEffect(() => {
    if (isSelectorOpen && users.length === 1 && !selectedUserId) {
      setSelectedUserId(users[0].id)
    }
  }, [isSelectorOpen, users, selectedUserId])

  const sizePresets = {
    small: { label: "เล็ก", width: 480, height: 320 },
    medium: { label: "กลาง", width: 720, height: 480 },
    large: { label: "ใหญ่", width: 960, height: 640 },
  } as const

  type ThumbSizeKey = keyof typeof sizePresets

  type LayoutKey = "row" | "grid" | "flex" | "random"

  const layoutSizeClasses: Record<
    LayoutKey,
    {
      container: Record<ThumbSizeKey, string>
      card: Record<ThumbSizeKey, string>
    }
  > = {
    grid: {
      container: {
        small:
          "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        medium: "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3",
        large: "grid grid-cols-1 gap-6 sm:grid-cols-1 xl:grid-cols-2",
      },
      card: {
        small: "w-full",
        medium: "w-full",
        large: "w-full",
      },
    },
    flex: {
      container: {
        small: "flex flex-wrap gap-6",
        medium: "flex flex-wrap gap-6",
        large: "flex flex-wrap gap-6",
      },
      card: {
        small: "w-full sm:w-[calc(50%-12px)] xl:w-[calc(25%-18px)] 2xl:w-[calc(20%-19px)]",
        medium: "w-full sm:w-[calc(50%-12px)] xl:w-[calc(33.333%-16px)]",
        large: "w-full sm:w-[calc(66.666%-16px)] xl:w-[calc(50%-18px)]",
      },
    },
    row: {
      container: {
        small: "flex flex-col gap-6",
        medium: "flex flex-col gap-6",
        large: "flex flex-col gap-6",
      },
      card: {
        small: "w-full",
        medium: "w-full",
        large: "w-full",
      },
    },
    random: {
      container: {
        small: "columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 [column-fill:_balance]",
        medium: "columns-1 gap-6 sm:columns-2 xl:columns-3 2xl:columns-4 [column-fill:_balance]",
        large: "columns-1 gap-6 sm:columns-1 xl:columns-2 2xl:columns-3 [column-fill:_balance]",
      },
      card: {
        small: "mb-6 break-inside-avoid",
        medium: "mb-6 break-inside-avoid",
        large: "mb-6 break-inside-avoid",
      },
    },
  }

  const layoutOptions: Array<{ key: LayoutKey; label: string }> = [
    { key: "grid", label: "ตาราง" },
    { key: "flex", label: "การ์ด" },
    { key: "row", label: "เรียงลง" },
    { key: "random", label: "สุ่ม" },
  ]

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; publicId: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [thumbSize, setThumbSize] = useState<ThumbSizeKey>("medium")
  const [layoutStyle, setLayoutStyle] = useState<LayoutKey>("grid")
  const holdTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const randomSizes: ThumbSizeKey[] = ["small", "medium", "large"]

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const buildAvatarUrl = (user: GalleryUser, size: number) => {
    if (!cloudName || !user.avatarPublicId) return null
    return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w=${size},h=${size}/${user.avatarPublicId}`
  }

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  )
  const resolvedActiveUser = activeUserState ?? activeUser ?? null
  const canDismissUserSelector = Boolean(resolvedActiveUser)
  const activeUserAvatarUrl = resolvedActiveUser ? buildAvatarUrl(resolvedActiveUser, 160) : null
  const isActiveUserAdmin = resolvedActiveUser?.role === "admin"
  const activeUserInitials = useMemo(() => {
    if (!resolvedActiveUser?.displayName) return "?"
    return (
      resolvedActiveUser.displayName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "?"
    )
  }, [resolvedActiveUser])

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    setPinInput("")
    setPinError(null)
  }

  const handlePinInputChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 4)
    setPinInput(sanitized)
    if (pinError) {
      setPinError(null)
    }
  }

  const handleBackToUserSelection = () => {
    setSelectedUserId(null)
    setPinInput("")
    setPinError(null)
  }

  const handleSubmitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedUserId) {
      setPinError("กรุณาเลือกผู้ใช้")
      return
    }

    if (pinInput.length < 4) {
      setPinError("กรุณากรอกรหัส PIN ให้ครบ 4 หลัก")
      return
    }

    setIsVerifyingPin(true)
    setPinError(null)

    try {
      const response = await fetch("/api/users/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: selectedUserId, pin: pinInput }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "" }))
        throw new Error(errorData.error || "ไม่สามารถยืนยันตัวตนได้")
      }

      setIsSelectorOpen(false)
      setSelectedUserId(null)
      setPinInput("")

      await router.replace(router.asPath, undefined, { scroll: false })
    } catch (error: any) {
      setPinError(error?.message || "เกิดข้อผิดพลาดในการยืนยันตัวตน")
    } finally {
      setIsVerifyingPin(false)
    }
  }

  useEffect(() => {
    if (selectedUser && isSelectorOpen && pinInputRef.current) {
      pinInputRef.current.focus()
    }
  }, [selectedUser, isSelectorOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/users/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      setIsSelectorOpen(true)
      await router.replace(router.asPath, undefined, { scroll: false })
    } catch (error) {
      console.error("Failed to logout", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleOpenResetPinDialog = () => {
    if (!resolvedActiveUser) {
      setResetPinError("กรุณาเลือกผู้ใช้ก่อนรีเซ็ต PIN")
      return
    }

    setCurrentPinValue("")
    setNewPinValue("")
    setConfirmPinValue("")
    setPinHintValue(resolvedActiveUser.pinHint ?? "")
    setResetPinError(null)
    setResetPinSuccess(null)
    setIsResetPinDialogOpen(true)
  }

  const handleCloseResetPinDialog = () => {
    if (isResettingPin) return
    setIsResetPinDialogOpen(false)
    setCurrentPinValue("")
    setNewPinValue("")
    setConfirmPinValue("")
    setResetPinError(null)
    setResetPinSuccess(null)
  }

  const handleSubmitResetPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isResettingPin) return

    if (!resolvedActiveUser) {
      setResetPinError("กรุณาเลือกผู้ใช้ก่อนรีเซ็ต PIN")
      return
    }

    if (!/^[0-9]{4,10}$/.test(currentPinValue)) {
      setResetPinError("กรุณากรอกรหัส PIN เดิมให้ถูกต้อง")
      return
    }

    if (!/^[0-9]{4,10}$/.test(newPinValue)) {
      setResetPinError("กรุณากรอกรหัส PIN เป็นตัวเลข 4 ถึง 10 หลัก")
      return
    }

    if (newPinValue !== confirmPinValue) {
      setResetPinError("รหัส PIN และการยืนยันไม่ตรงกัน")
      return
    }

    setIsResettingPin(true)
    setResetPinError(null)
    setResetPinSuccess(null)

    try {
      const response = await fetch("/api/users/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPin: currentPinValue,
          newPin: newPinValue,
          pinHint: pinHintValue,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "ไม่สามารถรีเซ็ต PIN ได้" }))
        throw new Error(errorData.error || "ไม่สามารถรีเซ็ต PIN ได้")
      }

      const data = await response.json()
      if (data?.user) {
        setActiveUserState(data.user)
        setPinHintValue(data.user.pinHint ?? "")
      }

      setResetPinSuccess("รีเซ็ต PIN เรียบร้อยแล้ว")
      setCurrentPinValue("")
      setNewPinValue("")
      setConfirmPinValue("")
    } catch (error: any) {
      setResetPinError(error?.message || "ไม่สามารถรีเซ็ต PIN ได้")
    } finally {
      setIsResettingPin(false)
    }
  }

  const fallbackAlbumKey = "__ungrouped__"
  const fallbackAlbumLabel = "ไม่ระบุกลุ่ม"

  const getAlbumKey = (value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed === "" ? fallbackAlbumKey : trimmed
  }

  const albumOptions = useMemo(
    () => {
      const groups = new Map<string, string>()
      imageData.forEach((image) => {
        const key = getAlbumKey(image.album)
        const label = key === fallbackAlbumKey ? fallbackAlbumLabel : (image.album ?? "").trim()
        if (!groups.has(key)) {
          groups.set(key, label)
        }
      })

      return [
        { key: "__all__", label: "ทั้งหมด" },
        ...Array.from(groups.entries())
          .sort((a, b) => a[1].localeCompare(b[1], "th"))
          .map(([key, label]) => ({ key, label })),
      ]
    },
    [imageData],
  )

  const filteredImages = useMemo(
    () => {
      if (albumFilter === "__all__") {
        return imageData
      }

      return imageData.filter((image) => getAlbumKey(image.album) === albumFilter)
    },
    [albumFilter, imageData],
  )

  useEffect(() => {
    if (albumFilter === "__all__") return

    const hasAlbum = imageData.some((image) => getAlbumKey(image.album) === albumFilter)

    if (!hasAlbum) {
      setAlbumFilter("__all__")
    }
  }, [albumFilter, imageData])

  useEffect(() => {
    if (!editMode) {
      setEditingImageId(null)
      setSavingImageId(null)
    }
  }, [editMode])

  useEffect(() => {
    if (!metadataStatus) return

    const timeout = setTimeout(() => {
      setMetadataStatus(null)
    }, 4000)

    return () => clearTimeout(timeout)
  }, [metadataStatus])

  const getSizeForImage = (id: number): ThumbSizeKey => {
    if (layoutStyle !== "random") {
      return thumbSize
    }

    const hash = id
      .toString()
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return randomSizes[hash % randomSizes.length]
  }

  const containerClass = layoutSizeClasses[layoutStyle].container[thumbSize]

  const baseCardClass = `group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-[0_22px_45px_rgba(0,0,0,0.45)] transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_35px_80px_rgba(0,0,0,0.55)]${
    editMode ? " animate-wiggle" : ""
  }`

  const cardLayoutClass = layoutSizeClasses[layoutStyle].card[thumbSize]

  const totalPhotos = imageData.length
  const formattedTotalPhotos = totalPhotos.toLocaleString("th-TH")
  const activeLayoutLabel =
    layoutOptions.find((option) => option.key === layoutStyle)?.label || layoutStyle

  const filterButtonClass = (isActive: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
      isActive
        ? "border-white/70 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
        : "border-white/10 text-white/70 hover:border-white/30 hover:text-white"
    }`

  const { photoId } = router.query
  const currentPhoto = imageData.find((img) => img.id === Number(photoId)) || null

  // --- Upload handler ---
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!resolvedActiveUser) {
      setUploadError("กรุณาเลือกผู้ใช้ก่อนอัปโหลดรูปภาพ")
      event.target.value = ""
      return
    }

    setIsUploading(true)
    setUploadError(null)

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onloadend = async () => {
      const base64File = reader.result as string

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({ file: base64File }),
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to upload image." }))
          throw new Error(errorData.error || "Failed to upload image.")
        }

        const data = await res.json()
        console.log("Upload successful:", data)
        router.replace(router.asPath)
      } catch (error: any) {
        console.error(error)
        setUploadError(error.message || "An unknown error occurred.")
      } finally {
        setIsUploading(false)
        event.target.value = ""
      }
    }

    reader.onerror = (error) => {
      console.error("Error reading file:", error)
      setUploadError("Error reading file.")
      setIsUploading(false)
    }
  }

  // --- Long press handlers for edit mode ---
  const handlePressStart = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)

    holdTimer.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setEditMode(true)
    }, 600) // hold 0.6s
  }

  const handlePressEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }

    if (longPressTriggeredRef.current) {
      // Allow the trailing click/tap event to read the flag before resetting it
      setTimeout(() => {
        longPressTriggeredRef.current = false
      }, 0)
    }
  }

  const handleToggleEdit = () => {
    setDeleteTarget(null)
    setDeleteError(null)
    setEditMode((prev) => !prev)
    longPressTriggeredRef.current = false
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: deleteTarget.publicId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "ลบไม่สำเร็จ" }))
        throw new Error(errorData.error || "ลบไม่สำเร็จ")
      }

      await router.replace(router.asPath)
      setDeleteTarget(null)
      setEditMode(false)
    } catch (err: any) {
      setDeleteError(err.message || "เกิดข้อผิดพลาดในการลบ")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartMetadataEdit = (image: ImageProps) => {
    setEditingImageId(image.id)
    setEditAlbum(image.album ?? "")
    setEditDescription(image.description ?? "")
    setMetadataStatus(null)
  }

  const handleCancelMetadataEdit = () => {
    setEditingImageId(null)
    setEditAlbum("")
    setEditDescription("")
  }

  const handleSubmitMetadata = async (
    event: FormEvent<HTMLFormElement>,
    image: ImageProps,
  ) => {
    event.preventDefault()

    const albumValue = editAlbum.trim()
    const descriptionValue = editDescription.trim()

    setSavingImageId(image.id)
    setMetadataStatus(null)

    try {
      const res = await fetch("/api/update-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: image.public_id,
          album: albumValue,
          description: descriptionValue,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "" }))
        throw new Error(errorData.error || "บันทึกข้อมูลไม่สำเร็จ")
      }

      setImageData((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, album: albumValue, description: descriptionValue }
            : img,
        ),
      )

      setMetadataStatus({
        type: "success",
        message: "บันทึกข้อมูลรูปเรียบร้อยแล้ว",
      })
      setEditingImageId(null)
      setEditAlbum("")
      setEditDescription("")
    } catch (error: any) {
      setMetadataStatus({
        type: "error",
        message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      })
    } finally {
      setSavingImageId(null)
    }
  }

  const handleExitEdit = (event: ReactMouseEvent<HTMLElement>) => {
    if (!editMode) return

    const target = event.target

    if (!(target instanceof HTMLElement)) return

    if (target.closest("[data-editable-card]")) return
    if (target.closest("[data-edit-keep]")) return

    setEditMode(false)
  }

  return (
    <>
      <Head>
        <title>Next.js Conf 2022 Photos</title>
        <meta property="og:image" content="https://nextjsconf-pics.vercel.app/og-image.png" />
        <meta name="twitter:image" content="https://nextjsconf-pics.vercel.app/og-image.png" />
      </Head>

      <main
        className="relative min-h-screen select-none overflow-hidden bg-[#040507] text-white"
        onClick={handleExitEdit}
      >
        {isSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm">
            <div
              className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#090b10]/95 p-6 text-white shadow-xl sm:p-8"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex flex-col gap-6">
                {users.length > 0 ? (
                  <>
                    {!selectedUser ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/45">Who's watching?</p>
                            <h2 className="mt-2 text-2xl font-semibold sm:text-[28px]">เลือกผู้ใช้ของคุณ</h2>
                            <p className="mt-2 max-w-sm text-xs text-white/70">
                              แตะไอคอนโปรไฟล์เพื่อเปิดดูรูปภาพในโฟลเดอร์ส่วนตัวของคุณ
                            </p>
                          </div>
                          {canDismissUserSelector && (
                            <button
                              type="button"
                              onClick={() => setIsSelectorOpen(false)}
                              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
                            >
                              ปิด
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          {users.map((user) => {
                            const isActiveCard = selectedUserId === user.id
                            const avatarUrl = buildAvatarUrl(user, 200)
                            const initials = user.displayName
                              .split(" ")
                              .filter(Boolean)
                              .map((part) => part[0]?.toUpperCase())
                              .join("")
                              .slice(0, 2) || "?"

                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelectUser(user.id)}
                                className={`group relative flex flex-col items-center gap-3 rounded-2xl border px-5 py-6 text-center transition ${
                                  isActiveCard
                                    ? "border-cyan-400/70 bg-cyan-400/10 text-white shadow-[0_10px_30px_rgba(34,211,238,0.25)]"
                                    : "border-white/10 bg-white/[0.04] text-white/75 hover:-translate-y-1 hover:border-white/30 hover:text-white"
                                }`}
                                aria-pressed={isActiveCard}
                              >
                                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                                  {avatarUrl ? (
                                    <Image
                                      src={avatarUrl}
                                      alt={user.displayName}
                                      width={80}
                                      height={80}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xl font-semibold text-white/85">{initials}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-sm font-semibold text-white">{user.displayName}</span>
                                  <span className="text-[10px] uppercase tracking-[0.35em] text-white/45">{user.folder}</span>
                                  {user.pinHint && (
                                    <span className="text-[10px] text-white/40">{user.pinHint}</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/45">Profile lock</p>
                            <h2 className="mt-2 text-2xl font-semibold sm:text-[28px]">ใส่รหัส PIN เพื่อเข้าถึงโปรไฟล์นี้</h2>
                            <p className="mt-2 max-w-sm text-xs text-white/70">
                              ป้อนรหัสผ่าน 4 หลักเพื่อปลดล็อกและดูรูปของ {selectedUser.displayName}
                            </p>
                          </div>
                          {canDismissUserSelector && (
                            <button
                              type="button"
                              onClick={() => setIsSelectorOpen(false)}
                              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
                            >
                              ปิด
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/55">
                            {(() => {
                              const avatar = buildAvatarUrl(selectedUser, 240)
                              if (avatar) {
                                return (
                                  <Image
                                    src={avatar}
                                    alt={selectedUser.displayName}
                                    width={96}
                                    height={96}
                                    className="h-full w-full object-cover"
                                  />
                                )
                              }

                              const initials = selectedUser.displayName
                                .split(" ")
                                .filter(Boolean)
                                .map((part) => part[0]?.toUpperCase())
                                .join("")
                                .slice(0, 2) || "?"

                              return <span className="text-2xl font-semibold text-white/85">{initials}</span>
                            })()}
                          </div>
                          <div className="flex flex-col items-center gap-1.5 sm:items-start">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">กำลังปลดล็อก</span>
                            <span className="text-lg font-semibold text-white">{selectedUser.displayName}</span>
                            <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">โฟลเดอร์: {selectedUser.folder}</span>
                            {selectedUser.pinHint && (
                              <span className="text-[11px] text-white/45">คำใบ้ PIN: {selectedUser.pinHint}</span>
                            )}
                          </div>
                        </div>

                        <form className="flex flex-col gap-4" onSubmit={handleSubmitPin}>
                          <div className="flex flex-col gap-2.5">
                            <label
                              id="pin-input-label"
                              htmlFor="pin-input"
                              className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45"
                            >
                              รหัส PIN 4 หลัก
                            </label>
                            <div
                              role="group"
                              aria-labelledby="pin-input-label"
                              className="relative rounded-2xl border border-white/15 bg-black/50 px-3 py-4"
                            >
                              <input
                                ref={pinInputRef}
                                id="pin-input"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                value={pinInput}
                                onChange={(event) => handlePinInputChange(event.target.value)}
                                disabled={isVerifyingPin}
                                maxLength={4}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                aria-label="กรอกรหัส PIN 4 หลัก"
                              />
                              <div className="pointer-events-none flex items-center justify-center gap-3">
                                {Array.from({ length: 4 }).map((_, index) => {
                                  const char = pinInput[index]
                                  return (
                                    <div
                                      key={index}
                                      className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-semibold transition ${
                                        char
                                          ? "border-cyan-400/70 bg-cyan-400/15 text-white"
                                          : "border-white/15 bg-white/[0.03] text-white/30"
                                      }`}
                                    >
                                      {char ? "•" : ""}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            {pinError && <p className="text-[11px] text-red-300">{pinError}</p>}
                          </div>

                          <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={handleBackToUserSelection}
                              disabled={isVerifyingPin}
                              className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              ย้อนกลับ
                            </button>
                            <button
                              type="submit"
                              disabled={pinInput.length < 4 || isVerifyingPin}
                              className="rounded-full bg-cyan-500 px-5 py-1.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60"
                            >
                              {isVerifyingPin ? "กำลังตรวจสอบ..." : "ปลดล็อกโปรไฟล์"}
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/70">
                    ยังไม่มีผู้ใช้ในระบบ โปรดเพิ่มข้อมูลผู้ใช้ใน MongoDB ก่อน
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-35%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_65%)] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-black via-black/70 to-transparent" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          {photoId && (
            <Modal
              images={imageData}
              currentPhoto={currentPhoto}
              onClose={() => {
                setLastViewedPhoto(photoId)
                router.push("/", undefined, { shallow: true })
              }}
            />
          )}

          {metadataStatus && (
            <div
              className={`rounded-2xl border p-4 text-sm backdrop-blur ${
                metadataStatus.type === "success"
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                  : "border-red-400/40 bg-red-500/10 text-red-100"
              }`}
              data-edit-keep
            >
              {metadataStatus.message}
            </div>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_35px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
              <div className="flex flex-col gap-6 text-left">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner shadow-black/20">
                  {resolvedActiveUser ? (
                    <>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/50 shadow-inner shadow-black/40">
                          {activeUserAvatarUrl ? (
                            <Image
                              src={activeUserAvatarUrl}
                              alt={resolvedActiveUser.displayName}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-white/80">{activeUserInitials}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                            กำลังดูแกลเลอรีของ
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">{resolvedActiveUser.displayName}</p>
                          <p className="text-xs text-white/60">โฟลเดอร์: {resolvedActiveUser.folder}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {isActiveUserAdmin && (
                          <Link
                            href="/admin/users"
                            className="rounded-full border border-sky-400/60 px-4 py-2 text-xs font-semibold text-sky-100 transition hover:border-sky-300 hover:text-sky-50"
                          >
                            สร้างผู้ใช้
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={handleOpenResetPinDialog}
                          className="rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-emerald-50"
                        >
                          รีเซ็ต PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSelectorOpen(true)}
                          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                        >
                          สลับผู้ใช้
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="rounded-full border border-red-400/60 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-300 hover:text-red-50 disabled:cursor-not-allowed disabled:border-red-400/30 disabled:text-red-200/60"
                        >
                          {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-white/75">
                        เลือกผู้ใช้เพื่อเข้าสู่แกลเลอรีส่วนตัวของคุณและดูรูปภาพในโฟลเดอร์เฉพาะ
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSelectorOpen(true)}
                        className="self-start rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                      >
                        เลือกผู้ใช้
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">
                    Community Gallery
                  </span>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Share Your Favorite Event Moments
                  </h1>
                  <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
                    Celebrate your gatherings by adding highlights from meetups, workshops, and celebrations for everyone to
                    relive.
                  </p>
                </div>

                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-inner shadow-black/25">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">จำนวนรูป</dt>
                    <dd className="mt-2 text-2xl font-semibold text-white">{formattedTotalPhotos}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-inner shadow-black/25">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">ขนาดแสดงผล</dt>
                    <dd className="mt-2 text-lg font-medium text-white">{sizePresets[thumbSize].label}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-inner shadow-black/25">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">เลย์เอาต์</dt>
                    <dd className="mt-2 text-lg font-medium text-white">{activeLayoutLabel}</dd>
                  </div>
                </dl>
              </div>

              <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 via-white/5 to-white/[0.02] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
                <div className="pointer-events-none absolute -left-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)] blur-3xl" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
                  <Bridge />
                </div>
                <div className="relative z-10 flex flex-col gap-5 text-left">
                  <span className="inline-flex w-fit items-center rounded-full border border-white/25 bg-black/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 backdrop-blur">
                    Upload Photo
                  </span>
                  <p className="text-sm text-white/75">
                    เลือกไฟล์ภาพเพื่อเพิ่มลงในแกลเลอรีทันที ระบบจะปรับขนาดให้เหมาะกับการแสดงผลโดยอัตโนมัติ
                  </p>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={isUploading || !resolvedActiveUser}
                      className="sr-only"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        isUploading || !resolvedActiveUser ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      aria-disabled={isUploading || !resolvedActiveUser}
                    >
                      {isUploading
                        ? "กำลังอัปโหลด..."
                        : resolvedActiveUser
                          ? "เลือกไฟล์เพื่ออัปโหลด"
                          : "เลือกผู้ใช้ก่อนอัปโหลด"}
                    </label>
                    <p className="mt-2 text-xs text-white/55">รองรับไฟล์ JPG, PNG และ WEBP</p>
                  </div>

                  {uploadError && (
                    <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100 backdrop-blur">
                      <strong className="font-semibold">อัปโหลดไม่สำเร็จ:</strong> {uploadError}
                      <br />
                      <span className="text-xs text-red-200">
                        โปรดตรวจสอบค่า Upload Preset ใน Cloudinary และไฟล์ .env.local
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_35px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">ปรับมุมมองแกลเลอรี</p>
                  <p className="mt-1 text-sm text-white/60">เลือกขนาดและการจัดเรียงที่เหมาะกับคุณ</p>
                </div>
                <button
                  type="button"
                  data-edit-keep
                  onClick={handleToggleEdit}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                    editMode
                      ? "border-emerald-300/70 bg-emerald-500/10 text-emerald-100"
                      : "border-white/15 text-white/75 hover:border-white/35 hover:text-white"
                  }`}
                >
                  <TrashIcon className="h-4 w-4" />
                  {editMode ? "ออกจากโหมดจัดการ" : "โหมดจัดการรูป"}
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-2" data-edit-keep>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    ขนาดรูปตัวอย่าง
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(Object.keys(sizePresets) as ThumbSizeKey[]).map((key) => {
                      const isActive = thumbSize === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setThumbSize(key)}
                          aria-pressed={isActive}
                          className={filterButtonClass(isActive)}
                          data-edit-keep
                        >
                          {sizePresets[key].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2" data-edit-keep>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    รูปแบบการจัดเรียง
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {layoutOptions.map(({ key, label }) => {
                      const isActive = layoutStyle === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setLayoutStyle(key)}
                          aria-pressed={isActive}
                          className={filterButtonClass(isActive)}
                          data-edit-keep
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2" data-edit-keep>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    กลุ่มรูปภาพ
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {albumOptions.map(({ key, label }) => {
                      const isActive = albumFilter === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAlbumFilter(key)}
                          aria-pressed={isActive}
                          className={filterButtonClass(isActive)}
                          data-edit-keep
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/55">
                เคล็ดลับ: กดค้างที่รูปเพื่อเปิดโหมดจัดการ หรือใช้ปุ่ม "โหมดจัดการรูป" เพื่อเลือกลบภาพที่ไม่ต้องการ
              </p>
            </div>
          </section>

          <section>
            <div className={containerClass}>
              {filteredImages.map((image) => {
                const { id, public_id, format, blurDataUrl, album, description } = image
                const sizeKey = getSizeForImage(id)
                const { width, height } = sizePresets[sizeKey]
                const albumLabel =
                  getAlbumKey(album) === fallbackAlbumKey
                    ? fallbackAlbumLabel
                    : (album ?? "").trim()
                const descriptionText = (description ?? "").trim()
                const isEditingMetadata = editingImageId === id
                const isSavingMetadata = savingImageId === id

                return (
                  <div
                    key={id}
                    data-editable-card
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onTouchStart={handlePressStart}
                    onTouchEnd={handlePressEnd}
                    onTouchCancel={handlePressEnd}
                    className={`${baseCardClass} ${cardLayoutClass}`}
                  >
                    <Link
                      href={`/?photoId=${id}`}
                      as={`/p/${id}`}
                      shallow
                      className="block cursor-zoom-in"
                      onClick={(event) => {
                        if (longPressTriggeredRef.current || editMode) {
                          event.preventDefault()
                          event.stopPropagation()
                          return
                        }

                        setLastViewedPhoto(id.toString())
                      }}
                    >
                      <div
                        className="relative overflow-hidden"
                        style={{ aspectRatio: `${width}/${height}` }}
                      >
                        <Image
                          alt="ภาพจากแกลเลอรี"
                          className="h-full w-full transform object-cover transition duration-500 will-change-transform group-hover:scale-[1.02] group-hover:brightness-110"
                          placeholder="blur"
                          blurDataURL={blurDataUrl}
                          src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_${width}/${public_id}.${format}`}
                          width={width}
                          height={height}
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-4 pt-8 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                          <span className="text-sm font-medium text-white">ชมภาพแบบเต็ม</span>
                          <span className="text-xs text-white/70">คลิกเพื่อเปิดหน้าต่างแกลเลอรี</span>
                        </div>
                      </div>
                    </Link>

                    <div
                      className="flex flex-col gap-3 border-t border-white/5 bg-black/35 px-5 py-4 text-left"
                      data-editable-card
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                          กลุ่ม
                        </span>
                        <span className="text-sm font-medium text-white/80">{albumLabel}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                          คำอธิบายรูป
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                          {descriptionText || "ยังไม่มีคำอธิบายสำหรับรูปนี้"}
                        </p>
                      </div>

                      {editMode && (
                        <div className="mt-2" data-editable-card>
                          {isEditingMetadata ? (
                            <form
                              className="flex flex-col gap-3"
                              onSubmit={(event) => handleSubmitMetadata(event, image)}
                              data-editable-card
                            >
                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor={`album-${id}`}
                                  className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45"
                                >
                                  กลุ่ม
                                </label>
                                <input
                                  id={`album-${id}`}
                                  type="text"
                                  value={editAlbum}
                                  onChange={(event) => setEditAlbum(event.target.value)}
                                  placeholder="เช่น งานเลี้ยง, เวิร์กช็อป"
                                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                                  data-editable-card
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor={`description-${id}`}
                                  className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45"
                                >
                                  คำอธิบายรูป
                                </label>
                                <textarea
                                  id={`description-${id}`}
                                  value={editDescription}
                                  onChange={(event) => setEditDescription(event.target.value)}
                                  placeholder="เพิ่มรายละเอียดหรือเรื่องราวของภาพ"
                                  rows={3}
                                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                                  data-editable-card
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelMetadataEdit}
                                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isSavingMetadata}
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60"
                                  disabled={isSavingMetadata}
                                >
                                  {isSavingMetadata ? "กำลังบันทึก..." : "บันทึก"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartMetadataEdit(image)}
                              className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:bg-white/[0.08] hover:text-white"
                              data-editable-card
                            >
                              แก้ไขรายละเอียด
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {editMode && (
                      <button
                        type="button"
                        data-editable-card
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setDeleteError(null)
                          setDeleteTarget({ id: id.toString(), publicId: public_id })
                        }}
                        className="pointer-events-auto absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-red-400/50 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-100 backdrop-blur transition hover:border-red-300 hover:bg-red-500/25"
                      >
                        <TrashIcon className="h-4 w-4" />
                        ลบ
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {isResetPinDialogOpen && resolvedActiveUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseResetPinDialog}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101016]/95 p-6 text-white shadow-[0_30px_60px_rgba(0,0,0,0.7)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">รีเซ็ต PIN</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              ตั้งรหัส PIN ใหม่สำหรับ {resolvedActiveUser.displayName} เพื่อใช้เข้าสู่แกลเลอรีส่วนตัว
            </p>

            {resetPinError && (
              <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-100">
                {resetPinError}
              </div>
            )}

            {resetPinSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100">
                {resetPinSuccess}
              </div>
            )}

            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmitResetPin}>
              <div className="flex flex-col gap-1">
                <label htmlFor="current-pin" className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                  รหัส PIN เดิม
                </label>
                <input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentPinValue}
                  onChange={(event) => setCurrentPinValue(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="กรอกรหัส PIN ปัจจุบัน"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="new-pin" className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                  รหัส PIN ใหม่
                </label>
                <input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPinValue}
                  onChange={(event) => setNewPinValue(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="กรอกรหัส 4-10 หลัก"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="confirm-pin" className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                  ยืนยันรหัส PIN
                </label>
                <input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPinValue}
                  onChange={(event) => setConfirmPinValue(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="กรอกรหัส PIN อีกครั้ง"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="pin-hint" className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                  คำใบ้ PIN (ไม่บังคับ)
                </label>
                <input
                  id="pin-hint"
                  type="text"
                  value={pinHintValue}
                  onChange={(event) => setPinHintValue(event.target.value.slice(0, 120))}
                  placeholder="เพิ่มคำใบ้ช่วยจำ หรือเว้นว่างเพื่อไม่แสดง"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/20 transition focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCloseResetPinDialog}
                  disabled={isResettingPin}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
                  disabled={
                    isResettingPin ||
                    currentPinValue.length < 4 ||
                    newPinValue.length < 4 ||
                    confirmPinValue.length < 4
                  }
                >
                  {isResettingPin ? "กำลังบันทึก..." : "บันทึก PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isDeleting) setDeleteTarget(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101016]/95 p-6 text-white shadow-[0_30px_60px_rgba(0,0,0,0.7)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">ลบรูปภาพ</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              ต้องการลบรูปนี้ออกจากแกลเลอรีหรือไม่? การลบจะไม่สามารถย้อนกลับได้
            </p>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-100">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (!isDeleting) setDeleteTarget(null)
                }}
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(239,68,68,0.35)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/60"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "กำลังลบ..." : "ลบรูป"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 bg-black/50 px-6 py-10 text-center text-xs text-white/55 backdrop-blur sm:px-8">
        Thank you to{" "}
        <a
          href="https://edelson.co/"
          target="_blank"
          className="font-semibold text-white/80 transition hover:text-white"
          rel="noreferrer"
        >
          Josh Edelson
        </a>
        ,{" "}
        <a
          href="https://www.newrevmedia.com/"
          target="_blank"
          className="font-semibold text-white/80 transition hover:text-white"
          rel="noreferrer"
        >
          New Revolution Media
        </a>
        , and{" "}
        <a
          href="https://www.garysexton.com/"
          target="_blank"
          className="font-semibold text-white/80 transition hover:text-white"
          rel="noreferrer"
        >
          Gary Sexton
        </a>{" "}
        for the pictures.
      </footer>
    </>
  )
}

export default Home

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res } = context

  let users: GalleryUser[] = []
  let activeUser: GalleryUser | null = null
  let images: ImageProps[] = []

  try {
    const { default: clientPromise } = await import("../utils/mongodb")
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const userCollection = db.collection("galleryUsers")

    const userDocs = await userCollection
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

    users = mapUserDocs(userDocs)
  } catch (error) {
    console.error("Failed to load user list", error)
  }

  try {
    activeUser = await getAuthenticatedUser(req as any)
    if (!activeUser && req.cookies?.[SESSION_COOKIE_NAME]) {
      res.setHeader("Set-Cookie", clearSessionCookie())
    }
  } catch (error) {
    console.error("Failed to resolve active user", error)
  }

  if (activeUser) {
    try {
      const sanitizedFolder = activeUser.folder.replace(/"/g, '\\"')
      const results = await cloudinary.search
        .expression(`folder="${sanitizedFolder}" AND resource_type:image`)
        .with_field("context")
        .sort_by("public_id", "desc")
        .max_results(400)
        .execute()

      const publicIds = results.resources.map((result: any) => result.public_id)

      const metadataMap = new Map<string, { album?: string; description?: string }>()

      if (process.env.MONGODB_URI && publicIds.length > 0) {
        try {
          const { default: clientPromise } = await import("../utils/mongodb")
          const client = await clientPromise
          const db = client.db(process.env.MONGODB_DB || "img-detail")
          const collection = db.collection<{
            public_id: string
            album?: string
            description?: string
            ownerId?: string
          }>("photoMetadata")

          const documents = await collection
            .find({
              public_id: { $in: publicIds },
              $or: [{ ownerId: activeUser.id }, { ownerId: { $exists: false } }],
            })
            .toArray()

          documents.forEach((doc) => {
            metadataMap.set(doc.public_id, {
              album: doc.album ?? "",
              description: doc.description ?? "",
            })
          })
        } catch (error) {
          console.error("Failed to load MongoDB metadata:", error)
        }
      }

      const reducedResults: ImageProps[] = results.resources.map((result: any, index: number) => {
        const metadata = metadataMap.get(result.public_id)
        return {
          id: index,
          height: result.height,
          width: result.width,
          public_id: result.public_id,
          format: result.format,
          album: metadata?.album ?? result?.context?.custom?.album ?? "",
          description: metadata?.description ?? result?.context?.custom?.description ?? "",
        }
      })

      const blurImagePromises = reducedResults.map((image) => getBase64ImageUrl(image))
      const imagesWithBlurDataUrls = await Promise.all(blurImagePromises)

      images = reducedResults.map((image, index) => ({
        ...image,
        blurDataUrl: imagesWithBlurDataUrls[index],
      }))
    } catch (error) {
      console.error("Failed to load images for user", error)
    }
  }

  return {
    props: {
      images,
      users,
      activeUser,
    },
  }
}
