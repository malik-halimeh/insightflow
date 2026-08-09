export default defineAppConfig({
  ui: {
    colors: {
      primary: 'turquoise',
      secondary: 'slate',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'slate'
    },

    // Defaults are set so the shortest possible markup is already correct:
    // <UButton>Save</UButton> is the primary action, <UBadge>New</UBadge> is quiet.
    button: {
      defaultVariants: { size: 'md', color: 'primary', variant: 'solid' },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-primary-950' }
      ]
    },

    input: {
      defaultVariants: { size: 'md', variant: 'outline' }
    },

    badge: {
      defaultVariants: { size: 'md', color: 'neutral', variant: 'subtle' },
      /*
        The mirror of the button rule above. A solid badge is the accent carrying
        dark ink and reads well; a subtle one is a 10% tint carrying the accent as
        ink, and turquoise 500 on its own tint measures 1.95:1. Stepping the ink
        down to 800 on light paper and up to 400 on dark clears AA without
        touching the fill anywhere it is already correct.
      */
      compoundVariants: [
        {
          color: 'primary',
          variant: 'subtle',
          class: 'text-[var(--ui-color-primary-800)] dark:text-[var(--ui-color-primary-400)]'
        }
      ]
    },

    card: {
      defaultVariants: { variant: 'outline' }
    },

    // Tabular figures come from a base rule in main.css, not from a class here,
    // because Tailwind's tabular-nums utility is not emitted in this build.
    table: {
      slots: {
        td: 'text-sm',
        th: 'text-xs font-semibold text-muted uppercase tracking-wide'
      }
    }
  }
})
