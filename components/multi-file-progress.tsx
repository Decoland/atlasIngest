"use client"

import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@radix-ui/react-scroll-area"

interface FileProgress {
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

interface MultiFileProgressProps {
  files: FileProgress[]
  overallProgress: number
}

export default function MultiFileProgress({ files, overallProgress }: MultiFileProgressProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Overall Progress</h3>
        <Progress value={overallProgress} className="h-3 w-full [&>div]:bg-primary/50" />
      </div>
      
      <div>
        <h3 className="font-semibold mb-2">Individual Files</h3>
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{file.fileName}</span>
                  <span className={
                    file.status === 'completed' ? 'text-[#7d7f7c]' :
                    file.status === 'error' ? 'text-red-500' :
                    'text-[#7d7f7c]'
                  }>
                    {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                  </span>
                </div>
                <Progress 
                  value={file.progress} 
                  className="h-2 w-full [&>div]:bg-[#7d7f7c]" 
                />
                {file.error && (
                  <p className="text-xs text-red-500">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 