
import { useState, useEffect } from 'react'
import { Button, Card } from '@homejiak/ui'
import { X, GripVertical, Loader2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../../lib/trpc/client'

// Sortable Image Item Component
function SortableImageItem({ 
  url, 
  index, 
  onDelete 
}: { 
  url: string
  index: number
  onDelete: () => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div className="relative w-32 h-32">
        <Image
          src={url}
          alt={`Product ${index + 1}`}
          fill
          className="object-cover rounded-lg"
        />
        
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 p-1 bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        {/* Delete Button */}
        <Button
          size="sm"
          variant="destructive"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          onClick={onDelete}
        >
          <X className="h-3 w-3" />
        </Button>
        
        {/* Primary Badge */}
        {index === 0 && (
          <span className="absolute bottom-1 left-1 text-xs bg-primary text-white px-2 py-1 rounded">
            Primary
          </span>
        )}
      </div>
    </div>
  )
}

// Main Component
interface ProductImageManagerProps {
  productId: string
  images: string[]
  onUpdate?: () => void
}

export function ProductImageManager({ 
  productId, 
  images: initialImages, 
  onUpdate 
}: ProductImageManagerProps) {
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)

  // Added useEffect to sync local state with prop changes
  useEffect(() => {
    setImages(initialImages)
  }, [initialImages])
  
  const uploadImage = api.storage.uploadProductImage.useMutation({
    onSuccess: (data) => {
      setImages(prev => [...prev, data.url])
      onUpdate?.()
    },
  })
  
  const deleteImage = api.storage.deleteProductImage.useMutation({
    onSuccess: () => {
      onUpdate?.()
    },
  })
  
  const reorderImages = api.storage.reorderProductImages.useMutation({
    onSuccess: () => {
      onUpdate?.()
    },
  })

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    if (images.length + files.length > 10) {
      alert('Maximum 10 images per product')
      return
    }
    
    setUploading(true)
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`)
        continue
      }
      
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        await uploadImage.mutateAsync({
          productId,
          base64,
        })
      }
      reader.readAsDataURL(file)
    }
    
    setUploading(false)
  }
  
  const handleDelete = async (imageUrl: string, index: number) => {
    if (!confirm('Delete this image?')) return
    
    await deleteImage.mutateAsync({
      productId,
      imageUrl,
    })
    
    setImages(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string)
      const newIndex = images.indexOf(over.id as string)
      
      const newImages = arrayMove(images, oldIndex, newIndex)
      setImages(newImages)
      
      // Update in backend
      await reorderImages.mutateAsync({
        productId,
        imageUrls: newImages,
      })
    }
  }
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Product Images</h3>
        <span className="text-sm text-muted-foreground">
          {images.length}/10 images
        </span>
      </div>
      
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
              {images.map((url, index) => (
                <SortableImageItem
                  key={url}
                  url={url}
                  index={index}
                  onDelete={() => handleDelete(url, index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      
      <div>
        <input
          type="file"
          id="product-images"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || images.length >= 10}
          className="hidden"
        />
        
        <label
          htmlFor="product-images"
          className={`flex items-center justify-center gap-2 w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            uploading || images.length >= 10
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-primary hover:bg-primary/5'
          }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm">
            {uploading ? 'Uploading...' : 'Click to upload images'}
          </span>
        </label>
      </div>
    </Card>
  )
}
