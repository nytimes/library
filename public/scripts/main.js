$(document).ready(() => {
  const $window = $(window)
  const $document = $(document)
  const $html = $('html')

  $('pre').html((index, html) => {
    return html.split(/\r?\n/).map((line) => {
      return [
        '<div class="line">',
        '<div class="line-number"><!-- placeholder --></div>',
        '<span class="line-content">' + line + '</span></span>',
        '</div>'
      ].join('')
    }).join('')
  })

  // make TOC sticky
  const $toc = $('.g-left-panel')
  if ($toc.length) {
    const stickyTop = $toc.offset().top - 100
    $window.on('scroll', () => {
      ($window.scrollTop() >= stickyTop) ? $toc.addClass('d-fixed') : $toc.removeClass('d-fixed')
    })
  }

  $window.on('hashchange', correctHashScroll)
  correctHashScroll()

  function correctHashScroll() {
    const currentScroll = $document.scrollTop()
    const mastheadHeight = $('#masthead').outerHeight() + 15 // extra padding
    if (window.location.hash && currentScroll > mastheadHeight) {
      console.log('reducing scroll from ' + currentScroll)
      $document.scrollTop(currentScroll - mastheadHeight)
    }
  }

  function populateUserHistoryData() {
    $.ajax({
      method: 'GET',
      url: '/reading-history/docs.json',
      data: {
        limit: 4
      },
      json: true
    }).always((data) => {
      const recentlyViewed = data.recentlyViewed
      const mostViewed = data.mostViewed

      addElements(recentlyViewed, {
        name: 'Recently Viewed',
        emptyText: "You've viewed no stories!"
      })

      addElements(mostViewed, {
        name: 'Most Viewed'
      })

      $('#me .popup .fa-spinner').remove()
    })
  }

  $html.one('mouseenter', '.user-tools', populateUserHistoryData)

  function addElements(data, elementAttributes) {
    const $target = $('#me .popup')

    if (!data || data.length == 0) {
      if (elementAttributes.emptyText) {
        $target.append('<p>' + elementAttributes.emptyText + '</p>')
      }
      return
    }

    const items = data.map((el) => {
      const item = el.doc
      const folder = (item.folder || {}).prettyName || '' // lets not try to show a folder if there isn't one
      const path = item.path ? item.path : '#'
      return [
        '<li>',
        '<a href="' + path + '">',
        '<p class="docs-title">' + item.prettyName + '</p>',
        '<p class="docs-attr">',
        '<span class="docs-folder">' + folder + '</span>',
        '<span class="timestamp">(' + el.lastViewed + ')</span>',
        '</p>',
        '</a>',
        '</li>'
      // use .join() to turn to html string
      ].join('')
    })

    const className = elementAttributes.name.toLowerCase().replace(' ', '-') + '-content'

    const fullSection = [
      '<h3>' + elementAttributes.name + '</h3>',
      "<ul class='" + className + "'>" + items.join('') + '</ul>'
    ].join('')

     // perform all the DOM manipulation as a single operation
    $target.append(fullSection)
  }

  function filenameMatcher(q, cb) {
    // an array that will be populated with substring matches

    // regex used to determine if a string contains the substring `q`
    const substrRegex = new RegExp(q, 'i')
    const filenames = getFilenameStorage().filenames
    cb(filenames.filter((str) => substrRegex.test(str)))
  }

  // setup typeahead
  $('#search-box').typeahead({
    hilight: true
  }, {
    name: 'documents',
    source: filenameMatcher
  })
})

function personalizeHomepage(userId) {
  // Personalize the team listing on the left.
  // Most-frequently-visited teams are inserted at the top, then padded with default entries.
  fetchHistory('teams', userId, (data) => {
    const expectedLength = $('.teams-cat-list li').length
    const items = data.mostViewed.map((el) => {
      // kill existing elements that on the mostViewed list to avoid dupes
      $('ul.teams-cat-list li[data-team-id="' + el.team.id + '"]').detach()

      return '<li><a class="button btn-cat" href="' + el.team.path + '">' + el.team.prettyName + '</a></li>'
    }).join('')

    $('ul.teams-cat-list').prepend(items)
    $('ul.teams-cat-list li:gt(' + (expectedLength - 1) + ')').detach()
  })

  /*
    This code swaps "Favorite Docs" into the "Useful Docs" panel if you have at least three favorites.
    We decided that we'll disable for v1 but perhaps incorporate after initial launch.

    fetchHistory('docs', userId, function(data) {
      var favorites = data.mostViewed.filter(function(el) {
        return el.viewCount > 5
      })

      if(favorites.length < 3) { return }

      var items = favorites.map(function (el) {
         return '<li><a href="' + el.doc.path + '">' + el.doc.prettyName + '</a></li>'
      })

      $('.featured-cat-container h3').html('Favorite Docs')
      $('ul.featured-cat-list').html(items)
    })
  */
}

function fetchHistory(type, userId, cb) {
  const key = 'libraryHistory:' + userId + ':' + type
  let data

  if (data = localStorage.getItem(key)) {
    data = JSON.parse(data)

    // refresh localStorage data in the background if it's older than an hour
    if (!data.ts || new Date(data.ts) < (new Date() - 60 * 60 * 1000)) {
      refreshHistory(key, type)
    }

    return cb(data.history)
  } else {
    return refreshHistory(key, type, cb)
  }
}

function refreshHistory(localStorageKey, type, cb) {
  $.ajax('/reading-history/' + type + '.json?limit=5', {
    success: function (data) {
      localStorage.setItem(localStorageKey, JSON.stringify({ ts: new Date(), history: data }))
      if (cb) { return cb(data) }
    }
  })
}

// Adds a See More button for category containers with content
// that overflows a max height set in the css
function seeMoreButton() {
  $('.children-view').each((_, el) => {
    const $el = $(el)
    const $content = $el.find('.children')
    if ($el.height() >= $content.height()) return

    $el.parent().append('<button class="seeMore-button">See more</button>')
  })

  $('#category-page').on('click', '.seeMore-button', (el) => {
    const $button = $(el.currentTarget)
    const text = $button.hasClass('show') ? 'See more' : 'See less'

    $button.toggleClass('show')
    $button.parent().find('.children-view').toggleClass('hide')
    $button.html(text)
  })
}
