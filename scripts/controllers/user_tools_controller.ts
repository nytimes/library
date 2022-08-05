import { Controller } from '@hotwired/stimulus'

class UserTools extends Controller {
  static targets = [ "fullname", "popup", "spinner", "userbutton", "usertools" ]

  initialized: Boolean
  fullnameTarget: HTMLElement
  popupTarget: HTMLElement
  usertoolsTarget: HTMLElement
  spinnerTarget: HTMLElement
  userbuttonTarget: HTMLElement

  initialize(): void {
    this.initialized = false;
  }

  connect() {
    // get the userinfo then fire a pageview (can't cache in the page)
    fetch(
      '/whoami.json',
      {
        method: 'GET',
      }
    )
    .then(response => response.json())
    .then(data => {
      var userId = (data || {}).analyticsUserId;
      if (userId) {
        window['ga']('set', 'userId', userId)
      }
      window['ga']('send', 'pageview');
      this.#renderUserInfo(data);
    });
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

  #addElements = (data: Array<any>, elementAttributes: ElementAttributes) => {

    if (!data || data.length == 0) {
      if (elementAttributes.emptyText) {
        this.popupTarget.insertAdjacentHTML('beforeend', `<p>${elementAttributes.emptyText}</p>`);
      }
      return;
    }

    var items = data.map(function(viewedDocument: ViewedDocument) {
      var doc = viewedDocument.doc;
      var folder = (doc.folder || {}).prettyName || ''; // lets not try to show a folder if there isn't one
      var path = doc.path ? doc.path : '#';
      return `
        <li>
          <a href="${path}">
            <p class="docs-title">${doc.prettyName}</p>
            <p class="docs-attr">
              <span class="docs-folder">${folder}</span>
              <span class="timestamp">${viewedDocument.lastViewed}</span>
            </p>
          </a>
        </li>
      `
    });

    var className = elementAttributes.name.toLowerCase().replace(' ', '-') + '-content';

    var fullSection = `
      <h3>${elementAttributes.name}</h3>
      <ul class='${className}'>${items.join('')}</ul>
    `;

     // perform all the DOM manipulation as a single operation
     this.popupTarget.insertAdjacentHTML('beforeend', fullSection);

  }

  #renderUserInfo(data: WhoAmI) {
    var username = data.email || this.usertoolsTarget.dataset.defaultEmail;
    document.querySelector('.user-fullname').innerHTML = username;

    var initials = username.split('@')[0].split('.').map(function(name: string) {
      return name[0].toUpperCase();
    });

    document.querySelector('.btn-user-initial').innerHTML = initials.join('');
  }

}

interface ElementAttributes {
  name: string
  emptyText?: string
}
interface ViewedDocument {
  doc: Document
  lastViewed: string
}
interface Document {
  folder: Folder
  prettyName: string
  path: string
}
interface Folder {
  prettyName: string
}
interface WhoAmI {
  analyticsUserId: string,
  email: string,
  userId: string,
}

export default UserTools