document.addEventListener("DOMContentLoaded", function() {
  var html = document.querySelector('html');

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


