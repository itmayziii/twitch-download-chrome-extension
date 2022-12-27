try {
  await main()
} catch (error) {
  console.error(error)
}

const cache: Partial<Record<string, string>> = {}

async function main (): Promise<void> {
  onUrlChange(function handleUrlChange (url, oldUrl) {
    const isClipPage = /^https:\/\/www.twitch.tv\/.*\/clip\/.*/.test(url)
    if (!isClipPage) return

    const cachedValue = cache[url]
    if (cachedValue !== undefined) {
      makeTitleDownloadableLink(cachedValue, url)
        .catch(console.error)
      return
    }

    waitForEl<HTMLVideoElement>('video', (videoEl) => {
      // Best way to explain this is the page URL will change, but that doesn't mean the clip on the page has
      // changed yet since Twitch is an SPA. This is why we need to check if the clip we found is from the old URL.
      const isOldPage = cache[oldUrl] === videoEl.src

      return !isOldPage && isTwitchClip(videoEl.src)
    })
      .then(async videoEl => {
        cache[url] = videoEl.src
        await makeTitleDownloadableLink(videoEl.src, url)
      })
      .catch(console.error)
  })
}

let currentUrl: string
/**
 * This is a bit hacky of a solution, but essentially anytime the document changes we check if the URL has changed.
 * There isn't a great way to listen to URL changes, but unfortunately events like "popstate" do not work as expected.
 * i.e. The "popstate" event is only fired during browser events like the forward and back button but not when
 * history.pushState is called and Twitch is an SPA, so they use history.pushState for routing. This event is fired
 * on the initial URL as well as subsequent URL changes.
 * @param callback
 */
function onUrlChange (callback: (url: string, oldUrl: string) => void): void {
  const observer = new MutationObserver(mutations => {
    if (currentUrl === window.location.href) return
    const oldUrl = currentUrl
    currentUrl = window.location.href
    callback(currentUrl, oldUrl)
  })
  observer.observe(window.document, {
    childList: true,
    subtree: true
  })
}

function isTwitchClip (link: string): boolean {
  return link.startsWith('https://production.assets.clips.twitchcdn.net')
}

async function makeTitleDownloadableLink (link: string, forUrl: string): Promise<void> {
  const titleEl = await waitForEl('[data-a-target="stream-title"]')
  if (window.location.href !== forUrl) return
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
        return resolve(el)
      }
    })

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
        observer.disconnect()
        return resolve(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  })
}

export {}
