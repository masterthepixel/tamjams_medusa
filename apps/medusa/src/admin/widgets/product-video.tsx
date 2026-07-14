import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Input, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/client"
import { useState } from "react"

const ProductVideoWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)

  const productVideoUrl = product.metadata?.product_video as string | undefined

  // Mutation to upload a file
  const uploadVideo = useMutation({
    mutationFn: async (fileToUpload: File) => {
      const response = await sdk.admin.upload.create({ files: [fileToUpload] })
      if (!response.files || response.files.length === 0) {
        throw new Error("Failed to upload file")
      }
      return response.files[0].url
    }
  })

  // Mutation to update the product metadata
  const updateProductMetadata = useMutation({
    mutationFn: async (url: string | null) => {
      const metadata = { ...product.metadata }
      if (url) {
        metadata.product_video = url
      } else {
        delete metadata.product_video
      }

      await sdk.admin.product.update(product.id, {
        metadata,
      })
    },
    onSuccess: () => {
      // Invalidate queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
      toast.success("Product video updated successfully")
      setFile(null)
    },
    onError: (error) => {
      toast.error("Failed to update product video", {
        description: error.message,
      })
    },
  })

  const handleSave = async () => {
    if (!file) return

    try {
      const url = await uploadVideo.mutateAsync(file)
      await updateProductMetadata.mutateAsync(url)
    } catch (e) {
      toast.error("An error occurred during upload")
    }
  }

  const handleRemove = async () => {
    try {
      await updateProductMetadata.mutateAsync(null)
    } catch (e) {
      // error handled in onError
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Video</Heading>
      </div>
      
      <div className="flex flex-col gap-y-4 px-6 py-4">
        {productVideoUrl ? (
          <div className="flex flex-col gap-y-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Current video:
            </Text>
            <div className="relative aspect-[29/34] w-full max-w-sm overflow-hidden rounded-lg bg-ui-bg-subtle">
              <video
                src={productVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex gap-x-2">
              <Button 
                variant="danger" 
                size="small" 
                onClick={handleRemove}
                isLoading={updateProductMetadata.isPending}
              >
                Remove Video
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-y-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Upload a dedicated video (e.g., .mp4, .webm) for this product to be featured in the storefront gallery.
            </Text>
            <div className="flex flex-col gap-y-2">
              <Input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploadVideo.isPending || updateProductMetadata.isPending}
              />
              <Button
                variant="secondary"
                size="small"
                onClick={handleSave}
                disabled={!file}
                isLoading={uploadVideo.isPending || updateProductMetadata.isPending}
                className="self-start"
              >
                Upload & Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductVideoWidget
