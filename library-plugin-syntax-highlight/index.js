const hljs = require('highlight.js')

const externalStyles = ['//cdnjs.cloudflare.com/ajax/libs/highlight.js/10.0.0/styles/default.min.css']

const transform = (html) => {
  // find preprocessed code blocks
  html = html.replace(/<pre><code>(.|\n)*?<\/code><\/pre>/igm, (match) => {
    // try to find language hint within text block
    const [, lang, codeText] = match.match(/^<pre><code>(.+)?\n((.|\n)*)<\/code><\/pre>/) || []

    // remove language hint if it exists
    if (lang) match = match.replace(`${lang}`, '')

    // if supported by highlight.js, highlight!
    if (lang && hljs.getLanguage(lang)) {
      const highlighted = hljs.highlight(lang, codeText, true)
      return `<pre><code data-lang="${highlighted.language}">${highlighted.value}</code></pre>`
    }
    return match
  })
  return html
}

module.exports = {
  externalStyles,
  transform
}
