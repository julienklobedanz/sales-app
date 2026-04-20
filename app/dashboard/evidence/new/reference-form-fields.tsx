'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Loader } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AppIcon } from '@/lib/icons'

import { searchCompanySuggestions } from './actions'

export type ReferenceFormCompany = {
  id: string
  name: string
  logo_url?: string | null
}

export function FileDropZone({
  selectedFile,
  onFileSelect,
  disabled,
  existingFilePath,
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
  existingFilePath?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file?.type === 'application/pdf') {
      onFileSelect(file)
    } else if (file) {
      toast.error('Bitte nur PDF-Dateien hochladen.')
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    onFileSelect(file ?? null)
  }
  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const displayName =
    selectedFile?.name ?? (existingFilePath ? existingFilePath.split('/').pop() : null)

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        {displayName ? (
          <>
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                onFileSelect(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Entfernen
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">
            PDF hier ablegen oder klicken zum Auswählen
          </span>
        )}
      </div>
    </div>
  )
}

export function LogoDropZone({
  selectedFile,
  onFileSelect,
  disabled,
  enrichedLogoUrl = null,
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
  enrichedLogoUrl?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [logoOnDarkBg, setLogoOnDarkBg] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    } else {
      onFileSelect(null)
    }
  }

  const handleLogoLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const width = (canvas.width = 8)
      const height = (canvas.height = 8)
      ctx.drawImage(img, 0, 0, width, height)
      const data = ctx.getImageData(0, 0, width, height).data
      let sum = 0
      const pixels = width * height
      for (let i = 0; i < pixels; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        sum += (r + g + b) / 3
      }
      const avg = sum / pixels
      setLogoOnDarkBg(avg > 210)
    } catch {
      // Canvas-Zugriff kann bei externen Bildern fehlschlagen (CORS)
    }
  }

  const showEnrichedLogo = !selectedFile && enrichedLogoUrl

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex min-h-[72px] min-w-[72px] w-20 h-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 text-center text-[11px] text-muted-foreground transition-colors',
          showEnrichedLogo
            ? 'border border-muted-foreground/25 bg-background'
            : isDragging
              ? 'border-primary bg-primary/5'
              : 'border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
          disabled ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {selectedFile ? (
          <span className="px-1">{selectedFile.name}</span>
        ) : showEnrichedLogo ? (
          <div
            className={[
              'flex h-full w-full items-center justify-center rounded-md',
              logoOnDarkBg ? 'bg-foreground' : 'bg-transparent',
            ].join(' ')}
          >
            <img
              src={enrichedLogoUrl}
              alt="Firmenlogo"
              className="max-h-full max-w-full object-contain p-1"
              onLoad={handleLogoLoaded}
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <span>Logo hier ablegen oder klicken</span>
        )}
      </div>
    </div>
  )
}

export function MagicImportDropzone({
  onFileAccept,
  loading,
  disabled,
}: {
  onFileAccept: (file: File) => void
  loading: boolean
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const acceptTypes =
    'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx'

  const MAX_SIZE_BYTES = 4.5 * 1024 * 1024
  const validateAndAccept = (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Datei zu groß für automatische Erkennung (Max 4.5MB).')
      return
    }
    const ok =
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|pptx|doc|docx)$/i.test(file.name)
    if (ok) onFileAccept(file)
    else toast.error('Nur Word-, PowerPoint- oder PDF-Dateien werden unterstützt.')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !loading) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || loading) return
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndAccept(file)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndAccept(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === 'Enter' && !disabled && !loading && inputRef.current?.click()
        }
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          isDragging && !loading
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30',
          disabled || loading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        {loading ? (
          <>
            <AppIcon
              icon={Loader}
              size={32}
              className="text-muted-foreground animate-spin"
            />
            <span className="text-muted-foreground text-sm font-medium">
              KI analysiert Dokument… Bitte warten (bis zu 30 Sek.)
            </span>
          </>
        ) : (
          <>
            <p className="text-foreground text-sm font-medium">
              Hast du schon ein Referenzdokument?
            </p>
            <p className="text-muted-foreground max-w-md text-sm">
              Lege jetzt deine Word, PowerPoint, oder PDF-Datei hier ab, um das Formular
              automatisch zu befüllen.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export function CompanyCombobox({
  companies,
  value,
  onValueChange,
  onSelectCompany,
  onConfirmValue,
  loading,
  disabled,
  inputClassName,
}: {
  companies: ReferenceFormCompany[]
  value: string
  onValueChange: (value: string) => void
  onSelectCompany: (company: ReferenceFormCompany) => void
  onConfirmValue?: (value: string) => void
  loading: boolean
  disabled: boolean
  inputClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [remoteSuggestions, setRemoteSuggestions] = useState<ReferenceFormCompany[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trimmed = value.trim().toLowerCase()
  const localFiltered = companies.filter((c) =>
    trimmed ? c.name.toLowerCase().includes(trimmed) : true,
  )
  const mergedSuggestions: ReferenceFormCompany[] = [
    ...localFiltered,
    ...remoteSuggestions.filter((r) => !companies.some((c) => c.id === r.id)),
  ]
  const showList = open && value.trim().length > 0

  useEffect(() => {
    const q = value.trim()
    if (!q) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearching(true)
      searchCompanySuggestions(q)
        .then((result) => {
          if (result.success) {
            const suggestions = (result.suggestions ?? []).map<ReferenceFormCompany>((s) => ({
              id: s.id,
              name: s.name,
              logo_url: s.logo_url ?? null,
            }))
            setRemoteSuggestions(suggestions)
          } else {
            console.error('Unternehmenssuche fehlgeschlagen:', result.error)
            setRemoteSuggestions([])
          }
        })
        .finally(() => {
          setSearching(false)
        })
    }, 300)
  }, [value])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value)
            const next = e.target.value.trim().length > 0
            setOpen(next)
          }}
          onFocus={() => {
            if (value.trim().length > 0) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const current = e.currentTarget.value.trim()
              if (!current) return
              e.preventDefault()
              setOpen(false)
              onConfirmValue?.(current)
            }
          }}
          placeholder="Unternehmen eingeben"
          className={`w-full cursor-text ${inputClassName ?? ''}`}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-60 overflow-y-auto py-1 text-sm">
          {mergedSuggestions.map((company) => (
            <button
              key={company.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left hover:bg-muted"
              onClick={() => {
                onSelectCompany(company)
                setOpen(false)
              }}
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt=""
                  className="h-5 w-5 flex-shrink-0 rounded object-contain"
                />
              ) : (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                  <AppIcon icon={Building2} size={12} />
                </span>
              )}
              <span className="truncate">{company.name}</span>
            </button>
          ))}
          {mergedSuggestions.length === 0 && !searching && !loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Keine Treffer. Neuer Name wird verwendet.
            </div>
          )}
          {(searching || loading) && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <AppIcon icon={Loader} size={12} className="animate-spin" />
              Suche nach Unternehmen …
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
