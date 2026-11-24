import { useTranslation } from 'react-i18next'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export function GenerationSizePicker(props: {
  labelId: string
  value: string
  sizes: string[]
  onChange: (size: string) => void
  disabled: boolean
}) {
  const { t } = useTranslation()

  return (
    <ToggleGroup
      aria-labelledby={props.labelId}
      value={[props.value]}
      disabled={props.disabled}
      onValueChange={(values) => {
        if (values.length) props.onChange(values[0])
      }}
      spacing={2}
      className='grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3'
    >
      {props.sizes.map((size) => {
        const [width, height] = size.split('x').map(Number)
        return (
          <ToggleGroupItem
            key={size}
            value={size}
            variant='outline'
            className='aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary h-auto min-h-20 min-w-0 flex-col gap-2 rounded-xl! px-1 py-3 text-[10px]'
          >
            <span
              className='flex h-6 items-center justify-center'
              aria-hidden='true'
            >
              <span
                className={cn(
                  'rounded-sm border-[1.5px] border-current',
                  !size && 'size-5 border-dashed',
                  width === height && 'size-5',
                  width > height && 'h-4 w-6',
                  width < height && 'h-6 w-4'
                )}
              />
            </span>
            {size ? size.replace('x', ' × ') : t('Default')}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
