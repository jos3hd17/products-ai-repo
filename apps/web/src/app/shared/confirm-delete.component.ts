import { AfterViewInit, Component, ElementRef, ViewChild, input, output } from '@angular/core';
@Component({
  selector: 'app-confirm-delete',
  template: `<dialog
    #dialog
    class="confirm-dialog"
    (cancel)="cancel($event)"
    aria-labelledby="delete-title"
  >
    <span class="delete-mark" aria-hidden="true">!</span>
    <h2 id="delete-title">¿Eliminar este producto?</h2>
    <p>“{{ name() }}” se eliminará del catálogo. Esta acción no se puede deshacer.</p>
    @if (error()) {
      <div class="notice error" role="alert">{{ error() }}</div>
    }
    <footer class="dialog-footer">
      <button
        autofocus
        class="button secondary"
        type="button"
        (click)="closed.emit()"
        [disabled]="busy()"
      >
        Conservar</button
      ><button class="button danger" type="button" (click)="confirmed.emit()" [disabled]="busy()">
        {{ busy() ? 'Eliminando…' : 'Sí, eliminar' }}
      </button>
    </footer>
  </dialog>`,
})
export class ConfirmDeleteComponent implements AfterViewInit {
  readonly name = input.required<string>();
  readonly busy = input(false);
  readonly error = input('');
  readonly confirmed = output<void>();
  readonly closed = output<void>();
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal?.();
  }
  cancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
}
