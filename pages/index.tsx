"use client"

import { TrashIcon } from "@heroicons/react/24/outline"
import type { NextPage } from "next"
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
import type { ImageProps } from "../utils/types"
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto"

const Home: NextPage<{ images: ImageProps[] }> = ({ images }) => {
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

  useEffect(() => {
    setImageData(images)
  }, [images])

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
                      disabled={isUploading}
                      className="sr-only"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        isUploading ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {isUploading ? "กำลังอัปโหลด..." : "เลือกไฟล์เพื่ออัปโหลด"}
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

export async function getServerSideProps() {
  const results = await cloudinary.search
    .expression("tags=nextjs-conf")
    .with_field("context")
    .sort_by("public_id", "desc")
    .max_results(400)
    .execute()

  let reducedResults: ImageProps[] = []
  let i = 0
  for (let result of results.resources) {
    reducedResults.push({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
      album: result?.context?.custom?.album ?? "",
      description: result?.context?.custom?.description ?? "",
    })
    i++
  }

  const blurImagePromises = results.resources.map((image: ImageProps) => getBase64ImageUrl(image))
  const imagesWithBlurDataUrls = await Promise.all(blurImagePromises)

  for (let i = 0; i < reducedResults.length; i++) {
    reducedResults[i].blurDataUrl = imagesWithBlurDataUrls[i]
  }

  return {
    props: {
      images: reducedResults,
    },
  }
}
