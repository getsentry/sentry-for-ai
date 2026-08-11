# Browser attributes

Browser environment and web-vital attributes on client spans.

| Key | Type | Brief |
| --- | --- | --- |
| `browser.bfcache.frame` | `string` | Which frame in the page’s frame tree a back/forward cache not-restored reason originated from: the top document or a child frame. |
| `browser.bfcache.not_restored_reason_count` | `integer` | The number of reported reasons a page was not restored from the back/forward cache on a back/forward navigation. 0 when the browser reported no reasons (e.g. non-Chromium browsers). |
| `browser.bfcache.outcome` | `string` | Whether a back/forward navigation was restored from the browser’s back/forward cache (bfcache). ‘hit’ means the page was restored; ‘miss’ means it was reloaded. |
| `browser.bfcache.reason` | `string` | A browser-reported reason a page was not restored from the back/forward cache on a back/forward navigation, taken from the notRestoredReasons API. Reported per reason (a single miss can have several). Currently Chromium-only. |
| `browser.name` | `string` | The name of the browser. |
| `browser.performance.navigation.activation_start` | `double` | The time between initiating a navigation to a page and the browser activating the page |
| `browser.performance.time_origin` | `double` | The browser’s performance.timeOrigin timestamp representing the time when the pageload was initiated |
| `browser.report.type` | `string` | A browser report sent via reporting API.. |
| `browser.script.invoker` | `string` | How a script was called in the browser. |
| `browser.script.invoker_type` | `string` | Browser script entry point type. |
| `browser.script.source_char_position` | `integer` | A number representing the script character position of the script. |
| `browser.version` | `string` | The version of the browser. |
| `browser.web_vital.cls.report_event` | `string` | The event that caused the SDK to report CLS (pagehide or navigation) |
| `browser.web_vital.cls.source.<key>` | `string` | The HTML elements or components responsible for the layout shift. <key> is a numeric index from 1 to N |
| `browser.web_vital.cls.value` | `double` | The value of the recorded Cumulative Layout Shift (CLS) web vital |
| `browser.web_vital.fcp.value` | `double` | The time it takes for the browser to render the first piece of meaningful content on the screen |
| `browser.web_vital.fp.value` | `double` | The time in milliseconds it takes for the browser to render the first pixel on the screen |
| `browser.web_vital.inp.value` | `double` | The value of the recorded Interaction to Next Paint (INP) web vital |
| `browser.web_vital.lcp.element` | `string` | The HTML element selector or component name for which LCP was reported |
| `browser.web_vital.lcp.id` | `string` | The id of the dom element responsible for the largest contentful paint |
| `browser.web_vital.lcp.load_time` | `integer` | The time it took for the LCP element to be loaded |
| `browser.web_vital.lcp.render_time` | `integer` | The time it took for the LCP element to be rendered |
| `browser.web_vital.lcp.report_event` | `string` | The event that caused the SDK to report LCP (pagehide or navigation) |
| `browser.web_vital.lcp.size` | `integer` | The size of the largest contentful paint element |
| `browser.web_vital.lcp.url` | `string` | The url of the dom element responsible for the largest contentful paint |
| `browser.web_vital.lcp.value` | `double` | The value of the recorded Largest Contentful Paint (LCP) web vital |
| `browser.web_vital.ttfb.request_time` | `double` | The time it takes for the server to process the initial request and send the first byte of a response to the user’s browser |
| `browser.web_vital.ttfb.value` | `double` | The value of the recorded Time To First Byte (TTFB) web vital in Milliseconds |
