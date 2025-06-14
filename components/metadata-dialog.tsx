"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import MetadataForm from "./metadata-form"

interface MetadataDialogProps {
  isOpen: boolean
  onClose: () => void
  file: File | null
  url: string
  onProcess: (metadata: any) => void
}

export default function MetadataDialog({ isOpen, onClose, file, url, onProcess }: MetadataDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document Metadata</DialogTitle>
        </DialogHeader>
        <MetadataForm 
          file={file} 
          url={url} 
          onSubmit={(metadata) => {
            onProcess(metadata);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  )
} 