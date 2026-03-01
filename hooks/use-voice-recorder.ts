"use client"

import { useState, useRef, useCallback } from "react"

interface VoiceRecorderState {
  isRecording: boolean
  duration: number
  audioUrl: string | null
  audioBlob: Blob | null
  error: string | null
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    audioUrl: null,
    audioBlob: null,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Keep a ref to the current isRecording state so stopRecording doesn't
  // capture a stale closure value
  const isRecordingRef = useRef(false)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick the best supported MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ""

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        isRecordingRef.current = false
        const effectiveMime = mediaRecorder.mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type: effectiveMime })
        const url = URL.createObjectURL(blob)
        setState((prev) => ({ ...prev, audioUrl: url, audioBlob: blob, isRecording: false }))
        stream.getTracks().forEach((track) => track.stop())
      }

      // Request data every 250ms to ensure we get chunks even for short recordings
      mediaRecorder.start(250)

      isRecordingRef.current = true
      setState({ isRecording: true, duration: 0, audioUrl: null, audioBlob: null, error: null })

      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    } catch {
      isRecordingRef.current = false
      setState((prev) => ({
        ...prev,
        error: "Microphone access denied",
        isRecording: false,
      }))
    }
  }, [])

  // Use isRecordingRef instead of state.isRecording to avoid stale closure
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    setState({ isRecording: false, duration: 0, audioUrl: null, audioBlob: null, error: null })
  }, [state.audioUrl])

  return {
    ...state,
    startRecording,
    stopRecording,
    clearRecording,
  }
}
