"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState, useRef } from "react"
import Bridge from "../components/Icons/Bridge"
import Modal from "../components/Modal"
import cloudinary from "../utils/cloudinary"
import getBase64ImageUrl from "../utils/generateBlurPlaceholder"
import type { ImageProps } from "../utils/types"
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto"

const Home: NextPage<{ images: ImageProps[] }> = ({ images }) => {
  const router = useRouter()
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; publicId: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const holdTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)

  const { photoId } = router.query
  const currentPhoto = images.find((img) => img.id === photoId) || null

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

  const handleExitEdit = (e: any) => {
    // Exit edit mode when clicking outside
    if (editMode && e.target.tagName !== "BUTTON") {
      setEditMode(false)
    }
  }

  return (
    <>
      <Head>
        <title>Next.js Conf 2022 Photos</title>
        <meta property="og:image" content="https://nextjsconf-pics.vercel.app/og-image.png" />
        <meta name="twitter:image" content="https://nextjsconf-pics.vercel.app/og-image.png" />
      </Head>

      <main
        className="mx-auto max-w-[1960px] p-4 select-none"
        onClick={handleExitEdit}
      >
        {photoId && (
          <Modal
            images={images}
            currentPhoto={currentPhoto}
            onClose={() => {
              setLastViewedPhoto(photoId)
              router.push("/", undefined, { shallow: true })
            }}
          />
        )}

        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          {/* Upload Section */}
          <div className="after:content relative mb-5 flex h-[520px] flex-col items-center justify-end gap-4 overflow-hidden rounded-lg bg-white/10 px-6 pb-12 pt-48 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight sm:h-[560px] lg:h-[520px] lg:pt-0">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="flex max-h-full max-w-full items-center justify-center">
                <Bridge />
              </span>
              <span className="absolute left-0 right-0 bottom-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"></span>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                Community Gallery
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Share Your Favorite Event Moments
              </h1>
              <p className="mt-3 max-w-[44ch] text-white/75 sm:max-w-[36ch]">
                Celebrate your gatherings by adding highlights from meetups, workshops, and celebrations for everyone to relive.
              </p>
            </div>

            <div className="relative z-10">
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
                className={`cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/80 ${
                  isUploading ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
              </label>
            </div>

            {uploadError && (
              <div className="mt-4 rounded-md bg-red-800/50 p-3 text-sm text-red-100">
                <strong>Upload Failed:</strong> {uploadError}
                <br />
                <span className="text-xs text-red-200">
                  (โปรดเช็ก 'Upload Preset' ใน Cloudinary และ .env.local)
                </span>
              </div>
            )}
          </div>

          {/* Gallery */}
          {images.map(({ id, public_id, format, blurDataUrl }) => (
            <div
              key={id}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              className={`relative mb-5 transition-transform duration-300 ${
                editMode ? "animate-wiggle" : ""
              }`}
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

                  setLastViewedPhoto(id)
                }}
              >
                <Image
                  alt="Next.js Conf photo"
                  className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
                  placeholder="blur"
                  blurDataURL={blurDataUrl}
                  src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_720/${public_id}.${format}`}
                  width={720}
                  height={480}
                />
              </Link>

              {/* Show delete button only in edit mode */}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteError(null)
                    setDeleteTarget({ id, publicId: public_id })
                  }}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-full opacity-90 hover:opacity-100 shadow-lg"
                >
                  ❌
                </button>
              )}
          </div>
        ))}
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
            className="w-full max-w-sm rounded-xl bg-zinc-900 p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">ลบรูปภาพ</h2>
            <p className="mt-2 text-sm text-white/80">
              ต้องการลบรูปนี้ออกจากแกลเลอรีหรือไม่? การลบจะไม่สามารถย้อนกลับได้
            </p>

            {deleteError && (
              <div className="mt-4 rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-200">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white"
                onClick={() => {
                  if (!isDeleting) setDeleteTarget(null)
                }}
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-500/60"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "กำลังลบ..." : "ลบรูป"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="p-6 text-center text-white/80 sm:p-12">
        Thank you to{" "}
        <a
          href="https://edelson.co/"
          target="_blank"
          className="font-semibold hover:text-white"
          rel="noreferrer"
        >
          Josh Edelson
        </a>
        ,{" "}
        <a
          href="https://www.newrevmedia.com/"
          target="_blank"
          className="font-semibold hover:text-white"
          rel="noreferrer"
        >
          New Revolution Media
        </a>
        , and{" "}
        <a
          href="https://www.garysexton.com/"
          target="_blank"
          className="font-semibold hover:text-white"
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
    .sort_by("public_id", "desc")
    .max_results(400)
    .execute()

  let reducedResults: ImageProps[] = []
  let i = 0
  for (let result of results.resources) {
    reducedResults.push({
      id: i.toString(),
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
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
