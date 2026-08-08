export default defineAppConfig({
  ui: {
    /*
      Warm amber on a cool zinc page. The palette is given, so this block records
      what each name resolves to and where the one real conflict landed.

        primary   amber   the brand accent. #D97706 is amber 600, pinned in main.css
        neutral   zinc    #FAFAFA page, #FFFFFF card, #09090B ink, #E4E4E7 rules
        success   emerald a figure that rose
        error     rose    a figure that fell
        info      sky     background information
        warning   amber   something wanting attention

      Warning and primary now share a hue, which the previous blue accent was
      chosen specifically to avoid. Keeping them together is the deliberate call
      rather than an oversight: every remaining warm hue (orange, yellow) sits
      closer to either amber or rose than amber sits to itself, so moving warning
      would trade a conceptual collision for a visual one.

      In practice they never compete. Warning only ever renders as a tint, in the
      admin queue beside emerald and rose and on the upload report beside muted
      grey, and the brand only ever renders as a solid fill. Tint against fill is
      a real distinction; two adjacent warm hues would not have been.
    */
    colors: {
      primary: 'amber',
      secondary: 'zinc',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'zinc'
    },

    // Defaults are set so the shortest possible markup is already correct:
    // <UButton>Save</UButton> is the primary action, <UBadge>New</UBadge> is quiet.
    button: {
      defaultVariants: { size: 'md', color: 'primary', variant: 'solid' },
      slots: {
        // The label carries the weight. Buttons sit among body text everywhere in
        // this app, and a semibold label is what separates an action from a sentence.
        base: 'font-semibold transition-colors duration-150'
      },
      /*
        Dark ink on the accent, not white.

        Nuxt UI puts `text-inverted` on every solid button, which is white in light
        mode. That was right for blue. On amber 600 it measures 3.18:1 and fails AA
        for a label. The palette's own #09090B on the same fill measures 6.25:1.

        Set here rather than on --ui-text-inverted, because that token is shared
        with `bg-inverted`: moving it would paint a near-black label on the
        near-black neutral button and erase it.
      */
      compoundVariants: [{
        color: 'primary',
        variant: 'solid',
        class: 'text-[var(--ui-color-neutral-950)]'
      }]
    },

    // Same reasoning as the button: the active tab pill is filled with the accent.
    tabs: {
      compoundVariants: [{
        color: 'primary',
        variant: 'pill',
        class: 'data-[state=active]:text-[var(--ui-color-neutral-950)]'
      }]
    },

    input: {
      defaultVariants: { size: 'md', variant: 'outline' }
    },

    badge: {
      defaultVariants: { size: 'md', color: 'neutral', variant: 'subtle' },
      /*
        The mirror of the button rule. A subtle badge is a tint carrying the
        accent as ink rather than a fill, and #D97706 as 12px ink on its own 10%
        tint measures 2.73:1. Stepping the ink down to 700 on light paper and up
        to 400 on dark clears AA without touching the fill anywhere else.
      */
      compoundVariants: [{
        color: 'primary',
        variant: 'subtle',
        class: 'text-[var(--ui-color-primary-800)] dark:text-[var(--ui-color-primary-400)]'
      }]
    },

    card: {
      defaultVariants: { variant: 'outline' },
      slots: {
        /*
          A hairline and a tinted shadow, not a drop shadow.

          The card stays on `bg-default`, which this palette keeps at #FFFFFF while
          painting the page #FAFAFA behind it (see main.css). The two are only a
          hair apart, so the ring and this shadow are what actually separate them.

          Tinted to zinc rather than pure black. Pure black under a near-white
          surface reads as dirt.
        */
        root: 'shadow-[0_1px_2px_-1px_rgb(9_9_11/0.06),0_2px_8px_-2px_rgb(9_9_11/0.05)]'
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
