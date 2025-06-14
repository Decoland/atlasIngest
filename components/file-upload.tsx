"use client"

import type React from "react"
import { useState, useRef, useEffect, forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onFileSelect: (file: File | null, url: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  urlInputRef: React.RefObject<HTMLInputElement | null>
  resetTrigger: boolean
}

const FileUpload = ({ onFileSelect, fileInputRef, urlInputRef, resetTrigger }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    onFileSelect(null, newUrl)
  }

  useEffect(() => {
    if (!urlInputRef.current?.value) {
      setUrl("")
    }
  }, [urlInputRef])

  useEffect(() => {
    if (resetTrigger) {
      setFile(null)
      setUrl("")
    }
  }, [resetTrigger])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setUrl("")
      onFileSelect(selectedFile, "")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      setUrl("")
      onFileSelect(droppedFile, "")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="url" className="text-lg mb-2">
            Document URL
          </Label>
          <Input
            ref={urlInputRef}
            id="url"
            type="url"
            placeholder="https://example.com/document.pdf"
            value={url}
            onChange={handleUrlChange}
            className="h-12"
          />
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <div>
          <Label htmlFor="file" className="text-lg mb-2">
            Upload Document
          </Label>
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium">{file.name}</p>
                <Button 
                  variant="ghost"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose a different file
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Drag and drop your file here, or
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload

