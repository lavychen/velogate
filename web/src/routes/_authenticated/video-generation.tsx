import { createFileRoute, redirect } from '@tanstack/react-router'

import { MediaGeneration } from '@/features/media-generation'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

export const Route = createFileRoute('/_authenticated/video-generation')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'video')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <MediaGeneration mode='video' />,
})
