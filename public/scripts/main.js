$(document).ready(function() {
  var $window = $(window)
  var $document = $(document)
  var $html = $('html')

  $("pre").html(function (index, html) {
      return html.replace(/^(.*)$/mg, [
        '<div class="line">',
          '<div class="line-number"><!-- placeholder --></div>',
          '<span class="line-content">$1</span></span>',
        '</div>'
    ].join(''))
  });

  // make TOC sticky
  var $toc = $(".g-left-panel");
  if ($toc.length) {
    var stickyTop = $toc.offset().top - 100;
    $window.on('scroll', function(){
      ($window.scrollTop() >= stickyTop) ? $toc.addClass('d-fixed') : $toc.removeClass('d-fixed');
    });
  }
  

  $window.on('hashchange', correctHashScroll)
  correctHashScroll()

  function correctHashScroll() {
    var currentScroll = $document.scrollTop();
    var mastheadHeight = $('#masthead').outerHeight() + 15; // extra padding
    console.log(mastheadHeight)
    console.log(currentScroll)
    if (window.location.hash && currentScroll > mastheadHeight) {
      console.log('reducing scroll from ' + currentScroll)
      $document.scrollTop(currentScroll - mastheadHeight)
    }
  }

  function getReadingHistory(cb) {
    $.ajax({
      method: 'GET',
      url: '/reading-history.json'
    }).always(cb)
  }

  $html.one('mouseenter', '.user-tools', function() {
    getReadingHistory(generateLists);
  })

  function generateLists(data) {
    var contentHolders = $('.user-tools > #me > div.popup > ul.content');
    var recentlyViewed = data.recentlyViewed;
    var mostViewed = data.mostViewed;

    addElements(recentlyViewed, contentHolders[0]);
    addElements(mostViewed, contentHolders[1]);
  }

  function addElements(data, target) {
    var $target = $(target);

    var items = data.map(function(el) {
      var item = el.doc
      var folder = item.folder ? item.folder.prettyName : '' // lets not try to show a folder if there isn't one
      return [
      '<li>',
        '<a href="' + item.path + '">',
          '<p class="docs-title">' + item.prettyName + '</p>',
          '<p class="docs-attr">',
            '<span class="docs-folder">' + folder + '</span>',
            '<span class="timestamp">' + el.lastViewed + '</span>',
          '</p>',
         '</a>',
      '</li>'
      // use .join() to turn to html string
      ].join('')
    });
      
    $target.html(items.join('')) // perform all the DOM manipulation as a single operation
  }

})
