import { Pipe, PipeTransform } from '@angular/core';
import { formatBrlFromCents } from '../utils/currency';

@Pipe({ name: 'brlCents', standalone: true })
export class BrlCentsPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    if (cents == null || Number.isNaN(cents)) return '—';
    return formatBrlFromCents(cents);
  }
}
