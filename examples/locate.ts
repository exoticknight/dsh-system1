import type { Context } from '@deepseek-ai/cordis'
import { toUtf16Range } from 'dsh-system1'
import type { ImageInput } from 'dsh-system1/contracts'

/** Enable Locate and configure a text route before calling this example. */
export async function highlightDates(ctx: Context, text: string) {
  const result = await ctx.system1.locate({
    source: { type: 'text', text },
    instructions: 'Find each date as written, including repeated dates.',
  })
  if (result.status === 'error') return result
  return result.matches.map((match) => ({
    text: match.text,
    range: toUtf16Range(text, match.start, match.end),
  }))
}

/** Enable Locate first; the explicit Liquid model supplies this call's route. */
export async function markOrangeRectangles(
  ctx: Context,
  image: ImageInput,
  dimensions: { width: number; height: number },
) {
  const result = await ctx.system1.locate({
    source: { type: 'image', image },
    instructions: 'Find every orange rectangle.',
  }, { model: { provider: 'liquid', model: 'd1.2' } })
  if (result.status === 'error') return result
  const { width, height } = dimensions
  return result.matches.map(({ left, top, right, bottom }) => ({
    x: left * width,
    y: top * height,
    width: (right - left) * width,
    height: (bottom - top) * height,
  }))
}
