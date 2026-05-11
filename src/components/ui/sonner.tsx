"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-[#C8FF00]" />,
        info:    <InfoIcon className="size-[18px] text-blue-400" />,
        warning: <TriangleAlertIcon className="size-[18px] text-amber-400" />,
        error:   <OctagonXIcon className="size-[18px] text-rose-400" />,
        loading: <Loader2Icon className="size-[18px] animate-spin text-white/50" />,
      }}
      style={
        {
          // Base
          "--border-radius":   "18px",
          "--width":           "360px",

          // Normal
          "--normal-bg":       "#1F1F1E",
          "--normal-text":     "#EDEDED",
          "--normal-border":   "rgba(255,255,255,0.07)",

          // Success
          "--success-bg":      "#1F1F1E",
          "--success-text":    "#EDEDED",
          "--success-border":  "rgba(200,255,0,0.25)",

          // Error
          "--error-bg":        "#1F1F1E",
          "--error-text":      "#EDEDED",
          "--error-border":    "rgba(244,63,94,0.25)",

          // Warning
          "--warning-bg":      "#1F1F1E",
          "--warning-text":    "#EDEDED",
          "--warning-border":  "rgba(245,158,11,0.25)",

          // Info
          "--info-bg":         "#1F1F1E",
          "--info-text":       "#EDEDED",
          "--info-border":     "rgba(96,165,250,0.25)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:       "!shadow-[0_20px_60px_rgba(0,0,0,0.7)] !border !backdrop-blur-sm",
          title:       "!font-bold !text-[13px] !text-white !tracking-tight",
          description: "!text-[11px] !text-white/40 !font-medium !mt-0.5 !leading-relaxed",
          icon:        "!mt-[1px]",
          closeButton: "!bg-white/5 !border-white/10 !text-white/30 hover:!bg-white/10 hover:!text-white/60 !transition-colors",
          actionButton:"!bg-[#C8FF00] !text-[#1A1A18] !font-black !text-[10px] !uppercase !tracking-widest !rounded-xl",
          cancelButton:"!bg-white/5 !text-white/50 !font-bold !text-[10px] !uppercase !tracking-widest !rounded-xl",
          // Colores de borde izquierdo por tipo (sutil acento)
          success:     "!border-l-2 !border-l-[#C8FF00]/60",
          error:       "!border-l-2 !border-l-rose-500/60",
          warning:     "!border-l-2 !border-l-amber-400/60",
          info:        "!border-l-2 !border-l-blue-400/60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
