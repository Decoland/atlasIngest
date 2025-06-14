"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useState, useRef, forwardRef, useEffect } from "react"
import { FolderUp, Files } from "lucide-react"

interface FolderUploadProps {
  onFolderSelect: (files: File[]) => void
  resetTrigger: React.MutableRefObject<boolean>
}

const FolderUpload = forwardRef<HTMLInputElement, FolderUploadProps>(
  ({ onFolderSelect, resetTrigger }, ref) => {
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    // Reset internal state when resetTrigger changes
    useEffect(() => {
      setSelectedFiles([])
      setIsDragging(false)
      onFolderSelect([]) // Clear parent state as well
    }, [resetTrigger, onFolderSelect])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const filesArray = Array.from(e.target.files).filter(file => file.size <= 10 * 1024 * 1024)
        setSelectedFiles(filesArray)
        onFolderSelect(filesArray)
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
      
      const files = Array.from(e.dataTransfer.files).filter(file => file.size <= 10 * 1024 * 1024)
      setSelectedFiles(files)
      onFolderSelect(files)
    }

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-lg mb-2">Upload File(s)</Label>
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
              ref={ref}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              onChange={handleFileChange}
              className="hidden"
              id="folder-input"
            />
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="files-input"
            />
            
            <div className="text-center space-y-4">
              <FolderUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Drag and drop a folder or files here
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => document.getElementById('folder-input')?.click()}
                  variant="outline"
                >
                  Choose Folder
                </Button>
                <Button 
                  onClick={() => document.getElementById('files-input')?.click()}
                  variant="outline"
                >
                  <Files className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>
            </div>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Selected Files ({selectedFiles.length})</h3>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="text-sm py-1">
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

FolderUpload.displayName = "FolderUpload"

export default FolderUpload 