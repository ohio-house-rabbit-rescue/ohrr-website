// The camera view that reads OHRR labels (QR or Code 128) and shop barcodes —
// a port of the app's src/features/scan/Scanner.tsx for the website, where
// the camera is usually a laptop's webcam. It uses the browser's own
// BarcodeDetector where it exists and falls back to ZXing (downloaded on first
// use) everywhere else; see lib/readCode.ts.
//
// Fires `onResult` ONCE with the raw text, then stops the camera. The page
// decides what the text means (codes.ts normalizeCode). With no camera, or
// the camera refused, it says so calmly; the type box above keeps working.
import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { makeNativeDetector, makeZxingReader } from '../lib/readCode'

type Phase = 'starting' | 'scanning' | 'blocked' | 'nocamera' | 'failed'

export default function Scanner({ onResult }: { onResult: (raw: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let stopped = false
    let stream: MediaStream | null = null
    let raf = 0
    let zxingStop: (() => void) | null = null

    const stopAll = () => {
      cancelAnimationFrame(raf)
      if (zxingStop) {
        try {
          zxingStop()
        } catch {
          /* already stopped */
        }
        zxingStop = null
      }
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      video.srcObject = null
    }

    const finish = (raw: string) => {
      if (stopped) return
      stopped = true
      stopAll()
      onResultRef.current(raw)
    }

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('nocamera')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (err) {
        const name = (err as { name?: string })?.name ?? ''
        setPhase(name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'failed')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        /* autoplay rules — muted + playsInline make this rare */
      }
      setPhase('scanning')

      const detector = await makeNativeDetector()
      if (stopped) return
      if (detector) {
        let last = 0
        const tick = async (now: number) => {
          if (stopped) return
          if (now - last > 140 && video.readyState >= 2) {
            last = now
            try {
              const found = await detector.detect(video)
              const hit = found.find((f) => f.rawValue)
              if (hit) return finish(hit.rawValue)
            } catch {
              /* a frame failed to decode — keep going */
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return
      }

      // No reader built in: ZXing, downloaded only now.
      try {
        const reader = await makeZxingReader()
        if (stopped || !stream) return
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result) finish(result.getText())
        })
        if (stopped) controls.stop()
        else zxingStop = () => controls.stop()
      } catch {
        if (!stopped) setPhase('failed')
      }
    })()

    return () => {
      stopped = true
      stopAll()
    }
  }, [])

  const trouble = phase === 'blocked' || phase === 'nocamera' || phase === 'failed'

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: '4 / 3' }}>
      <video ref={videoRef} playsInline muted autoPlay aria-label="What the camera sees" className={`h-full w-full object-cover ${trouble ? 'opacity-0' : ''}`} />
      {!trouble && (
        <div className="pointer-events-none absolute inset-[14%] rounded-2xl" aria-hidden="true">
          {[
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
          ].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-white/90 ${c}`} />
          ))}
        </div>
      )}
      <p role="status" className="absolute inset-x-0 bottom-4 px-4 text-center text-base font-bold text-white drop-shadow">
        {phase === 'starting' ? 'Starting the camera…' : phase === 'scanning' ? 'Hold the label or barcode up to the camera' : ''}
      </p>
      {trouble && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
          <Icon name="camera" size={36} className="text-white/70" />
          <p className="font-display text-lg font-black">
            {phase === 'blocked' ? 'The camera is turned off for this site' : phase === 'nocamera' ? 'No camera found' : 'The camera didn’t start'}
          </p>
          <p className="text-base text-white/85">
            {phase === 'blocked'
              ? 'You can allow it from the camera symbol in the browser’s address bar. Or type the code above, or read it from a photo.'
              : 'You can still type the code above, or read it from a photo.'}
          </p>
        </div>
      )}
    </div>
  )
}
