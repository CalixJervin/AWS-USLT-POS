import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[#D4A574]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[#C4A882]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[#D4A574]" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1C1412] group-[.toaster]:text-[#F5EFE6] group-[.toaster]:border-[#D4A574] group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-[#C4A882]",
          actionButton:
            "group-[.toast]:bg-[#D4A574] group-[.toast]:text-[#1C1412] font-bold",
          cancelButton:
            "group-[.toast]:bg-[#2C1F17] group-[.toast]:text-[#F5EFE6]",
          success: "group-[.toast]:border-[#D4A574]",
          error: "group-[.toast]:border-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
