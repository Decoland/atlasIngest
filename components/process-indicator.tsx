"use client"

import { Progress } from "@/components/ui/progress"
import { useState, useEffect } from "react"

interface ProcessIndicatorProps {
  currentStep: number
}

export default function ProcessIndicator({ currentStep }: ProcessIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const percentage = (currentStep / 4) * 100
    setProgress(percentage)
  }, [currentStep])

  return <Progress value={progress} className="h-3 w-full" />
}

