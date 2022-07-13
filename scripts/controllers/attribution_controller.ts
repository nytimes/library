import { Controller } from '@hotwired/stimulus'
import * as moment from "moment"

class Attribution extends Controller {

  static targets = [ "created", "modified"]

  createdTarget: HTMLElement
  modifiedTarget: HTMLElement

  connect() {
    // Format dates
    const dateElements = [this.createdTarget, this.modifiedTarget]
    dateElements.forEach(element => {
      const momentDate = moment(element.dataset.date)
      if (momentDate.isValid()) {
        element.textContent = moment().diff(momentDate, 'years') > 1 ? ` on ${momentDate.format('MMMM D, YYYY')}` : ` ${momentDate.fromNow()}`
        element.title = momentDate.format('MMMM D, YYYY')
      }
    });
  }

}

export default Attribution