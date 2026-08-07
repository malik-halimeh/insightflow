export default defineAppConfig({
  ui: {
    /*
      Colour means data. Everything else is monochrome.

      This product is made almost entirely of figures moving up and down, so the
      four semantic colours are the ones doing real work: green for a figure that
      rose, rose for one that fell, amber for something wanting attention, sky for
      background information. They are spent nowhere else.

      That constrains the accent hard. It cannot be green, or "revenue rose" stops
      meaning anything. It cannot be red or amber for the same reason. Blue is what
      is left, and it earns its place by staying out of the way of the data.

      What changes the page is the neutral. Taupe is warm where slate was cold, so
      every surface, border and line of body text across all fourteen routes shifts
      with it, and the one cool accent now reads as deliberate against a warm page
      instead of disappearing into a cold one.
    */
    colors: {
      primary: 'blue',
      secondary: 'taupe',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'taupe'
    },

    // Defaults are set so the shortest possible markup is already correct:
    // <UButton>Save</UButton> is the primary action, <UBadge>New</UBadge> is quiet.
    button: {
      defaultVariants: { size: 'md', color: 'primary', variant: 'solid' },
      slots: {
        // The label carries the weight. Buttons sit among body text everywhere in
        // this app, and a semibold label is what separates an action from a sentence.
        base: 'font-medium transition-colors duration-150'
      }
    },

    input: {
      defaultVariants: { size: 'md', variant: 'outline' }
    },

    badge: {
      defaultVariants: { size: 'md', color: 'neutral', variant: 'subtle' }
    },

    card: {
      defaultVariants: { variant: 'outline' },
      slots: {
        // A hairline and a tinted shadow, not a drop shadow. Pure black under a
        // warm surface reads as dirt; a shadow tinted toward the page keeps the
        // card sitting on the paper rather than floating above a hole in it.
        root: 'shadow-[0_1px_2px_-1px_rgb(41_37_36/0.08),0_2px_8px_-2px_rgb(41_37_36/0.06)]'
      }
    },

    // Tabular figures come from a base rule in main.css, not from a class here,
    // because Tailwind's tabular-nums utility is not emitted in this build.
    table: {
      slots: {
        td: 'text-sm',
        // Column headings are labels, not headlines. Small, quiet, and spaced so
        // they read as the frame around the data rather than competing with it.
        th: 'text-xs font-medium text-dimmed uppercase tracking-[0.08em]'
      }
    }
  }
})
