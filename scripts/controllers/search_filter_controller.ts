
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
  allDocsTarget: HTMLInputElement;
  allImagesTarget: HTMLInputElement;

  documentTypes = ['docs', 'pdf', 'slides'];

  imageTypes = ['drawings', 'jpg', 'png', 'svg'];

  miscTypes = ['sheets', 'shortcut', 'video'];

  static targets = ['backdrop', 'filteredByLabel', 'types',
    'modal', 'modalBody', 'checkbox', 'typesDesc',
    'allDocs', 'allImages'];

  connect(): void {
    this.loadSearchFromURL();
    this.updateHiddenField();
  }

  loadSearchFromURL(): void {
    const searchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(searchParams);

    if (!params || !params.types) return;

    this.selectedTypes = params.types.split(',');
    this.checkboxTargets.forEach(target => target.checked = this.selectedTypes.indexOf(target.value) !== -1);

    this.updateFilteredByLabel();

    this.checkAllDocsSelected();
    this.checkAllImagesSelected();
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
    this.updateFilteredByLabel();
    this.dismissModal();
  }

  updateHiddenField(): void {
    this.typesTarget.value = this.selectedTypes.join(',');
  }

  updateFilteredByLabel(): void {
    this.filteredByLabelTarget.innerHTML = this.selectedTypes.length ? 'Filtered by: ' : '';
    this.typesDescTarget.innerHTML = this.selectedTypes.join(', ');
  }

  selectAll(): void {
    this.checkboxTargets.forEach(target => target.checked = true);
    this.selectedTypes = this.checkboxTargets.map(x => x.value);
    this.allDocsTarget.checked = true;
    this.allImagesTarget.checked = true;
  }

  selectNone(): void {
    this.selectedTypes = [];
    this.checkboxTargets.forEach(target => target.checked = false);
    this.allDocsTarget.checked = false;
    this.allImagesTarget.checked = false;
  }

  checkAllDocsSelected(): void {
    this.allDocsTarget.checked = this.allDocsSelected();
  }

  checkAllImagesSelected(): void {
    this.allImagesTarget.checked = this.allImagesSelected();
  }

  allDocsSelected = this.buildSelectionCheck(this.documentTypes);

  allImagesSelected = this.buildSelectionCheck(this.imageTypes);

  private buildSelectionCheck(types: String[]): () => boolean {
    return () => this.checkboxTargets.filter(target => types.indexOf(target.value) !== -1)
      .every(target => target.checked)
  }

  toggleDocs = this.buildToggler(this.documentTypes);

  toggleImages = this.buildToggler(this.imageTypes);

  private buildToggler(types): (event: PointerEvent) => void {
    return (event: PointerEvent): void => {
      const checkbox = event.target as HTMLInputElement;
      const isChecked = checkbox.checked;

      this.checkboxTargets.filter(target => types.indexOf(target.value) !== -1)
        .forEach(target => target.checked = isChecked);
    }
  }
}

export default SearchFilterController;
