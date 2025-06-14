"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface MetadataFormProps {
  file: File | null
  url: string
  onSubmit: (metadata: any) => void
  initialMetadata?: any
}

export default function MetadataForm({ file, url, onSubmit, initialMetadata }: MetadataFormProps) {
  const [metadata, setMetadata] = useState({
    text: "",
    document_title: "",
    source: "",
    category: "",
    tags: [] as string[],
    date: "",
    authors: [] as string[],
  })

  const [newTag, setNewTag] = useState("")
  const [newAuthor, setNewAuthor] = useState("")

  useEffect(() => {
    const generateId = () => Math.random().toString(36).substr(2, 9)

    setMetadata((prev) => ({
      ...prev,
      document_id: `doc-${generateId()}`,
      chunk_id: `chunk-${generateId()}`,
      document_title: initialMetadata?.title || (file ? file.name.split(".")[0] : url.split("/").pop() || ""),
      date: initialMetadata?.publicationDate || new Date().toISOString().split("T")[0],
      authors: initialMetadata?.authors || [],
      tags: initialMetadata?.tags || [],
      source: initialMetadata?.source || "",
      category: initialMetadata?.category || "",
    }))

    setTimeout(() => {
      setMetadata((prev) => ({
        ...prev,
        // category: "Technology",
        // tags: ["document", "upload", "ai"],
        // authors: ["John Doe"],
      }))
    }, 1000)
  }, [file, url, initialMetadata])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(metadata)
  }

  const addTag = () => {
    if (newTag && !metadata.tags.includes(newTag)) {
      setMetadata((prev) => ({ ...prev, tags: [...prev.tags, newTag] }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setMetadata((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const addAuthor = () => {
    if (newAuthor && !metadata.authors.includes(newAuthor)) {
      setMetadata((prev) => ({ ...prev, authors: [...prev.authors, newAuthor] }))
      setNewAuthor("")
    }
  }

  const removeAuthor = (author: string) => {
    setMetadata((prev) => ({ ...prev, authors: prev.authors.filter((a) => a !== author) }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      addTag()
    }
  }

  const handleAuthorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      addAuthor()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="document_title" className="text-lg">
            Title
          </Label>
          <Input
            id="document_title"
            value={metadata.document_title}
            onChange={(e) => setMetadata({ ...metadata, document_title: e.target.value })}
            placeholder="Enter document title"
            className="h-12"
          />
        </div>

        <div>
          <Label htmlFor="source" className="text-lg">
            Source
          </Label>
          <Select onValueChange={(value) => setMetadata({ ...metadata, source: value })}>
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
          <Label htmlFor="category" className="text-lg">
            Category
          </Label>
          <Select onValueChange={(value) => setMetadata({ ...metadata, category: value })}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Collaborative Networks & Decentralized Organizations">Collaborative Networks & Decentralized Organizations</SelectItem>
              <SelectItem value="Community Currencies & Local Economies">Community Currencies & Local Economies</SelectItem>
              <SelectItem value="Data & Analytics for Impact">Data & Analytics for Impact</SelectItem>
              <SelectItem value="Funding Mechanisms & Philanthropy">Funding Mechanisms & Philanthropy</SelectItem>
              <SelectItem value="Policy & Governance">Policy & Governance</SelectItem>
              <SelectItem value="Regenerative & Ethical Finance">Regenerative & Ethical Finance</SelectItem>
              <SelectItem value="Social Impact & Development">Social Impact & Development</SelectItem>
              <SelectItem value="Sustainability & Climate Action">Sustainability & Climate Action</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tags" className="text-lg">
            Tags
          </Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm py-1 px-3">
                {tag}
                <X className="h-4 w-4 ml-2 cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)} />
              </Badge>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              id="tags"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag"
              className="h-12"
            />
            <Button type="button" onClick={addTag} className="h-12 px-6">
              Add
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="date" className="text-lg">
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={metadata.date}
            onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
            className="h-12"
          />
        </div>

        <div>
          <Label htmlFor="authors" className="text-lg">
            Authors / Contributors
          </Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {metadata.authors.map((author) => (
              <Badge key={author} variant="secondary" className="text-sm py-1 px-3">
                {author}
                <X
                  className="h-4 w-4 ml-2 cursor-pointer hover:text-destructive"
                  onClick={() => removeAuthor(author)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              id="authors"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              onKeyDown={handleAuthorKeyDown}
              placeholder="Add an author or contributor"
              className="h-12"
            />
            <Button type="button" onClick={addAuthor} className="h-12 px-6">
              Add
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-lg">
          Upload and Process
        </Button>
      </div>
    </form>
  )
}

