import { LetterAvatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from 'class-variance-authority'

// This is not so different from RadixUI Avatar, except that there's no
// onload logic, which causes flickering

const avatarVariants = cva('flex rounded-full h-full w-full overflow-hidden border', {
  variants: {
    size: {
      default: 'w-8 h-8 text-sm',
      big: 'w-12 h-12 text-xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

interface Props extends VariantProps<typeof avatarVariants> {
  url?: string
  fallback: string
  className?: string
}

export const Avatar = ({ url, size, fallback, className }: Props) => {
  return (
    <div className={cn(avatarVariants({ size }), className)}>
      {url ? (
        <img src={url} className="object-cover"></img>
      ) : (
        <LetterAvatar size="fillParent" name={fallback}></LetterAvatar>
      )}
    </div>
  )
}
