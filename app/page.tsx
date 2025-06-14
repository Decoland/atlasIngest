"use client"

import FileUpload from "@/components/file-upload"
import FolderUpload from "@/components/folder-upload"
import ProcessIndicator from "@/components/process-indicator"
import MultiFileProgress from "@/components/multi-file-progress"
import MetadataDialog from "@/components/metadata-dialog"
import BulkMetadataDialog from "@/components/bulk-metadata-dialog"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
// @ts-ignore
import Papa from 'papaparse'

interface FileProgress {
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

// Add new state for CSV URLs
interface CsvEntry {
  document_title: string;
  authors: string[];
  source: string;
  date: string;
  tags: string[];
  url: string;
}

export default function Home() {
  // File and URL upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [url, setUrl] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(false)

  // Add new state for CSV URLs
  const [csvUrls, setCsvUrls] = useState<CsvEntry[]>([])
  const csvInputRef = useRef<HTMLInputElement>(null)

  const folderInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Add URL validation function
  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  // Add CSV file handler
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("CSV file size must be under 10MB");
      return;
    }

    const text = await file.text();
    // Use PapaParse to parse CSV robustly
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      toast.error("Error parsing CSV: " + parsed.errors[0].message);
      return;
    }

    const rows = parsed.data as Record<string, string>[];
    // Validate required columns exist
    const requiredColumns = ['Title ', 'Author/ Company ', 'Resource Type ', 'Publication Date ', 'Keywords ', 'Link/ URL '];
    const missingColumns = requiredColumns.filter(col => !Object.keys(rows[0] || {}).includes(col));
    if (missingColumns.length > 0) {
      toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
      console.log('current columns: ', rows[0]);
      return;
    }

    // Process each row
    const csvData = rows.map(rowData => {
      const metadata = {
        document_title: rowData['Title '] || '',
        authors: (rowData['Author/ Company '] || '').split(';').map(author => author.trim()).filter(Boolean),
        source: rowData['Resource Type '] || '',
        date: rowData['Publication Date '] || '',
        tags: (rowData['Keywords '] || '').split(';').map(tag => tag.trim()).filter(Boolean),
        url: rowData['Link/ URL '] || ''
      };
      return metadata;
    });

    // Filter out rows with invalid URLs
    const validData = csvData.filter(item => isValidUrl(item.url));
    if (validData.length < csvData.length) {
      toast.warning(`${csvData.length - validData.length} rows with invalid URLs will be ignored`);
    }
    setCsvUrls(validData);
    if (validData.length > 0) {
      toast.success(`Loaded ${validData.length} entries from CSV`);
    }
  }

  // Modify handleUpload to handle CSV URLs
  const handleUpload = () => {
    if (csvUrls.length > 0) {
      handleBulkUrlProcessing(csvUrls);
    } else if (selectedFiles.length === 0 && !url) {
      return;
    } else if (selectedFiles.length === 1 || url) {
      setShowDialog(true);
    } else {
      setShowBulkDialog(true);
    }
  }

  const handleReset = () => {
    // Clear folder input
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
    // Clear URL input
    if (urlInputRef.current) {
      urlInputRef.current.value = ''
    }
    // Clear CSV input
    if (csvInputRef.current) {
      csvInputRef.current.value = ''
    }
    // Reset processing state
    setSelectedFiles([])
    setUrl('')
    setCsvUrls([])
    setProcessingStep(0)
    setOverallProgress(0)
    // Reset dialog states
    setShowDialog(false)
    setShowBulkDialog(false)
    // Clear any cached data or error states
    setFileProgress([])
    setResetTrigger(prev => !prev)
    toast.success("Processing reset")
  }

  const handleProcessing = async (metadata: any) => {
    try {
      setProcessingStep(1)
      
      const formData = new FormData()
      if (selectedFiles.length === 1) {
        formData.append('file', selectedFiles[0])
      }
      formData.append('metadata', JSON.stringify(metadata))
      if (url) {
        formData.append('documentUrl', url)
      }
      
      setProcessingStep(2)
      
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Processing failed')
      }

      setProcessingStep(3)
      setProcessingStep(4)
      
      toast.success("Document successfully processed!")
    } catch (error) {
      console.error('Processing failed:', error)
      toast.error("Processing failed")
      setProcessingStep(0)
    }
  }

  const handleBulkProcessing = async (commonMetadata: any) => {
    try {
      // Initialize progress tracking for each file
      const initialProgress = selectedFiles.map(file => ({
        fileName: file.name,
        status: 'pending' as const,
        progress: 0
      }))
      setFileProgress(initialProgress)

      // Process files in parallel with a limit of 3 concurrent uploads
      const batchSize = 3
      const files = [...selectedFiles]
      const results = []

      while (files.length > 0) {
        const batch = files.splice(0, batchSize)
        const batchPromises = batch.map(async (file, batchIndex) => {
          const fileIndex = selectedFiles.findIndex(f => f.name === file.name)
          
          try {
            // Update status to processing
            setFileProgress(prev => prev.map((item, i) => 
              i === fileIndex ? { ...item, status: 'processing', progress: 25 } : item
            ))

            const formData = new FormData()
            formData.append('file', file)
            formData.append('metadata', JSON.stringify({
              ...commonMetadata,
              document_title: file.name.split('.')[0],
              tags: [],
              date: '',
              authors: []
            }))

            const response = await fetch('/api/process', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              throw new Error('Processing failed')
            }

            // Update progress to complete
            setFileProgress(prev => prev.map((item, i) => 
              i === fileIndex ? { ...item, status: 'completed', progress: 100 } : item
            ))

            return { success: true, fileName: file.name }
          } catch (error) {
            setFileProgress(prev => prev.map((item, i) => 
              i === fileIndex ? { 
                ...item, 
                status: 'error', 
                progress: 0,
                error: error instanceof Error ? error.message : 'Processing failed'
              } : item
            ))
            return { success: false, fileName: file.name, error }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Update overall progress
        const completedCount = results.filter(r => r.success).length
        setOverallProgress((completedCount / selectedFiles.length) * 100)
      }

      const successCount = results.filter(r => r.success).length
      toast.success(`Processed ${successCount} of ${selectedFiles.length} files`)
    } catch (error) {
      console.error('Bulk processing failed:', error)
      toast.error("Bulk processing failed")
    }
  }

  // Add bulk URL processing function
  const handleBulkUrlProcessing = async (entries: CsvEntry[]) => {
    try {
      // Initialize progress tracking for each URL
      const initialProgress = entries.map(entry => ({
        fileName: entry.url,
        status: 'pending' as const,
        progress: 0
      }));
      setFileProgress(initialProgress);

      // Process URLs in parallel with a limit of 3 concurrent uploads
      const batchSize = 3;
      const entriesToProcess = [...entries];
      const results = [];

      while (entriesToProcess.length > 0) {
        const batch = entriesToProcess.splice(0, batchSize);
        const batchPromises = batch.map(async (entry) => {
          const entryIndex = entries.findIndex(e => e.url === entry.url);
          
          try {
            setFileProgress(prev => prev.map((item, i) => 
              i === entryIndex ? { ...item, status: 'processing', progress: 25 } : item
            ));

            const formData = new FormData();
            formData.append('documentUrl', entry.url);
            formData.append('metadata', JSON.stringify({
              document_title: entry.document_title,
              authors: entry.authors,
              source: entry.source,
              date: entry.date,
              tags: entry.tags,
              category: '' // Category not provided in CSV
            }));

            const response = await fetch('/api/process', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Processing failed');
            }

            setFileProgress(prev => prev.map((item, i) => 
              i === entryIndex ? { ...item, status: 'completed', progress: 100 } : item
            ));

            return { success: true, fileName: entry.url };
          } catch (error) {
            setFileProgress(prev => prev.map((item, i) => 
              i === entryIndex ? { 
                ...item, 
                status: 'error', 
                progress: 0,
                error: error instanceof Error ? error.message : 'Processing failed'
              } : item
            ));
            return { success: false, fileName: entry.url, error };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Update overall progress
        const completedCount = results.filter(r => r.success).length;
        setOverallProgress((completedCount / entries.length) * 100);
      }

      const successCount = results.filter(r => r.success).length;
      toast.success(`Processed ${successCount} of ${entries.length} entries`);
    } catch (error) {
      console.error('Bulk URL processing failed:', error);
      toast.error("Bulk URL processing failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <div className="inline-block bg-primary px-4 py-1 mb-4 text-sm font-medium">
          DOCUMENT PROCESSING AND STORING TOOL
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          ATLAS🌐
          <br />
          Processing Intelligence
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl">
          Upload and process documents for advanced analysis. Our system automatically extracts key information,
          generates embeddings, and stores them into a vector database for efficient retrieval and analysis.
        </p>
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Document Processing</h2>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="url" className="text-lg mb-2">
                Single Document URL
              </Label>
              <Input
                ref={urlInputRef}
                id="url"
                type="url"
                placeholder="https://example.com/document.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="csv" className="text-lg mb-2">
                Bulk URLs via CSV
              </Label>
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-1 transition-colors border-muted-foreground/25 hover:border-primary/50"
              >
                <input
                  ref={csvInputRef}
                  id="csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                  <Button 
                    onClick={() => csvInputRef.current?.click()}
                    variant="outline"
                  >
                    Choose CSV
                  </Button>
                {csvUrls.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {csvUrls.length} entries loaded from CSV
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        </div>

        <FolderUpload 
          onFolderSelect={setSelectedFiles} 
          ref={folderInputRef}
          resetTrigger={resetTrigger as unknown as React.MutableRefObject<boolean>} 
        />
        
        {(selectedFiles.length > 0 || url) && csvUrls.length === 0 && (
          <Button 
            onClick={handleUpload} 
            className="w-full"
          >
            Continue with Upload
          </Button>
        )}

        {csvUrls.length > 0 && (
          <Button 
            onClick={() => handleBulkUrlProcessing(csvUrls)}
            className="w-full"
            variant="default"
          >
            Bulk Upload
          </Button>
        )}

        {fileProgress.length > 0 ? (
          <MultiFileProgress 
            files={fileProgress}
            overallProgress={overallProgress}
          />
        ) : processingStep > 0 ? (
          <ProcessIndicator currentStep={processingStep} />
        ) : (
          <div className="h-[150px] flex items-center justify-center">
            <p className="text-muted-foreground">No files being processed</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MetadataDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        file={selectedFiles[0]}
        url={url}
        onProcess={handleProcessing}
      />

      <BulkMetadataDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        fileCount={selectedFiles.length}
        onProcess={handleBulkProcessing}
      />
    </div>
  )
}

