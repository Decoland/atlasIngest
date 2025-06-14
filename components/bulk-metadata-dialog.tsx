"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface BulkMetadataDialogProps {
  isOpen: boolean
  onClose: () => void
  fileCount: number
  onProcess: (metadata: any) => void
}

export default function BulkMetadataDialog({ 
  isOpen, 
  onClose, 
  fileCount, 
  onProcess 
}: BulkMetadataDialogProps) {
  const [metadata, setMetadata] = useState({
    source: "",
    category: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onProcess(metadata)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Processing Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <p className="text-muted-foreground">
            Processing {fileCount} files. Please select common metadata attributes.
          </p>

          <div>
            <Label htmlFor="source" className="text-lg">Source</Label>
            <Select 
              onValueChange={(value) => setMetadata(prev => ({ ...prev, source: value }))}
              required
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="blog_post">Blog Post</SelectItem>
                <SelectItem value="research_paper">Research Paper</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="policy_brief">Policy Brief</SelectItem>
                <SelectItem value="guide_handbook">Guide/Handbook</SelectItem>
                <SelectItem value="case_study">Case Study</SelectItem>
                <SelectItem value="interview_transcript">Interview/Transcript</SelectItem>
                <SelectItem value="whitepaper">Whitepaper</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category" className="text-lg">Category</Label>
            <Select 
              onValueChange={(value) => setMetadata(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Collaborative Networks & Decentralized Organizations">
                  Collaborative Networks & Decentralized Organizations
                </SelectItem>
                <SelectItem value="Community Currencies & Local Economies">
                  Community Currencies & Local Economies
                </SelectItem>
                <SelectItem value="Data & Analytics for Impact">
                  Data & Analytics for Impact
                </SelectItem>
                <SelectItem value="Funding Mechanisms & Philanthropy">
                  Funding Mechanisms & Philanthropy
                </SelectItem>
                <SelectItem value="Policy & Governance">
                  Policy & Governance
                </SelectItem>
                <SelectItem value="Regenerative & Ethical Finance">
                  Regenerative & Ethical Finance
                </SelectItem>
                <SelectItem value="Social Impact & Development">
                  Social Impact & Development
                </SelectItem>
                <SelectItem value="Sustainability & Climate Action">
                  Sustainability & Climate Action
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full h-12 text-lg">
            Start Processing
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 