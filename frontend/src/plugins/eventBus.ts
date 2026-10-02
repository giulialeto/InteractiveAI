import mitt from 'mitt'

import type { Card } from '@/types/cards'

const eventBus = mitt<{
  'graph:update': any
  'graph:showTooltip': any
  'notifications:ended': Card
  // Scrolls open panel to the top when a new notification pops up.
  'notifications:reveal': void
}>()

export default eventBus
