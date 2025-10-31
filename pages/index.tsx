"use client"

import type { NextPage } from "next"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState, useRef } from "react"
import Bridge from "../components/Icons/Bridge"
import Logo from "../components/Icons/Logo"
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
  const holdTimer = useRef<NodeJS.Timeout | null>(null)

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
  const handleMouseDown = () => {
    holdTimer.current = setTimeout(() => {
      setEditMode(true)
    }, 600) // hold 0.6s
  }

  const handleMouseUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
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
          <div className="after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-4 overflow-hidden rounded-lg bg-white/10 px-6 pb-16 pt-64 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight lg:pt-0">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="flex max-h-full max-w-full items-center justify-center">
                <Bridge />
              </span>
              <span className="absolute left-0 right-0 bottom-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"></span>
            </div>
            <Logo />
            <h1 className="mt-8 mb-4 text-base font-bold uppercase tracking-widest">
              2022 Event Photos
            </h1>
            <p className="max-w-[40ch] text-white/75 sm:max-w-[32ch]">
              Our incredible Next.js community got together in San Francisco for our first ever in-person conference!
            </p>

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
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              className={`relative mb-5 transition-transform duration-300 ${
                editMode ? "animate-wiggle" : ""
              }`}
            >
              <Link
                href={`/?photoId=${id}`}
                as={`/p/${id}`}
                shallow
                className="block cursor-zoom-in"
                onClick={() => setLastViewedPhoto(id)}
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
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!confirm("ต้องการลบรูปนี้ใช่ไหม?")) return
                    try {
                      const res = await fetch("/api/delete", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ public_id }),
                      })
                      if (!res.ok) throw new Error("ลบไม่สำเร็จ")
                      alert("ลบรูปสำเร็จ!")
                      window.location.reload()
                    } catch (err: any) {
                      alert("เกิดข้อผิดพลาดในการลบ: " + err.message)
                    }
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
