
import { Controller } from '@hotwired/stimulus'

class SearchFilterController extends Controller {
  backdropTarget: HTMLElement;
  filteredByLabelTarget: HTMLElement;
  typesTarget: HTMLInputElement;
  modalTarget: HTMLElement;
  modalBodyTarget: HTMLElement;
  checkboxTargets: HTMLInputElement[];
  typesDescTarget: HTMLElement;
  selectedTypes: String[] = [];

  documentTypes = ['docs', 'pdf', 'slides'];

  static targets = ['backdrop', 'filteredByLabel', 'types', 'modal', 'modalBody', 'checkbox', 'typesDesc'];

  connect(): void {
    this.updateHiddenField();
  }

  summonModal(): void {
    this.modalTarget.classList.add('active');
    setTimeout(() => {
      this.backdropTarget.classList.add('active');
      this.modalBodyTarget.classList.add('active');
    }, 10);
  }

  dismissModal(): void {
    this.modalBodyTarget.classList.remove('active');
    this.backdropTarget.classList.remove('active');
    setTimeout(() => {
      this.modalTarget.classList.remove('active');
    }, 200);
  }

  onConfirm(): void {
    this.selectedTypes = this.checkboxTargets.filter(x => x.checked).map(x => x.value);
    this.updateHiddenField();
    this.filteredByLabelTarget.innerHTML = this.selectedTypes.length ? 'Filtered by: ' : '';
    this.typesDescTarget.innerHTML = this.selectedTypes.join(', ');
    this.dismissModal();
  }

  updateHiddenField(): void {
    this.typesTarget.value = this.selectedTypes.join(',');
  }

  selectAll(): void {
    this.checkboxTargets.forEach(target => target.checked = true);
    this.selectedTypes = this.checkboxTargets.map(x => x.value);
  }

  selectDocuments(): void {
    this.selectedTypes = this.documentTypes;
    this.checkboxTargets.forEach(target => target.checked = this.documentTypes.indexOf(target.value) !== -1);
  }

  selectNone(): void {
    this.selectedTypes = [];
    this.checkboxTargets.forEach(target => target.checked = false);
  }
}

export default SearchFilterController;