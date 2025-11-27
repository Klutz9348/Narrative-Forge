
export class SelectionManager {
  constructor(
      private getSelection: () => string[],
      private setSelection: (ids: string[]) => void
  ) {}

  select(id: string, multi: boolean = false) {
    const current = this.getSelection();
    if (multi) {
      if (current.includes(id)) {
        this.setSelection(current.filter(i => i !== id));
      } else {
        this.setSelection([...current, id]);
      }
    } else {
      this.setSelection([id]);
    }
  }

  clear() {
    this.setSelection([]);
  }

  isSelected(id: string): boolean {
      return this.getSelection().includes(id);
  }

  toggle(id: string) {
      const current = this.getSelection();
      if (current.includes(id)) {
          this.setSelection(current.filter(i => i !== id));
      } else {
          this.setSelection([...current, id]);
      }
  }
}
