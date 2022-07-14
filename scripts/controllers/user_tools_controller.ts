import { Controller } from '@hotwired/stimulus'

class UserTools extends Controller {
  static targets = [ "popup", "spinner" ]

  initialized: Boolean
  popupTarget: HTMLElement
  spinnerTarget: HTMLElement

  initialize(): void {
    this.initialized = false;
  }

  handleMouseEnter = () => {

    if (this.initialized) return // perform this setup only once

    fetch(
      '/reading-history/docs.json?limit=4',
      {
        method: 'GET',
      }
    )
    .then(response => response.json())
    .then(data => {
      this.initialized = true;
      var recentlyViewed = data.recentlyViewed;
      var mostViewed = data.mostViewed;

      this.#addElements(recentlyViewed, {
        name: 'Recently Viewed',
        emptyText: "You've viewed no stories!"
      });

      this.#addElements(mostViewed, {
        name: 'Most Viewed'
      });

      this.spinnerTarget.classList.add('hide')
    })
  }

  #addElements = (data, elementAttributes) => {

    if (!data || data.length == 0) {
      if (elementAttributes.emptyText) {
        this.popupTarget.insertAdjacentHTML('beforeend', "<p>" + elementAttributes.emptyText + "</p>");
      }
      return;
    }

    var items = data.map(function(el) {
    var item = el.doc;
    var folder = (item.folder || {}).prettyName || ''; // lets not try to show a folder if there isn't one
    var path = item.path ? item.path : '#';
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
    });

    var className = elementAttributes.name.toLowerCase().replace(' ', '-') + '-content';

    var fullSection = [
      "<h3>" + elementAttributes.name + "</h3>",
      "<ul class='" + className + "'>" + items.join('') + "</ul>"
    ].join('');

     // perform all the DOM manipulation as a single operation
     this.popupTarget.insertAdjacentHTML('beforeend', fullSection);

  }

}

export default UserTools