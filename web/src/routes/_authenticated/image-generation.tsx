import { createFileRoute, redirect } from '@tanstack/react-router'

import { MediaGeneration } from '@/features/media-generation'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

export const Route = createFileRoute('/_authenticated/image-generation')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'image')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <MediaGeneration mode='image' />,
})
