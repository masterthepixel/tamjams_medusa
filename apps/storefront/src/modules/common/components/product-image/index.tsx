"use client"

import { clx } from "@modules/common/components/ui"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import Image from "next/image"
import { useEffect, useState } from "react"

type ProductImageProps = {
  src?: string | null
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
}

/**
 * Renders a product image, falling back to the shared placeholder icon when the
 * source is missing or fails to load. TamJams product images are not on disk
 * yet, so this keeps the page from showing broken-image chrome.
 */
const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
}) => {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={clx(
        "relative w-full aspect-square overflow-hidden rounded-large bg-ui-bg-subtle",
        className
      )}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          draggable={false}
          className="object-cover object-center"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-ui-fg-muted">
          <PlaceholderImage size={40} />
        </div>
      )}
    </div>
  )
}

export default ProductImage
