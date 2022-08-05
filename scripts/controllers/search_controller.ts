import { Controller } from '@hotwired/stimulus'

class SearchController extends Controller {

  static targets = [ "form", "list", "searchInput" ]

  keypress : boolean
  formTarget: HTMLFormElement
  searchInputTarget: HTMLInputElement
  listTarget: HTMLElement

  connect() {
    this.keypress = false

    // request latest filenames, req will 304 and serve cache if unchanged
    var lastFilenameFetch = this.#getFilenameStorage()
    var now = new Date().getTime()
    if (!lastFilenameFetch || now - lastFilenameFetch.lastFetched > 600000) { // 10 min
      fetch(
        '/filename-listing.json',
        {
          method: 'GET',
        }
      )
      .then((response) => {
          if (response.status !== 200) return; // if request fails, continue with old listing
          return response.json()
        }
      )
      .then(response => {
        var lastFetched = new Date().getTime()
        var uniqueNames = new Set(response.filenames)
        var data = {lastFetched: lastFetched, filenames: Array.from(uniqueNames)}
        localStorage.setItem('filenames', JSON.stringify(data))
      });
    }
  }

  // Re/generate suggested results
  handleKeyUp(event: KeyboardEvent) {

    if(event.key) {
      this.keypress = true
    }
    this.#filenameMatcher(this.searchInputTarget.value, (list: Array<string>) => {
      const dataListOptions = list.map((item: string) => {
        return `<option>${item}</option>`
      }).join('')
      this.listTarget.innerHTML = dataListOptions
    })
  }

  // when the typeahead selects a result, immediately submit the form
  // and tell the backend it was an autocomplete so we can go there directly.
  handleInput() {
    if (this.keypress === false) {
      this.formTarget.insertAdjacentHTML('beforeend', '<input type="hidden" name="autocomplete" value="1"/>');
      this.formTarget.submit()
    }
    this.keypress = false
  }

  #filenameMatcher(query: string, callback: Function) {
    const substrRegex = new RegExp(query, 'i')
    const filenames = this.#getFilenameStorage().filenames
    callback(filenames.filter((item: string) => {
      return substrRegex.test(item)
    }))
  }

  #getFilenameStorage = () =>  {
    return JSON.parse(localStorage.getItem('filenames'))
  }

}

export default SearchController