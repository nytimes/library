import { Controller } from '@hotwired/stimulus'
import { UsefulnessReason } from '../common/enum'
class UsefulnessController extends Controller {
    launchModal: String | null
    reasonTargets: any
    usefulYesTarget: any
    usefulNoTarget: any

    initialize() {
      this.launchModal = ''
    }
  
    static get targets() {
      return ['reason', 'usefulYes', 'usefulNo']
    }
  
    handleVote(event: any) {
      this.launchModal = event.params.launchModal

      this[`${this.launchModal}Target`].classList.add('active')
    }
  
    handleCancel() {
      this.closeModal()
    }
  
    handleSubmit() {
      const documentId = this.data.get('documentId')
      const location = this.launchModal === 'usefulYes' ? '/api/upvote' : '/api/downvote'

      const checkedRadios = this.reasonTargets.filter(radio => radio.checked)
      const reasonValue = checkedRadios.length > 0 ? checkedRadios[0].value : 0
      const reason = UsefulnessReason[reasonValue]

      this.post(location, {
        id: documentId,
        reason
      })
      this.closeModal()
    }
  
    closeModal() {
      this[`${this.launchModal}Target`].classList.remove('active')
      this.launchModal = ''
    }
  
    async post(location, payload) {
      const res = await fetch(location, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      console.log(json)
    }
  }
  
  export default UsefulnessController