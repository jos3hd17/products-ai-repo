import { AfterViewInit, Component, ElementRef, ViewChild, input, output } from '@angular/core';
@Component({
  selector: 'app-confirm-delete',
  templateUrl: './confirm-delete.component.html',
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
