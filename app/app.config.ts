export default defineAppConfig({
  ui: {
    // The accent is blue, not green, so that green can mean one thing only:
    // a number went up. In a product made of percentage changes, an accent
    // sharing a colour with "revenue rose" would drain the signal from both.
    colors: {
      primary: 'blue',
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
      defaultVariants: { size: 'md', color: 'primary', variant: 'solid' }
    },

    input: {
      defaultVariants: { size: 'md', variant: 'outline' }
    },

    badge: {
      defaultVariants: { size: 'md', color: 'neutral', variant: 'subtle' }
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
