"use client"

import { useState, useRef, useCallback } from "react"

interface VoiceRecorderState {
  isRecording: boolean
  duration: number
  audioUrl: string | null
  error: string | null
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    audioUrl: null,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setState((prev) => ({ ...prev, audioUrl: url, isRecording: false }))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()

      setState({ isRecording: true, duration: 0, audioUrl: null, error: null })

      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Microphone access denied",
        isRecording: false,
      }))
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.isRecording])

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    setState({ isRecording: false, duration: 0, audioUrl: null, error: null })
  }, [state.audioUrl])

  return {
    ...state,
    startRecording,
    stopRecording,
    clearRecording,
  }
}
