import { Controller } from '@hotwired/stimulus'

class SearchController extends Controller {

  static targets = [ "form", "list", "searchInput" ]

  keypress : boolean
  formTarget: HTMLFormElement
  searchInputTarget: HTMLInputElement
  listTarget: HTMLElement


  connect() {
    this.keypress = false
  }

  // Re/generate suggested results
  handleKeyUp(event) {
    if(event.key) {
      this.keypress = true
    }
    this.#filenameMatcher(this.searchInputTarget.value, (list) => {
      const dataListOptions = list.map((item) => {
        return `<option>${item}</option>`
      }).join('')
      this.listTarget.innerHTML = dataListOptions
    })
  }

  // when the typeahead selects a result, immediately submit the form
  // and tell the backend it was an autocomplete so we can go there directly.
  handleInput(event) {
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

  #getFilenameStorage = ()=>  {
    return JSON.parse(localStorage.getItem('filenames'))
  }

}

export default SearchController