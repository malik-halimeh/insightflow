import type { H3Event } from 'h3'

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

/**
 * Sends one transactional email through Elastic Email's REST API v4.
 * https://elasticemail.com/developers/api-documentation/rest-api#tag/Emails/operation/EmailsController_transactional_post
 *
 * Only used by the forgot-password flow today, kept generic in case another
 * flow needs a transactional email later.
 */
export async function sendEmail(event: H3Event, input: SendEmailInput): Promise<void> {
  const config = useRuntimeConfig(event)

  // Env values are taken literally, so stray whitespace from a copy-paste
  // (a trailing space, a trailing newline) ends up inside the string. That's
  // invisible in a terminal or editor but breaks the API key/from-address as
  // soon as it's sent as a header, so every config value is trimmed here.
  const apiKey = config.elasticEmailApiKey?.trim()
  const fromEmail = config.elasticEmailFromEmail?.trim()
  const fromName = config.elasticEmailFromName?.trim() || 'InsightFlow'

  if (!apiKey || !fromEmail) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Email sending is not configured on this server.'
    })
  }

  try {
    await $fetch('https://api.elasticemail.com/v4/emails/transactional', {
      method: 'POST',
      headers: {
        'X-ElasticEmail-ApiKey': apiKey
      },
      body: {
        Recipients: { To: [input.to] },
        Content: {
          From: `${fromName} <${fromEmail}>`,
          Subject: input.subject,
          Body: [{ ContentType: 'HTML', Content: input.html, Charset: 'utf-8' }]
        }
      }
    })
  } catch (error: any) {
    // Elastic Email being down or misconfigured shouldn't leak into a stack
    // trace on the sign-in surface — one clear message either way for the
    // user. The real cause (bad key, bad from-address, quota, network) is
    // logged server-side so it's actually diagnosable.
    //
    // ofetch's default error message is just "400 Bad Request" — the actual
    // reason Elastic Email gives (invalid key, unverified sender, etc.) lives
    // in the response body, at error.data (or error.response._data as a
    // fallback across ofetch versions). Logging both so nothing is hidden.
    console.error('[sendEmail] Elastic Email request failed:', {
      status: error?.response?.status ?? error?.statusCode,
      body: error?.data ?? error?.response?._data ?? error?.message
    })
    throw createError({
      statusCode: 502,
      statusMessage: 'We could not send that email right now. Please try again shortly.'
    })
  }
}
