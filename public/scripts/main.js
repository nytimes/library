document.addEventListener("DOMContentLoaded", function() {
  var html = document.querySelector('html');

  // We don't use this feature
  // $("pre code").html(function (index, html) {
  //   return html.split(/\r?\n/).map(function(line) {
  //     return [
  //       '<div class="line">',
  //         '<div class="line-number"><!-- placeholder --></div>',
  //         '<span class="line-content">'+line+'</span></span>',
  //       '</div>'
  //     ].join('');
  //   }).join('');
  // });

  window.addEventListener('hashchange', correctHashScroll);
  correctHashScroll()

  function correctHashScroll() {
    var currentScroll = html.scrollTop;
    var mastheadHeight = document.getElementById('masthead').offsetHeight + 15; // extra padding
    if (window.location.hash && currentScroll > mastheadHeight) {
      html.scrollTop = currentScroll - mastheadHeight;
    }
  }

})

// We don't use this feature, as the "team" option has been removed in custom/strings.yaml
// function personalizeHomepage(userId) {

//   // Personalize the team listing on the left.
//   // Most-frequently-visited teams are inserted at the top, then padded with default entries.
//   //fetchHistory('teams', userId, function(data) {
//   fetchHistory('docs', userId, function(data) {

//     var expectedLength = $('.teams-cat-list li').length
//     var items = data.mostViewed.map(function(el) {
//     var items = nickList.map(function(el) {
//       // kill existing elements that on the mostViewed list to avoid dupes
//       $('ul.teams-cat-list li[data-team-id="' + el.team.id + '"]').detach()

//       return '<li><a class="button btn-cat" href="' + el.team.path + '">' + el.team.prettyName + '</a></li>'
//     }).join('')

//     console.log('items', items)

//     $('ul.team-cat-list').prepend(items)
//     $('ul.team-cat-list li:gt(' + (expectedLength - 1) + ')').detach()
//   })

//   /*
//     This code swaps "Favorite Docs" into the "Useful Docs" panel if you have at least three favorites.
//     We decided that we'll disable for v1 but perhaps incorporate after initial launch.

//     fetchHistory('docs', userId, function(data) {
//       var favorites = data.mostViewed.filter(function(el) {
//         return el.viewCount > 5
//       })

//       if(favorites.length < 3) { return }

//       var items = favorites.map(function (el) {
//          return '<li><a href="' + el.doc.path + '">' + el.doc.prettyName + '</a></li>'
//       })

//       $('.featured-cat-container h3').html('Favorite Docs')
//       $('ul.featured-cat-list').html(items)
//     })
//   */
// }

// function fetchHistory(type, userId, cb) {
//   var key = "libraryHistory:" + userId + ':' + type
//   var data

//   if(data = localStorage.getItem(key)) {
//     data = JSON.parse(data)

//     // refresh localStorage data in the background if it's older than an hour
//     if(!data.ts || new Date(data.ts) < (new Date() - 60 * 60 * 1000)) {
//       refreshHistory(key, type)
//     }

//     return cb(data.history)
//   } else {
//     return refreshHistory(key, type, cb)
//   }
// }

// function refreshHistory(localStorageKey, type, cb) {
//   console.log('refreshHistory')
//   $.ajax('/reading-history/' + type + '.json?limit=5', {
//     success: function(data) {
//       localStorage.setItem(localStorageKey, JSON.stringify({ ts: new Date(), history: data }))
//       if(cb) { return cb(data) }
//     }
//   })
// }
