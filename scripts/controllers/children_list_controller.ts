import { Controller } from '@hotwired/stimulus'

class ChildrenListController extends Controller {
  static targets = [ "expandable", "toggle", "children" ]

  expandableTarget: HTMLElement
  toggleTarget: HTMLElement
  childrenTarget: HTMLElement
  expanded: Boolean

  initialize() {
    this.expanded = false
  }
  connect() {
    if (this.expandableTarget.clientHeight < this.childrenTarget.clientHeight) {
      this.toggleTarget.classList.add('display')
    }
  }

  toggle() {
    this.expanded = !this.expanded
    this.expandableTarget.classList.toggle('hide')
    this.toggleTarget.textContent = this.expanded ? 'See more' : 'See less'
  }

}
  
export default ChildrenListController