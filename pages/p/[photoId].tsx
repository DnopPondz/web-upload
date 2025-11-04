import type { GetStaticProps, GetStaticPaths, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Carousel from "../../components/Carousel";
import getResults from "../../utils/cachedImages";
import getBase64ImageUrl from "../../utils/generateBlurPlaceholder";
import type { ImageProps } from "../../utils/types";

// --------------------------------------------------------
// 🔹 หน้าแสดงภาพแต่ละรูป
// --------------------------------------------------------
const PhotoPage: NextPage<{ currentPhoto: ImageProps | null }> = ({
  currentPhoto,
}) => {
  const router = useRouter();
  const { photoId } = router.query;

  // ✅ กัน router ยังโหลดไม่เสร็จ
  if (router.isFallback || !currentPhoto) {
    return <div className="text-center p-10 text-lg">Loading...</div>;
  }

  const currentPhotoUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_2560/${currentPhoto.public_id}.${currentPhoto.format}`;

  return (
    <>
      <Head>
        <title>Pichub</title>
        <meta property="og:image" content={currentPhotoUrl} />
        <meta name="twitter:image" content={currentPhotoUrl} />
      </Head>

      <main className="mx-auto max-w-[1960px] p-4">
        <Carousel currentPhoto={currentPhoto} index={Number(photoId)} />
      </main>
    </>
  );
};

export default PhotoPage;

// --------------------------------------------------------
// 🔹 getStaticProps: ดึงข้อมูลภาพจาก Cloudinary ตาม photoId
// --------------------------------------------------------
export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    const results = await getResults();

    if (!results?.resources) {
      console.error("❌ Cloudinary results empty or invalid");
      return { notFound: true };
    }

    const publicIds = results.resources.map((result: any) => result.public_id);

    const metadataMap = new Map<
      string,
      { album?: string; description?: string; imageName?: string }
    >();

    if (process.env.MONGODB_URI && publicIds.length > 0) {
      try {
        const { default: clientPromise } = await import("../../utils/mongodb");
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "img-detail");
        const collection = db.collection<{
          public_id: string;
          album?: string;
          description?: string;
          imageName?: string;
        }>("photoMetadata");

        const documents = await collection
          .find({ public_id: { $in: publicIds } })
          .toArray();

        documents.forEach((doc) => {
          metadataMap.set(doc.public_id, {
            album: doc.album ?? "",
            description: doc.description ?? "",
            imageName: doc.imageName ?? "",
          });
        });
      } catch (error) {
        console.error("❌ Failed to load MongoDB metadata:", error);
      }
    }

    const reducedResults: ImageProps[] = results.resources.map((result, i) => ({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
      album:
        metadataMap.get(result.public_id)?.album ??
        result?.context?.custom?.album ??
        "",
      description:
        metadataMap.get(result.public_id)?.description ??
        result?.context?.custom?.description ??
        "",
      imageName:
        metadataMap.get(result.public_id)?.imageName ??
        result?.context?.custom?.imageName ??
        "",
    }));

    const currentPhoto = reducedResults.find(
      (img) => img.id === Number(params?.photoId)
    );

    if (!currentPhoto) {
      return { notFound: true };
    }

    currentPhoto.blurDataUrl = await getBase64ImageUrl(currentPhoto);

    return {
      props: {
        currentPhoto,
      },
      revalidate: 60, // ISR (เผื่อเพิ่มรูปใหม่ใน Cloudinary)
    };
  } catch (error) {
    console.error("❌ getStaticProps error:", error);
    return { notFound: true };
  }
};

// --------------------------------------------------------
// 🔹 getStaticPaths: สร้าง path ของทุกภาพ
// --------------------------------------------------------
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const results = await getResults();

    if (!results?.resources) {
      console.error("❌ Cloudinary returned no resources");
      return { paths: [], fallback: true };
    }

    const paths = results.resources.map((_: any, i: number) => ({
      params: { photoId: i.toString() },
    }));

    return {
      paths,
      fallback: true,
    };
  } catch (error) {
    console.error("❌ getStaticPaths error:", error);
    return {
      paths: [],
      fallback: true,
    };
  }
};
