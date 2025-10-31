import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../utils/types";
import SharedModal from "./SharedModal";

export default function Modal({
  images,
  onClose,
}: {
  images: ImageProps[];
  onClose?: () => void;
}) {
  let overlayRef = useRef();
  const router = useRouter();

  const { photoId } = router.query;
  const photoIdParam = Array.isArray(photoId) ? photoId[0] : photoId;
  const parsedIndex = Number(photoIdParam);
  const initialIndex = Number.isFinite(parsedIndex) ? parsedIndex : 0;

  const [direction, setDirection] = useState(0);
  const [curIndex, setCurIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (Number.isFinite(parsedIndex) && parsedIndex !== curIndex) {
      setCurIndex(parsedIndex);
    }
  }, [parsedIndex, curIndex]);

  useEffect(() => {
    const handleRouteComplete = () => setIsTransitioning(false);

    router.events.on("routeChangeComplete", handleRouteComplete);
    router.events.on("routeChangeError", handleRouteComplete);

    return () => {
      router.events.off("routeChangeComplete", handleRouteComplete);
      router.events.off("routeChangeError", handleRouteComplete);
    };
  }, [router]);

  function handleClose() {
    setIsTransitioning(false);
    router.push("/", undefined, { shallow: true, scroll: false });
    onClose?.();
  }

  function changePhotoId(newVal: number) {
    if (isTransitioning) {
      return;
    }

    const clampedValue = Math.max(0, Math.min(newVal, images.length - 1));
    if (clampedValue === curIndex) {
      return;
    }

    setDirection(clampedValue > curIndex ? 1 : -1);
    setCurIndex(clampedValue);
    setIsTransitioning(true);
    router
      .push(
        {
          pathname: "/",
          query: { photoId: clampedValue },
        },
        `/p/${clampedValue}`,
        { shallow: true, scroll: false },
      )
      .catch(() => setIsTransitioning(false));
  }

  useKeypress("ArrowRight", () => {
    if (curIndex + 1 < images.length) {
      changePhotoId(curIndex + 1);
    }
  });

  useKeypress("ArrowLeft", () => {
    if (curIndex > 0) {
      changePhotoId(curIndex - 1);
    }
  });

  return (
    <Dialog
      static
      open={true}
      onClose={handleClose}
      initialFocus={overlayRef}
      className="fixed inset-0 z-10 flex items-center justify-center"
    >
      <Dialog.Overlay
        ref={overlayRef}
        as={motion.div}
        key="backdrop"
        className="fixed inset-0 z-30 bg-black/70 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <SharedModal
        index={curIndex}
        direction={direction}
        images={images}
        changePhotoId={changePhotoId}
        closeModal={handleClose}
        navigation={true}
      />
    </Dialog>
  );
}
