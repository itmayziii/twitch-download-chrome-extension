try {
  await main()
} catch (error) {
  // TODO maybe we should report this error somewhere
  console.error('Failed to insert Twitch download link', error)
}

async function main (): Promise<void> {
  const twitchClipEl = await waitForEl<HTMLVideoElement>('video', (el) => isTwitchClip(el.src))
  return await makeTitleDownloadableLink(twitchClipEl.src)
}

function isTwitchClip (link: string): boolean {
  return link.startsWith('https://production.assets.clips.twitchcdn.net')
}

async function makeTitleDownloadableLink (link: string): Promise<void> {
  const titleEl = await waitForEl('[data-a-target="stream-title"]')
  titleEl.innerHTML = `<a download href='${link}'>${titleEl.textContent ?? 'Untitled Clip'}</a>`
}

type ConditionFn<E extends Element> = (el: E) => boolean
/**
 * Wait for an element on the page because Twitch uses JavaScript to render a lot of content. Chrome extensions have
 * a configuration called "run_at" but the behavior of Twitch is too erratic to rely on this.
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#run_time
 * @param selector - selector matching the signature of document.querySelector(selector)
 * @param condition - only return the matched selector if the condition passes
 */
async function waitForEl<E extends Element> (selector: string, condition?: ConditionFn<E>): Promise<E> {
  return await new Promise((resolve, reject) => {
    const els = document.querySelectorAll<E>(selector)
    els.forEach(el => {
      if (condition === undefined || condition(el)) {
        console.log('Immediately matched El', el)
        return resolve(el)
      }
    })

    // eslint-disable-next-line prefer-const
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const observer = new MutationObserver(() => {
      const els = document.querySelectorAll<E>(selector)
      let el: E | undefined
      els.forEach(e => {
        if (condition === undefined || condition(e)) {
          el = e
        }
      })

      if (el === undefined) return

      if (condition === undefined || condition(el)) {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }

        console.log('Matched el in mutation observer', el)
        observer.disconnect()
        return resolve(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // We should eventually give up on listening, 3 minutes is arbitrary, but feels like enough time to stop.
    timeoutId = setTimeout(function stopListening () {
      observer.disconnect()
      reject(new Error(`Timeout waiting for selector ${selector}`))
    }, 180000)
  })
}

export {}
