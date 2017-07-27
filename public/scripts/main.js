$(document).ready(function() {
  var $window = $(window)
  var $document = $(document)

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
  var stickyTop = $toc.offset().top - 100;
  $window.on('scroll', function(){
    ($window.scrollTop() >= stickyTop) ? $toc.addClass('d-fixed') : $toc.removeClass('d-fixed');
  });

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

})
