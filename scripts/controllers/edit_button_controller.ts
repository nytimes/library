import { Controller } from '@hotwired/stimulus'

class EditButtonController extends Controller {

  handleClick() {
    fetch(
      window.location.pathname + '?edit=1',
      {
        method: 'GET',
      }
    )
  }

}

export default EditButtonController