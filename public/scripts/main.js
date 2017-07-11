$(document).ready(function() {
  $("pre").html(function (index, html) {
      return html.replace(/^(.*)$/mg, "<span class=\"line\">$1</span>")
  });

  // make TOC sticky
  var $toc = $(".g-left-panel");
  var stickyTop = $toc.offset().top - 100;
  $(window).on('scroll', function(){
    ($(window).scrollTop() >= stickyTop) ? $toc.addClass('d-fixed') : $toc.removeClass('d-fixed');
  });
})
